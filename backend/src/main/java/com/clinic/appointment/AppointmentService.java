package com.clinic.appointment;

import com.clinic.audit.Audit;
import com.clinic.auth.Access;
import com.clinic.availability.ScheduleService;
import com.clinic.common.*;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
public class AppointmentService {
  private final Db db;
  private final Access access;
  private final Audit audit;
  private final ScheduleService schedules;
  private final Idempotency idem;
  private final Clock clock;

  public AppointmentService(
      Db db, Access access, Audit audit, ScheduleService schedules, Idempotency idem, Clock clock) {
    this.db = db;
    this.access = access;
    this.audit = audit;
    this.schedules = schedules;
    this.idem = idem;
    this.clock = clock;
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public Map<String, Object> book(Access.Actor actor, String slotId, String key) {
    String patient = access.patient(actor), op = "BOOK";
    var previous = idem.begin(actor.id(), op, key, Map.of("slotId", slotId));
    if (previous != null) return previous;
    var slot = db.one("SELECT * FROM slot WHERE id=?", slotId);
    lock(List.of(slot.get("doctorId").toString()), patient);
    validateSlot(slot, patient, "");
    String id = Db.id();
    db.update(
        "INSERT INTO appointment(id,patient_id,doctor_id,slot_id,start_at,end_at,mode,status)"
            + " VALUES(?,?,?,?,?,?,?,'CONFIRMED')",
        id,
        patient,
        slot.get("doctorId"),
        slotId,
        Db.instant(slot, "startAt"),
        Db.instant(slot, "endAt"),
        slot.get("mode"));
    return finish(actor, id, "BOOKED", op, key);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public Map<String, Object> reschedule(
      Access.Actor actor, String id, String slotId, int version, String key) {
    String patient = access.patient(actor), op = "RESCHEDULE:" + id;
    var prior = idem.begin(actor.id(), op, key, Map.of("slotId", slotId, "version", version));
    if (prior != null) return prior;
    var original = owned(id, patient);
    var slot = db.one("SELECT * FROM slot WHERE id=?", slotId);
    lock(List.of(original.get("doctorId").toString(), slot.get("doctorId").toString()), patient);
    var appointment = owned(id, patient);
    editable(appointment, version);
    validateSlot(slot, patient, id);
    db.update(
        "UPDATE appointment SET doctor_id=?,slot_id=?,start_at=?,end_at=?,mode=?,version=version+1"
            + " WHERE id=?",
        slot.get("doctorId"),
        slotId,
        Db.instant(slot, "startAt"),
        Db.instant(slot, "endAt"),
        slot.get("mode"),
        id);
    return finish(actor, id, "RESCHEDULED", op, key);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public Map<String, Object> cancel(
      Access.Actor actor, String id, String reason, int version, String key) {
    String patient = access.patient(actor), op = "CANCEL:" + id;
    Problem.require(
        reason != null && !reason.isBlank() && reason.length() <= 1000,
        422,
        "Cancellation reason required");
    var prior = idem.begin(actor.id(), op, key, Map.of("reason", reason, "version", version));
    if (prior != null) return prior;
    var original = owned(id, patient);
    lock(List.of(original.get("doctorId").toString()), patient);
    editable(owned(id, patient), version);
    db.update(
        "UPDATE appointment SET status='CANCELLED',cancellation_reason=?,version=version+1 WHERE"
            + " id=?",
        reason,
        id);
    return finish(actor, id, "CANCELLED", op, key);
  }

  private void lock(List<String> doctors, String patient) {
    for (String id : new TreeSet<>(doctors)) schedules.lockDoctor(id);
    db.one("SELECT id FROM patient WHERE id=? FOR UPDATE", patient);
  }

  private Map<String, Object> owned(String id, String patient) {
    return db.one("SELECT * FROM appointment WHERE id=? AND patient_id=?", id, patient);
  }

  private void editable(Map<String, Object> a, int version) {
    Problem.require("CONFIRMED".equals(a.get("status")), 409, "Appointment is not CONFIRMED");
    Problem.require(
        ((Number) a.get("version")).intValue() == version, 409, "Stale appointment version");
    Problem.require(
        !clock.instant().isAfter(Db.instant(a, "startAt").minus(Duration.ofHours(2))),
        409,
        "Changes require at least two hours notice");
  }

  private void validateSlot(Map<String, Object> s, String patient, String excluded) {
    Instant start = Db.instant(s, "startAt"), end = Db.instant(s, "endAt");
    String doctor = s.get("doctorId").toString();
    Problem.require(start.isAfter(clock.instant()), 409, "Slot is no longer in the future");
    Problem.require(
        db.count(
                "SELECT COUNT(*) FROM availability WHERE id=? AND doctor_id=? AND start_at<=? AND"
                    + " end_at>=? AND mode=?",
                s.get("availabilityId"),
                doctor,
                start,
                end,
                s.get("mode"))
            == 1,
        409,
        "Slot is outside availability");
    Problem.require(
        db.count(
                "SELECT COUNT(*) FROM time_off WHERE doctor_id=? AND start_at<? AND end_at>?",
                doctor,
                end,
                start)
            == 0,
        409,
        "Doctor is unavailable");
    Problem.require(
        db.count(
                """
                SELECT COUNT(*) FROM appointment WHERE id<>? AND status IN ('CONFIRMED','CHECKED_IN','IN_PROGRESS')
                AND (doctor_id=? OR patient_id=?) AND start_at<? AND end_at>?
                """,
                excluded,
                doctor,
                patient,
                end,
                start)
            == 0,
        409,
        "Doctor or patient already booked");
  }

  private Map<String, Object> finish(
      Access.Actor actor, String id, String event, String operation, String key) {
    var result = db.one("SELECT * FROM appointment WHERE id=?", id);
    audit.record(actor.id(), "APPOINTMENT_" + event, id);
    // This durable job is the transactional outbox for week-4 confirmation emails.
    db.update(
        "INSERT INTO notification_job(id,appointment_id,appointment_version,event_type,due_at)"
            + " VALUES(?,?,?,?,?)",
        Db.id(),
        id,
        result.get("version"),
        event,
        clock.instant());
    idem.complete(actor.id(), operation, key, result);
    return result;
  }

  @Transactional
  public List<Map<String, Object>> list(Access.Actor actor, int limit, int offset) {
    Problem.require(limit >= 1 && limit <= 100 && offset >= 0, 400, "Invalid pagination");
    List<Map<String, Object>> rows;
    if (actor.has("ADMINISTRATOR") || actor.has("RECEPTIONIST"))
      rows =
          db.list("SELECT * FROM appointment ORDER BY start_at,id LIMIT ? OFFSET ?", limit, offset);
    else if (actor.has("DOCTOR"))
      rows =
          db.list(
              "SELECT a.* FROM appointment a JOIN doctor d ON d.id=a.doctor_id WHERE d.user_id=?"
                  + " ORDER BY a.start_at,a.id LIMIT ? OFFSET ?",
              actor.id(),
              limit,
              offset);
    else {
      String patient = access.patient(actor);
      rows =
          db.list(
              "SELECT * FROM appointment WHERE patient_id=? ORDER BY start_at,id LIMIT ? OFFSET ?",
              patient,
              limit,
              offset);
    }
    audit.record(actor.id(), "APPOINTMENT_LIST_READ", actor.id());
    return rows;
  }
}
