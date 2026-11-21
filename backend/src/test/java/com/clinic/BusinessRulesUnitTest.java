package com.clinic;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.clinic.appointment.AppointmentDelayPolicy;
import com.clinic.appointment.Idempotency;
import com.clinic.audit.Audit;
import com.clinic.auth.Access;
import com.clinic.availability.ClinicHours;
import com.clinic.catalog.CatalogService;
import com.clinic.common.Commands;
import com.clinic.common.Db;
import com.clinic.common.Problem;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class BusinessRulesUnitTest {
  private static final Clock FIXED_CLOCK =
      Clock.fixed(Instant.parse("2026-11-21T02:00:00Z"), ZoneOffset.UTC);

  @Test
  void appointmentDelayPolicyCoversConfirmedCheckedInAndDayBoundaries() {
    Instant start = Instant.parse("2026-11-21T03:00:00Z"); // 10:00 Asia/Ho_Chi_Minh
    assertTrue(AppointmentDelayPolicy.canNotify(
        Map.of("startAt", start, "status", "CONFIRMED", "mode", "REMOTE"),
        start.plusSeconds(899)));
    assertFalse(AppointmentDelayPolicy.canNotify(
        Map.of("startAt", start, "status", "CONFIRMED", "mode", "REMOTE"),
        start.plusSeconds(900)));
    assertTrue(AppointmentDelayPolicy.canNotify(
        Map.of("startAt", start, "status", "CHECKED_IN", "mode", "IN_PERSON"),
        start.plusSeconds(1800)));
    assertFalse(AppointmentDelayPolicy.canNotify(
        Map.of("startAt", start, "status", "CHECKED_IN", "mode", "REMOTE"),
        start.plusSeconds(100)));
    assertFalse(AppointmentDelayPolicy.canNotify(
        Map.of("startAt", start, "status", "CANCELLED", "mode", "IN_PERSON"),
        start.minusSeconds(60)));
    assertFalse(AppointmentDelayPolicy.sameClinicDay(
        Instant.parse("2026-11-21T16:59:59Z"), // 23:59:59 VN Nov 21
        Instant.parse("2026-11-21T17:00:00Z"))); // 00:00:00 VN Nov 22
  }

  @Test
  void catalogServiceEnforcesRoleValidationAndDoctorLifecycleConflicts() {
    Db db = mock(Db.class);
    Audit audit = mock(Audit.class);
    CatalogService service = new CatalogService(db, audit, FIXED_CLOCK);
    Access.Actor admin = new Access.Actor("admin-1", Set.of("ADMINISTRATOR"));
    Access.Actor patient = new Access.Actor("pat-1", Set.of("PATIENT"));

    when(db.list(startsWith("SELECT * FROM specialty ORDER BY"))).thenReturn(List.of(Map.of("name", "Noi")));
    when(db.list(startsWith("SELECT * FROM specialty WHERE active=TRUE"))).thenReturn(List.of());
    assertEquals(1, service.specialties(true).size());
    assertEquals(0, service.specialties(false).size());

    Problem forbidden = assertThrows(Problem.class,
        () -> service.specialty(patient, "Tim mach"));
    assertEquals(403, forbidden.status);

    Problem blankName = assertThrows(Problem.class,
        () -> service.specialty(admin, "   "));
    assertEquals(422, blankName.status);

    when(db.one(eq("SELECT * FROM specialty WHERE id=?"), any())).thenReturn(Map.of("name", "Tim mach"));
    assertEquals("Tim mach", service.specialty(admin, " Tim mach ").get("name"));
    verify(audit).record(eq("admin-1"), eq("SPECIALTY_CREATED"), any());

    when(db.one(eq("SELECT id FROM specialty WHERE id=? FOR UPDATE"), eq("spec-1")))
        .thenReturn(Map.of("id", "spec-1"));
    assertThrows(Problem.class, () -> service.updateSpecialty(admin, "spec-1", "  ", true));
    when(db.one(eq("SELECT * FROM specialty WHERE id=?"), eq("spec-1")))
        .thenReturn(Map.of("id", "spec-1", "name", "Nhi", "active", false));
    assertEquals("Nhi", service.updateSpecialty(admin, "spec-1", " Nhi ", false).get("name"));

    UUID sid = UUID.randomUUID();
    when(db.one(eq("SELECT user_id FROM doctor WHERE id=?"), eq("doc-1")))
        .thenReturn(Map.of("userId", "u-doc-1"));
    when(db.list(contains("r.role='DOCTOR'"), eq("u-doc-1"))).thenReturn(List.of());
    Problem missingRole = assertThrows(Problem.class,
        () -> service.updateDoctor(admin, "doc-1", true, "BS A", List.of(sid)));
    assertEquals(409, missingRole.status);

    when(db.list(contains("FROM appointment WHERE doctor_id=?"), eq("doc-1"), eq(FIXED_CLOCK.instant())))
        .thenReturn(List.of(Map.of("id", "appt-1")));
    Problem hasBookings = assertThrows(Problem.class,
        () -> service.updateDoctor(admin, "doc-1", false, "BS A", List.of(sid)));
    assertEquals(409, hasBookings.status);

    when(db.list(contains("FROM appointment WHERE doctor_id=?"), eq("doc-1"), eq(FIXED_CLOCK.instant())))
        .thenReturn(List.of());
    when(db.one(eq("SELECT * FROM doctor WHERE id=?"), eq("doc-1")))
        .thenReturn(Map.of("id", "doc-1", "active", false));
    assertEquals(false, service.updateDoctor(admin, "doc-1", false, " BS A ", List.of(sid, sid)).get("active"));
    verify(audit).record("admin-1", "DOCTOR_UPDATED", "doc-1");
  }

  @Test
  void clinicHoursValidatesHolidayDatesHoursAndWeeklyDays() {
    Db db = mock(Db.class);
    Audit audit = mock(Audit.class);
    ClinicHours hours = new ClinicHours(db, audit, FIXED_CLOCK);
    Access.Actor admin = new Access.Actor("admin-1", Set.of("ADMINISTRATOR"));

    assertThrows(Problem.class, () -> hours.addHoliday(admin,
        new ClinicHours.HolidayInput(LocalDate.of(2026, 12, 2), LocalDate.of(2026, 12, 1), "Tet", true, null, null)));
    assertThrows(Problem.class, () -> hours.addHoliday(admin,
        new ClinicHours.HolidayInput(LocalDate.of(2026, 12, 1), LocalDate.of(2026, 12, 1), "Tet", false, "17:00", "08:00")));

    when(db.list(contains("FROM clinic_holiday WHERE start_date<=?"), any(), any()))
        .thenReturn(List.of(Map.of("id", "h-existing")));
    Problem overlap = assertThrows(Problem.class, () -> hours.addHoliday(admin,
        new ClinicHours.HolidayInput(LocalDate.of(2026, 12, 1), LocalDate.of(2026, 12, 1), "Tet", true, null, null)));
    assertEquals(409, overlap.status);

    List<ClinicHours.DayHours> badOrder = List.of(
        new ClinicHours.DayHours(1, "08:00", "17:00"),
        new ClinicHours.DayHours(1, "08:00", "17:00"),
        new ClinicHours.DayHours(3, "08:00", "17:00"),
        new ClinicHours.DayHours(4, "08:00", "17:00"),
        new ClinicHours.DayHours(5, "08:00", "17:00"),
        new ClinicHours.DayHours(6, "08:00", "12:00"),
        new ClinicHours.DayHours(7, null, null));
    assertThrows(Problem.class, () -> hours.update(admin, new ClinicHours.WeeklyHours(badOrder)));
  }

  @Test
  void commandsEnforcesRoleMatrixAndIdempotencyReplay() {
    Idempotency idem = mock(Idempotency.class);
    Audit audit = mock(Audit.class);
    Commands commands = new Commands(idem, audit);

    Access.Actor patient = new Access.Actor("p1", Set.of("PATIENT"));
    Access.Actor doctor = new Access.Actor("d1", Set.of("DOCTOR"));
    Access.Actor receptionist = new Access.Actor("r1", Set.of("RECEPTIONIST"));

    assertThrows(Problem.class,
        () -> commands.run(patient, "CHECKIN:a1", "k1", Map.of(), () -> Map.of("ok", true)));
    assertThrows(Problem.class,
        () -> commands.run(receptionist, "RECORD_SAVE:a1", "k2", Map.of(), () -> Map.of("ok", true)));
    assertThrows(Problem.class,
        () -> commands.run(patient, "QUEUE_NEXT:d1", "k3", Map.of(), () -> Map.of("ok", true)));

    when(idem.begin("d1", "ROOM_PREPARE:a1", "k-replay", "in")).thenReturn(Map.of("replayed", true));
    Map<String, Object> replayed = commands.run(doctor, "ROOM_PREPARE:a1", "k-replay", "in",
        () -> fail("Should not execute action on replay"));
    assertEquals(true, replayed.get("replayed"));
    verify(audit).record("d1", "COMMAND_REPLAYED", "ROOM_PREPARE:a1");

    when(idem.begin("r1", "DELAY_NOTICE:a1", "k-fresh", "in")).thenReturn(null);
    Map<String, Object> fresh = commands.run(receptionist, "DELAY_NOTICE:a1", "k-fresh", "in",
        () -> Map.of("sent", true));
    assertEquals(true, fresh.get("sent"));
    verify(idem).complete("r1", "DELAY_NOTICE:a1", "k-fresh", fresh);
  }
}
