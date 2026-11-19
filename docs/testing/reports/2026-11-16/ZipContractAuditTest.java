package com.clinic;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.clinic.common.Problem;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

/** Audit probes: run only audit* methods; inherited fixtures use isolated MySQL. */
class ZipContractAuditTest extends SchedulingIntegrationTest {
  @Test void auditZipProgressWithoutKeyReturns400() throws Exception {
    String a = id(appointments.book(patient, slot1, key()));
    mvc.perform(post("/api/appointments/" + a + "/progress")
        .with(jwt().jwt(j -> j.subject(doctor.id()).issuer("http://localhost:8180/realms/clinic")))
        .contentType("application/json").content("{\"targetStatus\":\"IN_PROGRESS\",\"version\":0}"))
        .andExpect(status().isBadRequest());
  }
  @Test void auditZipQueueListPathReturns404AndNextNeedsDate() throws Exception {
    var auth = jwt().jwt(j -> j.subject(doctor.id()).issuer("http://localhost:8180/realms/clinic"));
    mvc.perform(get("/api/queue-tickets").param("date", "2030-01-08").param("doctorId", doctorId).with(auth))
        .andExpect(status().isNotFound());
    mvc.perform(post("/api/doctors/" + doctorId + "/queue/next").header("Idempotency-Key", key()).with(auth))
        .andExpect(status().isBadRequest());
  }
  @Test void auditZipJoinBodyReturns400ButConsentWorks() throws Exception {
    String a = remoteAppointment();
    when(clock.instant()).thenReturn(start.plusSeconds(3000));
    String room = id(telehealth.prepare(patient, a));
    var auth = jwt().jwt(j -> j.subject(patient.id()).issuer("http://localhost:8180/realms/clinic"));
    mvc.perform(post("/api/telehealth-sessions/" + room + "/join").with(auth)
        .contentType("application/json").content("{\"participationConfirmed\":true}"))
        .andExpect(status().isBadRequest());
    mvc.perform(post("/api/telehealth-sessions/" + room + "/join").with(auth)
        .contentType("application/json").content("{\"consent\":true}"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.signalingUrl").exists());
  }
  @Test void auditZipClinicalWriteWithoutKeyReturns400() throws Exception {
    String e = encounter(inProgress());
    var auth = jwt().jwt(j -> j.subject(doctor.id()).issuer("http://localhost:8180/realms/clinic"));
    mvc.perform(put("/api/encounters/" + e + "/record").with(auth)
        .contentType("application/json").content("{\"version\":0,\"content\":\"audit note\",\"status\":\"DRAFT\"}"))
        .andExpect(status().isBadRequest());
    mvc.perform(post("/api/encounters/" + e + "/prescriptions").with(auth)
        .contentType("application/json").content("{\"items\":[]}"))
        .andExpect(status().isBadRequest());
  }
  @Test void auditZipListsOmitEncounterAndDrafts() {
    String a = inProgress(), e = encounter(a);
    clinical.save(doctor, e, 0, "audit draft", "DRAFT");
    clinical.prescribe(doctor, e, java.util.List.of());
    var row = appointments.list(doctor, 100, 0).stream().filter(x -> a.equals(x.get("id"))).findFirst().orElseThrow();
    assertFalse(row.containsKey("encounterId"));
    assertEquals(e, workflow.detail(doctor, a).get("encounterId"));
    assertTrue(clinical.records(doctor, patient.id(), 100, 0).isEmpty());
    assertTrue(clinical.prescriptions(doctor, patient.id(), 100, 0).isEmpty());
    assertEquals("DRAFT", clinical.encounterRecord(doctor, e).get("status"));
    assertEquals(1, clinical.encounterPrescriptions(doctor, e).size());
  }
  @Test void auditZipAuditTimestampFieldIsAbsent() throws Exception {
    appointments.book(patient, slot1, key());
    var auditor = actor("AUDITOR");
    mvc.perform(get("/api/audit-events").param("resourceId", patient.id())
        .with(jwt().jwt(j -> j.subject(auditor.id()).issuer("http://localhost:8180/realms/clinic"))))
        .andExpect(status().isOk());
    var rows = db.list("SELECT * FROM audit_event WHERE actor_id=?", patient.id());
    assertFalse(rows.isEmpty());
    assertTrue(rows.getFirst().containsKey("createdAt"));
    assertFalse(rows.getFirst().containsKey("timestamp"));
  }
  @Test void auditZipPrepareCannotPollEndedRoom() {
    String a = remoteAppointment();
    when(clock.instant()).thenReturn(start.plusSeconds(3000));
    String room = id(telehealth.prepare(patient, a));
    telehealth.join(patient, room, true);
    when(clock.instant()).thenReturn(start.plusSeconds(3600));
    telehealth.start(doctor, room, 1);
    telehealth.end(doctor, room, 2);
    assertEquals(409, assertThrows(Problem.class, () -> telehealth.prepare(patient, a)).status);
    assertEquals("ENDED", telehealth.read(patient, room).get("status"));
  }
  // Acceptance probes below assert the SPEC and intentionally fail on current defects.
  @Test void auditSpecDeniedRoomJoinMustBeAudited() throws Exception {
    String a = remoteAppointment();
    when(clock.instant()).thenReturn(start.plusSeconds(3000));
    String room = id(telehealth.prepare(patient, a));
    long before = db.count("SELECT COUNT(*) FROM audit_event WHERE actor_id=?", other.id());
    mvc.perform(post("/api/telehealth-sessions/" + room + "/join")
        .with(jwt().jwt(j -> j.subject(other.id()).issuer("http://localhost:8180/realms/clinic")))
        .contentType("application/json").content("{\"consent\":true}"))
        .andExpect(status().isNotFound());
    assertTrue(db.count("SELECT COUNT(*) FROM audit_event WHERE actor_id=?", other.id()) > before,
        "AC-23: rejected outsider admission must persist an audit event");
  }
  @Test void auditSpecReceptionistCanReadSchedule() throws Exception {
    var receptionist = actor("RECEPTIONIST");
    mvc.perform(get("/api/doctors/" + doctorId + "/availability")
        .with(jwt().jwt(j -> j.subject(receptionist.id()).issuer("http://localhost:8180/realms/clinic"))))
        .andExpect(status().isOk());
  }
  @Test void auditSpecAuditorCannotReadCatalog() throws Exception {
    var auditor = actor("AUDITOR");
    mvc.perform(get("/api/doctors")
        .with(jwt().jwt(j -> j.subject(auditor.id()).issuer("http://localhost:8180/realms/clinic"))))
        .andExpect(status().isForbidden());
  }
}
