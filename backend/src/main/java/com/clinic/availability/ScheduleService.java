package com.clinic.availability;

import com.clinic.audit.Audit;
import com.clinic.auth.Access;
import com.clinic.common.*;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScheduleService {
  public static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
  private final Db db;
  private final Access access;
  private final Audit audit;
  private final Clock clock;
  private final ClinicHours hours;

  public ScheduleService(Db db, Access access, Audit audit, Clock clock, ClinicHours hours) {
    this.db = db;
    this.access = access;
    this.audit = audit;
    this.clock = clock;
    this.hours = hours;
  }

  public void interval(Instant start, Instant end) {
    Problem.require(start.isBefore(end), 422, "start must precede end");
    Problem.require(
        start.equals(start.truncatedTo(java.time.temporal.ChronoUnit.MINUTES))
            && end.equals(end.truncatedTo(java.time.temporal.ChronoUnit.MINUTES)),
        422,
        "Minute precision required");
    hours.requireOpen(start, end);
  }

  @Transactional
  public Map<String, Object> availability(
      Access.Actor actor, String doctor, Instant start, Instant end, int minutes, String mode) {
    access.doctor(actor, doctor);
    interval(start, end);
    Problem.require(start.isAfter(clock.instant()), 422, "Availability must be in the future");
    Problem.require(
        minutes > 0 && Duration.between(start, end).toMinutes() % minutes == 0,
        422,
        "Slot duration must divide availability");
    lockDoctor(doctor);
    Problem.require(
        db.list(
                "SELECT id FROM availability WHERE doctor_id=? AND start_at<? AND end_at>?"
                    + " LIMIT 1 FOR SHARE",
                doctor,
                end,
                start)
            .isEmpty(),
        409,
        "Overlapping availability");
    String id = Db.id();
    db.update(
        "INSERT INTO availability VALUES(?,?,?,?,?,?)", id, doctor, start, end, minutes, mode);
    for (Instant t = start; t.isBefore(end); t = t.plusSeconds(minutes * 60L))
      db.update(
          "INSERT INTO slot VALUES(?,?,?,?,?,?)",
          Db.id(),
          id,
          doctor,
          t,
          t.plusSeconds(minutes * 60L),
          mode);
    audit.record(actor.id(), "AVAILABILITY_CREATED", id);
    return db.one("SELECT * FROM availability WHERE id=?", id);
  }

  public void lockDoctor(String doctor) {
    var row = db.one("SELECT id,active FROM doctor WHERE id=? FOR UPDATE", doctor);
    Problem.require(
        Boolean.TRUE.equals(row.get("active")) || "1".equals(row.get("active").toString()),
        409,
        "Doctor inactive");
  }

  @Transactional
  public Map<String, Object> timeOff(
      Access.Actor actor, String doctor, Instant start, Instant end) {
    access.doctor(actor, doctor);
    interval(start, end);
    lockDoctor(doctor);
    Problem.require(start.isAfter(clock.instant()), 422, "Time off must be in the future");
    Problem.require(
        db.list(
                "SELECT id FROM time_off WHERE doctor_id=? AND start_at<? AND end_at>?"
                    + " LIMIT 1 FOR SHARE",
                doctor,
                end,
                start)
            .isEmpty(),
        409,
        "Overlapping time off");
    Problem.require(
        db.list(
                "SELECT id FROM appointment WHERE doctor_id=? AND start_at<? AND end_at>? AND"
                    + " status IN ('CONFIRMED','CHECKED_IN','IN_PROGRESS') LIMIT 1 FOR SHARE",
                doctor,
                end,
                start)
            .isEmpty(),
        409,
        "Time off conflicts with appointments");
    String id = Db.id();
    db.update("INSERT INTO time_off VALUES(?,?,?,?)", id, doctor, start, end);
    audit.record(actor.id(), "TIME_OFF_CREATED", id);
    return db.one("SELECT * FROM time_off WHERE id=?", id);
  }

  public List<Map<String, Object>> schedules(Access.Actor actor, String doctor, boolean off) {
    if (!actor.has("RECEPTIONIST")) access.doctor(actor, doctor);
    return db.list(
        "SELECT * FROM "
            + (off ? "time_off" : "availability")
            + " WHERE doctor_id=? ORDER BY start_at LIMIT 500",
        doctor);
  }

  @Transactional
  public void remove(Access.Actor actor, String id, boolean off) {
    String table = off ? "time_off" : "availability";
    var row = db.one("SELECT * FROM " + table + " WHERE id=?", id);
    access.doctor(actor, row.get("doctorId").toString());
    lockDoctor(row.get("doctorId").toString());
    row = db.one("SELECT * FROM " + table + " WHERE id=? FOR UPDATE", id);
    Problem.require(
        Db.instant(row, "startAt").isAfter(clock.instant()), 409, "Past schedules are retained");
    if (!off) {
      Problem.require(
          db.count(
                  "SELECT COUNT(*) FROM appointment a JOIN slot s ON s.id=a.slot_id WHERE"
                      + " s.availability_id=?",
                  id)
              == 0,
          409,
          "Availability with appointment history cannot be deleted");
      db.update("DELETE FROM slot WHERE availability_id=?", id);
      db.update(
          "DELETE FROM time_off WHERE doctor_id=? AND start_at>=? AND end_at<=?",
          row.get("doctorId").toString(),
          Db.instant(row, "startAt"),
          Db.instant(row, "endAt"));
    }
    db.update("DELETE FROM " + table + " WHERE id=?", id);
    audit.record(actor.id(), off ? "TIME_OFF_REMOVED" : "AVAILABILITY_REMOVED", id);
  }

  public List<Map<String, Object>> slots(
      String doctor, LocalDate date, String mode, String specialty) {
    Instant start = date.atStartOfDay(ZONE).toInstant();
    Instant end = date.plusDays(1).atStartOfDay(ZONE).toInstant();
    Instant now = clock.instant();
    if (!end.isAfter(now)) return List.of();

    StringBuilder sql = new StringBuilder(
        "SELECT s.id,s.availability_id,s.doctor_id,s.start_at,s.end_at,s.mode"
            + " FROM slot s JOIN doctor d ON d.id=s.doctor_id"
            + " WHERE d.active=TRUE AND s.start_at>=? AND s.start_at<? AND s.start_at>?");
    List<Object> params = new ArrayList<>();
    params.add(start);
    params.add(end);
    params.add(now);
    if (doctor != null) {
      sql.append(" AND s.doctor_id=?");
      params.add(doctor);
    }
    if (mode != null) {
      sql.append(" AND s.mode=?");
      params.add(mode);
    }
    if (specialty != null) {
      sql.append(
          " AND EXISTS(SELECT 1 FROM doctor_specialty ds"
              + " WHERE ds.doctor_id=s.doctor_id AND ds.specialty_id=?)");
      params.add(specialty);
    }
    sql.append(" ORDER BY s.start_at,s.id");

    List<Map<String, Object>> candidates = db.list(sql.toString(), params.toArray());
    if (candidates.isEmpty()) return List.of();

    Instant minStart = Db.instant(candidates.getFirst(), "startAt");
    Instant maxEnd = minStart;
    for (var s : candidates) {
      Instant e = Db.instant(s, "endAt");
      if (e.isAfter(maxEnd)) maxEnd = e;
    }

    Map<String, List<Instant[]>> busyByDoctor = new HashMap<>();
    List<Map<String, Object>> timeOffs = doctor != null
        ? db.list(
            "SELECT doctor_id,start_at,end_at FROM time_off"
                + " WHERE doctor_id=? AND start_at<? AND end_at>?",
            doctor, maxEnd, minStart)
        : db.list(
            "SELECT doctor_id,start_at,end_at FROM time_off"
                + " WHERE start_at<? AND end_at>?",
            maxEnd, minStart);
    for (var t : timeOffs) {
      busyByDoctor
          .computeIfAbsent(t.get("doctorId").toString(), k -> new ArrayList<>())
          .add(new Instant[] {Db.instant(t, "startAt"), Db.instant(t, "endAt")});
    }

    List<Map<String, Object>> activeAppts = doctor != null
        ? db.list(
            "SELECT doctor_id,start_at,end_at FROM appointment WHERE doctor_id=?"
                + " AND status IN ('CONFIRMED','CHECKED_IN','IN_PROGRESS')"
                + " AND start_at<? AND end_at>?",
            doctor, maxEnd, minStart)
        : db.list(
            "SELECT doctor_id,start_at,end_at FROM appointment"
                + " WHERE status IN ('CONFIRMED','CHECKED_IN','IN_PROGRESS')"
                + " AND start_at<? AND end_at>?",
            maxEnd, minStart);
    for (var a : activeAppts) {
      busyByDoctor
          .computeIfAbsent(a.get("doctorId").toString(), k -> new ArrayList<>())
          .add(new Instant[] {Db.instant(a, "startAt"), Db.instant(a, "endAt")});
    }

    List<Map<String, Object>> free = new ArrayList<>(Math.min(candidates.size(), 500));
    for (var s : candidates) {
      List<Instant[]> busy = busyByDoctor.get(s.get("doctorId").toString());
      if (busy != null) {
        Instant sStart = Db.instant(s, "startAt");
        Instant sEnd = Db.instant(s, "endAt");
        boolean overlaps = false;
        for (Instant[] b : busy) {
          if (b[0].isBefore(sEnd) && b[1].isAfter(sStart)) {
            overlaps = true;
            break;
          }
        }
        if (overlaps) continue;
      }
      free.add(s);
      if (free.size() == 500) break;
    }
    return free;
  }
}
