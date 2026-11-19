package com.clinic.clinical;

import com.clinic.appointment.AppointmentDelayPolicy;
import com.clinic.audit.Audit;
import com.clinic.auth.Access;
import com.clinic.common.*;
import com.clinic.notification.NotificationStore;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class WorkflowService {
  private final Db db;
  private final CareAccess care;
  private final Audit audit;
  private final Clock clock;
  private final NotificationStore notifications;

  public WorkflowService(
      Db db, CareAccess care, Audit audit, Clock clock, NotificationStore notifications) {
    this.db = db;
    this.care = care;
    this.audit = audit;
    this.clock = clock;
    this.notifications = notifications;
  }

  public Map<String, Object> checkIn(Access.Actor actor, String id) {
    actor.require("RECEPTIONIST");
    var a = care.lockAppointment(id);
    Problem.require("IN_PERSON".equals(a.get("mode")), 409, "In-person appointment required");
    var existing = db.list("SELECT * FROM queue_ticket WHERE appointment_id=? FOR SHARE", id);
    if (!existing.isEmpty()) return existing.getFirst();
    Problem.require("CONFIRMED".equals(a.get("status")), 409, "Appointment is not CONFIRMED");
    Instant start = Db.instant(a, "startAt"), now = clock.instant();
    Problem.require(
        !now.isBefore(start.minusSeconds(900)) && now.isBefore(start.plusSeconds(900)),
        409,
        "Outside check-in window");
    String date = start.atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate().toString();
    String ticket = Db.id();
    db.update(
        "INSERT INTO"
            + " queue_ticket(id,appointment_id,doctor_id,queue_date,position,status,created_at)"
            + " VALUES(?,?,?,?,?,'WAITING',?)",
        ticket,
        id,
        a.get("doctorId"),
        date,
        nextPosition(a.get("doctorId"), date),
        now);
    db.update("UPDATE appointment SET status='CHECKED_IN',version=version+1 WHERE id=?", id);
    audit.record(actor.id(), "APPOINTMENT_CHECKED_IN", id);
    return db.one("SELECT * FROM queue_ticket WHERE id=?", ticket);
  }

  private long nextPosition(Object doctor, Object date) {
    var last = db.list(
        "SELECT position FROM queue_ticket WHERE doctor_id=? AND queue_date=?"
            + " ORDER BY position DESC LIMIT 1 FOR SHARE",
        doctor, date);
    return last.isEmpty() ? 1 : ((Number) last.getFirst().get("position")).longValue() + 1;
  }

  private void queueAccess(Access.Actor actor, String doctor) {
    if (actor.has("RECEPTIONIST")) return;
    care.doctor(actor, Map.of("doctorId", doctor));
  }

  public List<Map<String, Object>> queue(Access.Actor actor, String doctor, LocalDate date) {
    queueAccess(actor, doctor);
    var rows =
        db.list(
            "SELECT q.*,a.patient_id FROM queue_ticket q JOIN appointment a ON"
                + " a.id=q.appointment_id WHERE q.doctor_id=? AND q.queue_date=? ORDER BY"
                + " q.position",
            doctor,
            date.toString());
    audit.record(actor.id(), "QUEUE_READ", doctor);
    return rows;
  }

  public Map<String, Object> next(Access.Actor actor, String doctor, LocalDate date) {
    queueAccess(actor, doctor);
    db.one("SELECT id FROM doctor WHERE id=? FOR UPDATE", doctor);
    Problem.require(
        db.list(
                "SELECT id FROM queue_ticket WHERE doctor_id=? AND queue_date=? AND status IN"
                    + " ('CALLED','IN_SERVICE') LIMIT 1 FOR SHARE",
                doctor,
                date.toString())
            .isEmpty(),
        409,
        "Finish or skip the current ticket first");
    var waiting =
        db.list(
            "SELECT * FROM queue_ticket WHERE doctor_id=? AND queue_date=? AND status='WAITING'"
                + " ORDER BY position LIMIT 1 FOR UPDATE",
            doctor,
            date.toString());
    // Persist an empty result so retrying the same command cannot call a later arrival.
    if (waiting.isEmpty()) return Map.of();
    var q = waiting.getFirst();
    db.update("UPDATE queue_ticket SET status='CALLED',version=version+1 WHERE id=?", q.get("id"));
    audit.record(actor.id(), "QUEUE_CALLED", q.get("id").toString());
    return db.one("SELECT * FROM queue_ticket WHERE id=?", q.get("id"));
  }

  public Map<String, Object> skip(Access.Actor actor, String id, String reason, int version) {
    Problem.require(
        reason != null && !reason.isBlank() && reason.length() <= 1000,
        422,
        "Skip reason required");
    var initial = db.one("SELECT * FROM queue_ticket WHERE id=?", id);
    queueAccess(actor, initial.get("doctorId").toString());
    db.one("SELECT id FROM doctor WHERE id=? FOR UPDATE", initial.get("doctorId"));
    var q = db.one("SELECT * FROM queue_ticket WHERE id=? FOR UPDATE", id);
    care.version(q, version);
    Problem.require("CALLED".equals(q.get("status")), 409, "Only CALLED tickets can be skipped");
    db.update(
        "UPDATE queue_ticket SET status='WAITING',position=?,skip_reason=?,version=version+1 WHERE"
            + " id=?",
        nextPosition(q.get("doctorId"), q.get("queueDate")),
        reason,
        id);
    audit.record(actor.id(), "QUEUE_SKIPPED", id);
    return db.one("SELECT * FROM queue_ticket WHERE id=?", id);
  }

  public Map<String, Object> delayNotice(
      Access.Actor actor, String id, int version, Instant estimatedStartAt) {
    actor.require("RECEPTIONIST");
    var appointment = care.lockAppointment(id);
    care.version(appointment, version);
    Instant start = Db.instant(appointment, "startAt"), now = clock.instant();
    Problem.require(
        AppointmentDelayPolicy.canNotify(appointment, now), 409, "Appointment cannot receive a delay notice");
    Problem.require(
        estimatedStartAt == null
            || (estimatedStartAt.isAfter(start)
                && estimatedStartAt.isAfter(now)
                && AppointmentDelayPolicy.sameClinicDay(start, estimatedStartAt)),
        422,
        "Invalid estimated appointment time");
    Problem.require(
        db.list(
                "SELECT id FROM notification_job WHERE appointment_id=? AND appointment_version=?"
                    + " AND event_type='DELAY_NOTICE' FOR SHARE",
                id,
                version)
            .isEmpty(),
        409,
        "Delay notice already queued");
    String job = notifications.enqueue(id, version, "DELAY_NOTICE", estimatedStartAt);
    audit.record(actor.id(), "APPOINTMENT_DELAY_NOTICE_QUEUED", id);
    return notifications.detail(job);
  }

  public Map<String, Object> progress(Access.Actor actor, String id, String target, int version) {
    return progress(actor, id, target, version, null, false);
  }

  public Map<String, Object> progress(
      Access.Actor actor,
      String id,
      String target,
      int version,
      NoShowReason noShowReason,
      boolean sendRebookingEmail) {
    var a = care.lockAppointment(id);
    boolean remote = "REMOTE".equals(a.get("mode"));
    boolean noShow = "NO_SHOW".equals(target);
    if (noShow && !remote) actor.require("RECEPTIONIST");
    else care.doctor(actor, a);
    care.version(a, version);
    Problem.require(
        noShow || (noShowReason == null && !sendRebookingEmail),
        422,
        "Follow-up fields require NO_SHOW");
    switch (target) {
      case "NO_SHOW" -> {
        Problem.require(
            "CONFIRMED".equals(a.get("status"))
                && !clock.instant().isBefore(Db.instant(a, "startAt").plusSeconds(900)),
            409,
            "No-show requires CONFIRMED and start +15 minutes");
        db.update(
            "UPDATE telehealth_session SET status='CANCELLED',version=version+1,ended_at=? WHERE"
                + " appointment_id=? AND status IN ('CREATED','WAITING')",
            clock.instant(),
            id);
        db.update(
            "DELETE t FROM telehealth_token t JOIN telehealth_session s ON s.id=t.session_id WHERE"
                + " s.appointment_id=?",
            id);
      }
      case "IN_PROGRESS" -> {
        Problem.require(!remote, 409, "Start remote appointments through the session endpoint");
        Problem.require("CHECKED_IN".equals(a.get("status")), 409, "Check-in required");
        Problem.require(
            db.update(
                    "UPDATE queue_ticket SET status='IN_SERVICE',version=version+1 WHERE"
                        + " appointment_id=? AND status='CALLED'",
                    id)
                == 1,
            409,
            "A CALLED ticket is required");
        db.update(
            "INSERT INTO encounter(id,appointment_id,started_at) VALUES(?,?,?)",
            Db.id(),
            id,
            clock.instant());
      }
      case "COMPLETED" -> {
        Problem.require(
            "IN_PROGRESS".equals(a.get("status")), 409, "Appointment must be in progress");
        var e = db.one("SELECT * FROM encounter WHERE appointment_id=? FOR UPDATE", id);
        Problem.require(
            db.count(
                    "SELECT COUNT(*) FROM medical_record WHERE encounter_id=? AND status='FINAL'",
                    e.get("id"))
                > 0,
            409,
            "Finalize the medical record first");
        if (remote)
          Problem.require(
              db.count(
                      "SELECT COUNT(*) FROM telehealth_session WHERE appointment_id=? AND"
                          + " status='ENDED'",
                      id)
                  == 1,
              409,
              "End the remote session first");
        db.update(
            "UPDATE encounter SET status='COMPLETED',completed_at=? WHERE id=?",
            clock.instant(),
            e.get("id"));
        db.update(
            "UPDATE queue_ticket SET status='DONE',version=version+1 WHERE appointment_id=?", id);
      }
      default -> throw new Problem(422, "Invalid target status");
    }
    db.update(
        "UPDATE appointment SET status=?,version=version+1,no_show_reason=? WHERE id=?",
        target,
        noShowReason == null ? null : noShowReason.name(),
        id);
    if (sendRebookingEmail) notifications.enqueue(id, version + 1, "NO_SHOW_REBOOKING", null);
    audit.record(actor.id(), "APPOINTMENT_" + target, id);
    return detail(actor, id);
  }

  public Map<String, Object> detail(Access.Actor actor, String id) {
    var a = db.one("SELECT * FROM appointment WHERE id=?", id);
    if (!actor.has("RECEPTIONIST") && !actor.has("ADMINISTRATOR")) {
      care.participant(actor, a);
      if (!care.isDoctor(actor, a)) a.remove("noShowReason");
    }
    var e = db.list("SELECT id FROM encounter WHERE appointment_id=?", id);
    a.put("encounterId", e.isEmpty() ? null : e.getFirst().get("id"));
    audit.record(actor.id(), "APPOINTMENT_READ", id);
    return a;
  }
}
