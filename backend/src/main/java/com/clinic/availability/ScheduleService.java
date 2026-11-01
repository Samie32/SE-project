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

  public ScheduleService(Db db, Access access, Audit audit, Clock clock) {
    this.db = db;
    this.access = access;
    this.audit = audit;
    this.clock = clock;
  }

  public void interval(Instant start, Instant end) {
    Problem.require(start.isBefore(end), 422, "start must precede end");
    Problem.require(
        start.equals(start.truncatedTo(java.time.temporal.ChronoUnit.MINUTES))
            && end.equals(end.truncatedTo(java.time.temporal.ChronoUnit.MINUTES)),
        422,
        "Minute precision required");
    var a = start.atZone(ZONE);
    var b = end.atZone(ZONE);
    Problem.require(
        a.toLocalDate().equals(b.toLocalDate())
            && a.getDayOfWeek() != DayOfWeek.SUNDAY
            && !a.toLocalTime().isBefore(LocalTime.of(8, 0))
            && !b.toLocalTime().isAfter(LocalTime.of(17, 0)),
        422,
        "Outside clinic hours");
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
        db.count(
                "SELECT COUNT(*) FROM availability WHERE doctor_id=? AND start_at<? AND end_at>?",
                doctor,
                end,
                start)
            == 0,
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
        db.count(
                "SELECT COUNT(*) FROM appointment WHERE doctor_id=? AND start_at<? AND end_at>? AND"
                    + " status IN ('CONFIRMED','CHECKED_IN','IN_PROGRESS')",
                doctor,
                end,
                start)
            == 0,
        409,
        "Time off conflicts with appointments");
    String id = Db.id();
    db.update("INSERT INTO time_off VALUES(?,?,?,?)", id, doctor, start, end);
    audit.record(actor.id(), "TIME_OFF_CREATED", id);
    return db.one("SELECT * FROM time_off WHERE id=?", id);
  }

  public List<Map<String, Object>> schedules(Access.Actor actor, String doctor, boolean off) {
    access.doctor(actor, doctor);
    return db.list(
        "SELECT * FROM "
            + (off ? "time_off" : "availability")
            + " WHERE doctor_id=? ORDER BY start_at LIMIT 500",
        doctor);
  }

  public List<Map<String, Object>> slots(
      String doctor, LocalDate date, String mode, String specialty) {
    Instant start = date.atStartOfDay(ZONE).toInstant(),
        end = date.plusDays(1).atStartOfDay(ZONE).toInstant();
    return db.list(
        """
        SELECT s.* FROM slot s JOIN doctor d ON d.id=s.doctor_id
        WHERE d.active=TRUE AND s.start_at>=? AND s.start_at<? AND s.start_at>?
        AND (? IS NULL OR s.doctor_id=?) AND (? IS NULL OR s.mode=?)
        AND (? IS NULL OR EXISTS(SELECT 1 FROM doctor_specialty ds WHERE ds.doctor_id=s.doctor_id AND ds.specialty_id=?))
        AND NOT EXISTS(SELECT 1 FROM time_off t WHERE t.doctor_id=s.doctor_id AND t.start_at<s.end_at AND t.end_at>s.start_at)
        AND NOT EXISTS(SELECT 1 FROM appointment a WHERE a.doctor_id=s.doctor_id AND a.status IN ('CONFIRMED','CHECKED_IN','IN_PROGRESS') AND a.start_at<s.end_at AND a.end_at>s.start_at)
        ORDER BY s.start_at,s.id LIMIT 500
        """,
        start,
        end,
        clock.instant(),
        doctor,
        doctor,
        mode,
        mode,
        specialty,
        specialty);
  }
}
