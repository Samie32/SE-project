package com.clinic;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.clinic.appointment.AppointmentService;
import com.clinic.audit.Audit;
import com.clinic.auth.Access;
import com.clinic.availability.ScheduleService;
import com.clinic.catalog.CatalogService;
import com.clinic.common.*;
import com.clinic.notification.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.mail.*;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.*;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class SchedulingIntegrationTest {
  @Container
  static MySQLContainer<?> mysql =
      new MySQLContainer<>("mysql:8.4")
          .withUrlParam("connectionTimeZone", "UTC")
          .withUrlParam("forceConnectionTimeZoneToSession", "true");

  @DynamicPropertySource
  static void properties(DynamicPropertyRegistry p) {
    p.add("spring.datasource.url", mysql::getJdbcUrl);
    p.add("spring.datasource.username", mysql::getUsername);
    p.add("spring.datasource.password", mysql::getPassword);
    p.add("spring.flyway.user", () -> "root");
    p.add("spring.flyway.password", mysql::getPassword);
    p.add("clinic.encryption-key", () -> Base64.getEncoder().encodeToString(new byte[32]));
    p.add("clinic.notifications-enabled", () -> false);
    p.add("management.health.mail.enabled", () -> false);
  }

  @Autowired Db db;
  @Autowired Access access;
  @Autowired CatalogService catalog;
  @Autowired ScheduleService schedule;
  @Autowired AppointmentService appointments;
  @Autowired MockMvc mvc;
  @Autowired Crypto crypto;
  @Autowired NotificationStore notifications;
  @Autowired NotificationWorker worker;
  @MockitoBean Clock clock;
  @MockitoBean JavaMailSender mail;
  @MockitoSpyBean Audit audit;
  Access.Actor admin, patient, other, doctor;
  String doctorId, doctor2, specialty, slot1, slot2, otherDoctorSlot;
  final Instant now = Instant.parse("2030-01-07T00:00:00Z");
  final Instant start = Instant.parse("2030-01-08T02:00:00Z");

  @BeforeEach
  void fixture() {
    when(clock.instant()).thenReturn(now);
    when(clock.getZone()).thenReturn(ZoneOffset.UTC);
    admin = actor("ADMINISTRATOR");
    patient = actor("PATIENT");
    other = actor("PATIENT");
    doctor = actor("DOCTOR");
    specialty = catalog.specialty(admin, "Specialty " + Db.id()).get("id").toString();
    doctorId =
        catalog
            .doctor(admin, doctor.id(), List.of(UUID.fromString(specialty)))
            .get("id")
            .toString();
    var doctorActor2 = actor("DOCTOR");
    doctor2 =
        catalog
            .doctor(admin, doctorActor2.id(), List.of(UUID.fromString(specialty)))
            .get("id")
            .toString();
    schedule.availability(admin, doctorId, start, start.plusSeconds(3600), 20, "IN_PERSON");
    schedule.availability(admin, doctor2, start, start.plusSeconds(3600), 20, "IN_PERSON");
    var slots = db.list("SELECT * FROM slot WHERE doctor_id=? ORDER BY start_at", doctorId);
    slot1 = slots.get(0).get("id").toString();
    slot2 = slots.get(1).get("id").toString();
    otherDoctorSlot =
        db.one("SELECT * FROM slot WHERE doctor_id=? ORDER BY start_at LIMIT 1", doctor2)
            .get("id")
            .toString();
  }

  Access.Actor actor(String role) {
    String id = Db.id();
    db.update(
        "INSERT INTO user_account(id,issuer,subject,display_name,email_encrypted)"
            + " VALUES(?,?,?,?,?)",
        id,
        "http://localhost:8180/realms/clinic",
        id,
        "Test",
        crypto.encrypt("test@example.test"));
    db.update("INSERT INTO user_role VALUES(?,?)", id, role);
    if (role.equals("PATIENT")) db.update("INSERT INTO patient VALUES(?,?)", id, id);
    return new Access.Actor(id, Set.of(role));
  }

  String key() {
    return Db.id();
  }

  String id(Map<String, Object> m) {
    return m.get("id").toString();
  }

  void conflict(Runnable r) {
    assertEquals(409, assertThrows(Problem.class, r::run).status);
  }

  @Test
  void bookingCreatesAuditAndOutboxAtomically() {
    var a = appointments.book(patient, slot1, key());
    assertEquals("CONFIRMED", a.get("status"));
    assertEquals(
        1, db.count("SELECT COUNT(*) FROM notification_job WHERE appointment_id=?", id(a)));
    assertEquals(
        1,
        db.count(
            "SELECT COUNT(*) FROM audit_event WHERE resource_id=? AND action='APPOINTMENT_BOOKED'",
            id(a)));
  }

  @Test
  void sameKeyReplaysButDifferentPayloadConflicts() {
    String k = key();
    var first = appointments.book(patient, slot1, k);
    assertEquals(first, appointments.book(patient, slot1, k));
    conflict(() -> appointments.book(patient, slot2, k));
    assertEquals(1, db.count("SELECT COUNT(*) FROM appointment WHERE patient_id=?", patient.id()));
  }

  @Test
  void twoPatientsCannotBookSameSlot() throws Exception {
    var results =
        race(
            () -> appointments.book(patient, slot1, key()),
            () -> appointments.book(other, slot1, key()));
    assertEquals(1, results.stream().filter(Map.class::isInstance).count());
    assertEquals(1, results.stream().filter(Problem.class::isInstance).count());
  }

  @Test
  void patientCannotBookOverlappingDoctors() throws Exception {
    var results =
        race(
            () -> appointments.book(patient, slot1, key()),
            () -> appointments.book(patient, otherDoctorSlot, key()));
    assertEquals(1, results.stream().filter(Map.class::isInstance).count());
    assertEquals(1, db.count("SELECT COUNT(*) FROM appointment WHERE patient_id=?", patient.id()));
  }

  @Test
  void concurrentDuplicateKeyHasOneEffect() throws Exception {
    String k = key();
    var results =
        race(
            () -> appointments.book(patient, slot1, k), () -> appointments.book(patient, slot1, k));
    assertTrue(results.stream().allMatch(Map.class::isInstance));
    assertEquals(results.get(0), results.get(1));
    assertEquals(1, db.count("SELECT COUNT(*) FROM appointment WHERE patient_id=?", patient.id()));
  }

  @Test
  void failedReschedulePreservesOriginal() {
    var a = appointments.book(patient, slot1, key());
    appointments.book(other, slot2, key());
    conflict(() -> appointments.reschedule(patient, id(a), slot2, 0, key()));
    assertEquals(slot1, db.one("SELECT slot_id FROM appointment WHERE id=?", id(a)).get("slotId"));
    assertEquals(
        1, db.count("SELECT COUNT(*) FROM notification_job WHERE appointment_id=?", id(a)));
  }

  @Test
  void successfulRescheduleChangesVersionAndFreesSlot() {
    var a = appointments.book(patient, slot1, key());
    var b = appointments.reschedule(patient, id(a), slot2, 0, key());
    assertEquals(1, b.get("version"));
    appointments.book(other, slot1, key());
    conflict(() -> appointments.reschedule(patient, id(a), slot1, 0, key()));
  }

  @Test
  void cancelReleasesSlotAndIsIdempotent() {
    var a = appointments.book(patient, slot1, key());
    String k = key();
    var result = appointments.cancel(patient, id(a), "Change of plan", 0, k);
    assertEquals("CANCELLED", result.get("status"));
    assertEquals(result, appointments.cancel(patient, id(a), "Change of plan", 0, k));
    appointments.book(other, slot1, key());
  }

  @Test
  void exactTwoHourDeadlineAllowedButOneSecondLateRejected() {
    var a = appointments.book(patient, slot1, key());
    when(clock.instant()).thenReturn(start.minusSeconds(7200));
    appointments.cancel(patient, id(a), "Allowed boundary", 0, key());
    var b = appointments.book(other, slot1, key());
    when(clock.instant()).thenReturn(start.minusSeconds(7199));
    conflict(() -> appointments.cancel(other, id(b), "Late", 0, key()));
  }

  @Test
  void nonOwnerCannotChangeAppointment() {
    var a = appointments.book(patient, slot1, key());
    assertEquals(
        404,
        assertThrows(Problem.class, () -> appointments.cancel(other, id(a), "Not mine", 0, key()))
            .status);
  }

  @Test
  void auditFailureRollsBackBookingAndIdempotency() {
    doThrow(new DataAccessResourceFailureException("simulated audit failure"))
        .when(org.springframework.test.util.AopTestUtils.<Audit>getUltimateTargetObject(audit))
        .record(eq(patient.id()), eq("APPOINTMENT_BOOKED"), anyString());
    String k = key();
    assertThrows(
        DataAccessResourceFailureException.class, () -> appointments.book(patient, slot1, k));
    assertEquals(0, db.count("SELECT COUNT(*) FROM appointment WHERE patient_id=?", patient.id()));
    assertEquals(
        0,
        db.count(
            "SELECT COUNT(*) FROM idempotency_record WHERE actor_id=? AND request_key=?",
            patient.id(),
            k));
  }

  @Test
  void doctorTimeOffAndInactiveStatusRespectExistingBookings() {
    appointments.book(patient, slot1, key());
    conflict(() -> schedule.timeOff(admin, doctorId, start, start.plusSeconds(1200)));
    conflict(
        () ->
            catalog.updateDoctor(
                admin, doctorId, false, "Doctor", List.of(UUID.fromString(specialty))));
  }

  @Test
  void timeOffHidesAndBlocksSlot() {
    schedule.timeOff(admin, doctorId, start, start.plusSeconds(1200));
    conflict(() -> appointments.book(patient, slot1, key()));
    assertTrue(
        schedule.slots(doctorId, LocalDate.of(2030, 1, 8), null, null).stream()
            .noneMatch(x -> slot1.equals(x.get("id"))));
  }

  @Test
  void bookingAgainstConcurrentTimeOffIsSerialized() throws Exception {
    var results =
        race(
            () -> appointments.book(patient, slot1, key()),
            () -> schedule.timeOff(admin, doctorId, start, start.plusSeconds(1200)));
    assertEquals(1, results.stream().filter(Map.class::isInstance).count());
  }

  @Test
  void adjacentSlotsAreAllowed() {
    appointments.book(patient, slot1, key());
    appointments.book(patient, slot2, key());
    assertEquals(2, db.count("SELECT COUNT(*) FROM appointment WHERE patient_id=?", patient.id()));
  }

  @Test
  void invalidHoursAndOverlappingAvailabilityRejected() {
    assertEquals(
        422,
        assertThrows(
                Problem.class,
                () ->
                    schedule.availability(
                        admin,
                        doctorId,
                        Instant.parse("2030-01-13T02:00:00Z"),
                        Instant.parse("2030-01-13T03:00:00Z"),
                        20,
                        "IN_PERSON"))
            .status);
    conflict(
        () -> schedule.availability(admin, doctorId, start, start.plusSeconds(1200), 20, "REMOTE"));
  }

  @Test
  void noTokenAndWrongRoleAreRejectedAtHttpBoundary() throws Exception {
    mvc.perform(get("/api/appointments")).andExpect(status().isUnauthorized());
    mvc.perform(
            post("/api/specialties")
                .with(
                    jwt()
                        .jwt(
                            j ->
                                j.subject(patient.id())
                                    .issuer("http://localhost:8180/realms/clinic")))
                .contentType("application/json")
                .content("{\"name\":\"Denied\"}"))
        .andExpect(status().isForbidden());
  }

  @Test
  void internalRoleMappingIgnoresTokenAdminClaim() throws Exception {
    String sub = Db.id();
    mvc.perform(
            get("/api/me")
                .with(
                    jwt()
                        .jwt(
                            j ->
                                j.subject(sub)
                                    .issuer("http://localhost:8180/realms/clinic")
                                    .claim("roles", List.of("ADMINISTRATOR")))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.roles[0]").value("PATIENT"));
  }

  @Test
  void patientListAndDoctorSchedulePermissionsAreScoped() {
    appointments.book(patient, slot1, key());
    appointments.book(other, slot2, key());
    assertEquals(1, appointments.list(patient, 20, 0).size());
    assertEquals(2, appointments.list(doctor, 20, 0).size());
    assertEquals(
        403,
        assertThrows(
                Problem.class,
                () -> schedule.timeOff(patient, doctorId, start, start.plusSeconds(1200)))
            .status);
  }

  @Test
  void auditIsAppendOnlyAtDatabaseLevel() {
    var row = db.one("SELECT id FROM audit_event LIMIT 1");
    assertThrows(
        org.springframework.dao.DataAccessException.class,
        () -> db.update("DELETE FROM audit_event WHERE id=?", row.get("id")));
    assertThrows(
        org.springframework.dao.DataAccessException.class,
        () -> db.update("UPDATE audit_event SET action='TAMPER' WHERE id=?", row.get("id")));
  }

  @Test
  void confirmationSentWithoutClinicalContent() {
    var a = appointments.book(patient, slot1, key());
    var job = db.one("SELECT * FROM notification_job WHERE appointment_id=?", id(a));
    // Claim only this job, using the same lease semantics as the worker.
    String lease = Db.id();
    db.update(
        "UPDATE notification_job SET status='PROCESSING',lease_token=? WHERE id=?",
        lease,
        job.get("id"));
    job.put("leaseToken", lease);
    worker.deliver(job);
    var captor = org.mockito.ArgumentCaptor.forClass(SimpleMailMessage.class);
    verify(mail).send(captor.capture());
    assertTrue(captor.getValue().getText().contains(id(a)));
    assertFalse(captor.getValue().getText().contains("token"));
    assertEquals(
        "SENT",
        db.one("SELECT status FROM notification_job WHERE id=?", job.get("id")).get("status"));
  }

  @Test
  void obsoleteConfirmationSkippedAndSmtpFailureDoesNotRollback() {
    var a = appointments.book(patient, slot1, key());
    var old = db.one("SELECT * FROM notification_job WHERE appointment_id=?", id(a));
    appointments.cancel(patient, id(a), "Changed", 0, key());
    String lease = Db.id();
    db.update(
        "UPDATE notification_job SET status='PROCESSING',lease_token=? WHERE id=?",
        lease,
        old.get("id"));
    old.put("leaseToken", lease);
    worker.deliver(old);
    verifyNoInteractions(mail);
    var job =
        db.one(
            "SELECT * FROM notification_job WHERE appointment_id=? AND event_type='CANCELLED'",
            id(a));
    db.update(
        "UPDATE notification_job SET status='PROCESSING',lease_token=? WHERE id=?",
        lease,
        job.get("id"));
    job.put("leaseToken", lease);
    doThrow(new MailSendException("offline")).when(mail).send(any(SimpleMailMessage.class));
    worker.deliver(job);
    assertEquals(
        "PENDING",
        db.one("SELECT status FROM notification_job WHERE id=?", job.get("id")).get("status"));
    assertEquals(
        "CANCELLED", db.one("SELECT status FROM appointment WHERE id=?", id(a)).get("status"));
  }

  @Test
  void encryptedContactRoundTripsAndRejectsTampering() {
    byte[] first = crypto.encrypt("patient@example.test"),
        second = crypto.encrypt("patient@example.test");
    assertFalse(Arrays.equals(first, second));
    assertEquals("patient@example.test", crypto.decrypt(first));
    first[first.length - 1] ^= 1;
    assertThrows(IllegalStateException.class, () -> crypto.decrypt(first));
  }

  @Test
  void hundredConcurrentBookingsHaveExactlyOneWinner() throws Exception {
    List<Access.Actor> people = new ArrayList<>();
    for (int i = 0; i < 100; i++) people.add(actor("PATIENT"));
    CountDownLatch startGate = new CountDownLatch(1);
    try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
      List<Future<Boolean>> futures = new ArrayList<>();
      for (var p : people)
        futures.add(
            pool.submit(
                () -> {
                  startGate.await();
                  try {
                    appointments.book(p, slot1, key());
                    return true;
                  } catch (Problem e) {
                    assertEquals(409, e.status);
                    return false;
                  }
                }));
      startGate.countDown();
      int winners = 0;
      for (var future : futures) if (future.get(60, TimeUnit.SECONDS)) winners++;
      assertEquals(1, winners);
      assertEquals(1, db.count("SELECT COUNT(*) FROM appointment WHERE slot_id=?", slot1));
    }
  }

  @Test
  void rolesCanBeGrantedByAdminButNotByPatient() {
    access.roles(admin, other.id(), Set.of("PATIENT", "RECEPTIONIST"));
    assertEquals(2, db.count("SELECT COUNT(*) FROM user_role WHERE user_id=?", other.id()));
    assertEquals(
        403,
        assertThrows(
                Problem.class, () -> access.roles(patient, other.id(), Set.of("ADMINISTRATOR")))
            .status);
    conflict(() -> access.roles(admin, admin.id(), Set.of("PATIENT")));
  }

  @Test
  void notificationRetriesStopAfterThreeRetries() {
    var a = appointments.book(patient, slot1, key());
    String jobId =
        db.one("SELECT id FROM notification_job WHERE appointment_id=?", id(a))
            .get("id")
            .toString();
    for (int i = 0; i < 4; i++) {
      var job = db.one("SELECT * FROM notification_job WHERE id=?", jobId);
      String lease = Db.id();
      db.update(
          "UPDATE notification_job SET status='PROCESSING',lease_token=? WHERE id=?", lease, jobId);
      job.put("leaseToken", lease);
      notifications.failed(job);
    }
    assertEquals(
        "FAILED", db.one("SELECT status FROM notification_job WHERE id=?", jobId).get("status"));
    assertEquals(
        "CONFIRMED", db.one("SELECT status FROM appointment WHERE id=?", id(a)).get("status"));
  }

  @Test
  void missingVersionRejectedAndDisabledAccountBlocked() throws Exception {
    var a = appointments.book(patient, slot1, key());
    mvc.perform(
            post("/api/appointments/" + id(a) + "/cancel")
                .with(
                    jwt()
                        .jwt(
                            j ->
                                j.subject(patient.id())
                                    .issuer("http://localhost:8180/realms/clinic")))
                .header("Idempotency-Key", key())
                .contentType("application/json")
                .content("{\"reason\":\"missing version\"}"))
        .andExpect(status().isBadRequest());
    db.update("UPDATE user_account SET active=FALSE WHERE id=?", patient.id());
    mvc.perform(
            get("/api/me")
                .with(
                    jwt()
                        .jwt(
                            j ->
                                j.subject(patient.id())
                                    .issuer("http://localhost:8180/realms/clinic"))))
        .andExpect(status().isForbidden());
  }

  private List<Object> race(Callable<?> a, Callable<?> b) throws Exception {
    var ready = new CountDownLatch(2);
    var start = new CountDownLatch(1);
    try (var pool = Executors.newFixedThreadPool(2)) {
      List<Future<Object>> jobs = new ArrayList<>();
      for (var call : List.of(a, b))
        jobs.add(
            pool.submit(
                () -> {
                  ready.countDown();
                  start.await();
                  try {
                    return call.call();
                  } catch (Problem e) {
                    return e;
                  }
                }));
      assertTrue(ready.await(10, TimeUnit.SECONDS));
      start.countDown();
      return List.of(jobs.get(0).get(30, TimeUnit.SECONDS), jobs.get(1).get(30, TimeUnit.SECONDS));
    }
  }
}
