package com.clinic.availability;

import com.clinic.audit.Audit;
import com.clinic.auth.Access;
import com.clinic.common.Db;
import com.clinic.common.Problem;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ClinicHours {
  private static final String HH_MM = "(?:[01][0-9]|2[0-3]):[0-5][0-9]";
  private final Db db;
  private final Audit audit;
  private final Clock clock;

  public ClinicHours(Db db, Audit audit, Clock clock) {
    this.db = db;
    this.audit = audit;
    this.clock = clock;
  }

  public record DayHours(
      @Min(1) @Max(7) int dayOfWeek,
      @Pattern(regexp = HH_MM) String opensAt,
      @Pattern(regexp = HH_MM) String closesAt) {
    boolean includes(ZonedDateTime start, ZonedDateTime end) {
      return opensAt != null
          && start.toLocalDate().equals(end.toLocalDate())
          && !start.toLocalTime().isBefore(LocalTime.parse(opensAt))
          && !end.toLocalTime().isAfter(LocalTime.parse(closesAt));
    }
  }

  public record WeeklyHours(@NotNull @Size(min = 7, max = 7) List<@NotNull @Valid DayHours> days) {}

  public record Holiday(
      String id,
      LocalDate startDate,
      LocalDate endDate,
      String name,
      boolean closed,
      String opensAt,
      String closesAt) {
    boolean covers(LocalDate date) {
      return !date.isBefore(startDate) && !date.isAfter(endDate);
    }

    boolean includes(ZonedDateTime start, ZonedDateTime end) {
      return !closed
          && opensAt != null
          && start.toLocalDate().equals(end.toLocalDate())
          && !start.toLocalTime().isBefore(LocalTime.parse(opensAt))
          && !end.toLocalTime().isAfter(LocalTime.parse(closesAt));
    }
  }

  public record HolidayInput(
      @NotNull LocalDate startDate,
      @NotNull LocalDate endDate,
      @NotBlank @Size(max = 255) String name,
      boolean closed,
      @Pattern(regexp = HH_MM) String opensAt,
      @Pattern(regexp = HH_MM) String closesAt) {}

  public WeeklyHours read() {
    return new WeeklyHours(db.list("SELECT * FROM clinic_hours ORDER BY day_of_week")
        .stream().map(ClinicHours::day).toList());
  }

  public List<Holiday> holidays() {
    return db.list("SELECT * FROM clinic_holiday ORDER BY start_date, end_date, id")
        .stream().map(ClinicHours::holiday).toList();
  }

  void requireOpen(Instant from, Instant to) {
    var start = from.atZone(ScheduleService.ZONE);
    var end = to.atZone(ScheduleService.ZONE);
    String date = start.toLocalDate().toString();
    var holidayRows = db.list(
        "SELECT * FROM clinic_holiday WHERE start_date<=? AND end_date>=? FOR UPDATE", date, date);
    if (!holidayRows.isEmpty()) {
      Problem.require(holiday(holidayRows.getFirst()).includes(start, end), 422, "Outside clinic hours");
      return;
    }
    var current = db.one("SELECT * FROM clinic_hours WHERE day_of_week=? FOR UPDATE",
        start.getDayOfWeek().getValue());
    Problem.require(day(current).includes(start, end), 422, "Outside clinic hours");
  }

  @Transactional
  public Holiday addHoliday(Access.Actor actor, HolidayInput input) {
    actor.require("ADMINISTRATOR");
    String name = input.name().strip();
    Problem.require(!name.isEmpty(), 422, "Invalid clinic holiday");
    Problem.require(!input.endDate().isBefore(input.startDate()), 422, "Invalid clinic holiday");
    String opensAt = input.closed() ? null : input.opensAt();
    String closesAt = input.closed() ? null : input.closesAt();
    boolean validHours = input.closed()
        || (opensAt != null && closesAt != null && opensAt.compareTo(closesAt) < 0);
    Problem.require(validHours, 422, "Invalid clinic hours");

    String fromDate = input.startDate().toString();
    String toDate = input.endDate().toString();
    db.list("SELECT day_of_week FROM clinic_hours ORDER BY day_of_week FOR UPDATE");
    var overlaps = db.list(
        "SELECT id FROM clinic_holiday WHERE start_date<=? AND end_date>=? FOR UPDATE", toDate, fromDate);
    Problem.require(overlaps.isEmpty(), 409, "Clinic holiday overlaps an existing holiday");

    var candidate = new Holiday(Db.id(), input.startDate(), input.endDate(), name, input.closed(), opensAt, closesAt);
    for (var shift : db.list("SELECT start_at,end_at FROM availability WHERE end_at>? FOR UPDATE", clock.instant())) {
      var start = Db.instant(shift, "startAt").atZone(ScheduleService.ZONE);
      var end = Db.instant(shift, "endAt").atZone(ScheduleService.ZONE);
      if (candidate.covers(start.toLocalDate())) {
        Problem.require(candidate.includes(start, end), 409, "Clinic holiday conflicts with an existing shift");
      }
    }

    db.update(
        "INSERT INTO clinic_holiday(id,start_date,end_date,name,closed,opens_at,closes_at) VALUES(?,?,?,?,?,?,?)",
        candidate.id(), fromDate, toDate, candidate.name(), candidate.closed(), candidate.opensAt(), candidate.closesAt());
    audit.record(actor.id(), "CLINIC_HOLIDAY_CREATED", candidate.id());
    return candidate;
  }

  @Transactional
  public void removeHoliday(Access.Actor actor, String id) {
    actor.require("ADMINISTRATOR");
    var row = db.one("SELECT * FROM clinic_holiday WHERE id=? FOR UPDATE", id);
    var existing = holiday(row);
    if (!existing.closed()) {
      var weekly = db.list("SELECT * FROM clinic_hours ORDER BY day_of_week FOR UPDATE")
          .stream().map(ClinicHours::day).toList();
      for (var shift : db.list("SELECT start_at,end_at FROM availability WHERE end_at>? FOR UPDATE", clock.instant())) {
        var start = Db.instant(shift, "startAt").atZone(ScheduleService.ZONE);
        var end = Db.instant(shift, "endAt").atZone(ScheduleService.ZONE);
        if (existing.covers(start.toLocalDate())) {
          Problem.require(weekly.get(start.getDayOfWeek().getValue() - 1).includes(start, end),
              409, "Clinic hours conflict with an existing shift");
        }
      }
    }
    db.update("DELETE FROM clinic_holiday WHERE id=?", id);
    audit.record(actor.id(), "CLINIC_HOLIDAY_REMOVED", id);
  }

  @Transactional
  public WeeklyHours update(Access.Actor actor, WeeklyHours input) {
    actor.require("ADMINISTRATOR");
    var sorted = input.days().stream().sorted(Comparator.comparingInt(DayHours::dayOfWeek)).toList();
    for (int index = 0; index < 7; index++) {
      DayHours hours = sorted.get(index);
      Problem.require(hours.dayOfWeek() == index + 1, 422, "Clinic hours require seven distinct days");
      boolean closed = hours.opensAt() == null && hours.closesAt() == null;
      boolean opens = hours.opensAt() != null && hours.closesAt() != null
          && hours.opensAt().compareTo(hours.closesAt()) < 0;
      Problem.require(closed || opens, 422, "Invalid clinic hours");
    }

    db.list("SELECT day_of_week FROM clinic_hours ORDER BY day_of_week FOR UPDATE");
    var activeHolidays = db.list("SELECT * FROM clinic_holiday FOR UPDATE")
        .stream().map(ClinicHours::holiday).toList();
    for (var shift : db.list("SELECT start_at,end_at FROM availability WHERE end_at>? FOR UPDATE", clock.instant())) {
      var start = Db.instant(shift, "startAt").atZone(ScheduleService.ZONE);
      var end = Db.instant(shift, "endAt").atZone(ScheduleService.ZONE);
      var holidayMatch = activeHolidays.stream().filter(h -> h.covers(start.toLocalDate())).findFirst();
      boolean ok = holidayMatch.isPresent()
          ? holidayMatch.get().includes(start, end)
          : sorted.get(start.getDayOfWeek().getValue() - 1).includes(start, end);
      Problem.require(ok, 409, "Clinic hours conflict with an existing shift");
    }
    for (DayHours hours : sorted) {
      db.update("UPDATE clinic_hours SET opens_at=?,closes_at=? WHERE day_of_week=?",
          hours.opensAt(), hours.closesAt(), hours.dayOfWeek());
    }
    audit.record(actor.id(), "CLINIC_HOURS_UPDATED", "clinic-hours");
    return new WeeklyHours(sorted);
  }

  private static DayHours day(Map<String, Object> row) {
    return new DayHours(((Number) row.get("dayOfWeek")).intValue(),
        (String) row.get("opensAt"), (String) row.get("closesAt"));
  }

  private static Holiday holiday(Map<String, Object> row) {
    Object closedVal = row.get("closed");
    boolean closed = Boolean.TRUE.equals(closedVal) || "1".equals(String.valueOf(closedVal));
    return new Holiday(
        row.get("id").toString(),
        LocalDate.parse(row.get("startDate").toString()),
        LocalDate.parse(row.get("endDate").toString()),
        row.get("name").toString(),
        closed,
        (String) row.get("opensAt"),
        (String) row.get("closesAt"));
  }
}
