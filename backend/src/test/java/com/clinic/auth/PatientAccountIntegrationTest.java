package com.clinic.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.clinic.audit.Audit;
import com.clinic.common.Db;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.util.AopTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class PatientAccountIntegrationTest {
  private static final String ISSUER = "http://localhost:8180/realms/clinic";
  private static final String PATH = "/api/patient-accounts/";
  private static final String LOCK = """
      {"active":false,"reason":"SECURITY_REVIEW"}
      """;

  @Container
  static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4")
      .withUrlParam("sslMode", "DISABLED")
      .withUrlParam("allowPublicKeyRetrieval", "true")
      .withUrlParam("connectionTimeZone", "UTC")
      .withUrlParam("forceConnectionTimeZoneToSession", "true");

  @DynamicPropertySource
  static void properties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", mysql::getJdbcUrl);
    registry.add("spring.datasource.username", mysql::getUsername);
    registry.add("spring.datasource.password", mysql::getPassword);
    registry.add("spring.flyway.user", () -> "root");
    registry.add("spring.flyway.password", mysql::getPassword);
    registry.add("clinic.encryption-key", () -> Base64.getEncoder().encodeToString(new byte[32]));
    registry.add("clinic.notifications-enabled", () -> false);
    registry.add("clinic.mail-from", () -> "clinic@example.test");
    registry.add("management.health.mail.enabled", () -> false);
  }

  private static final Pattern OTP_DIGITS = Pattern.compile("\\b([0-9]{6})\\b");

  record Account(String id, String subject) {
    RequestPostProcessor token() {
      return jwt().jwt(j -> j.issuer(ISSUER).subject(subject));
    }
  }

  @Autowired Db db;
  @Autowired MockMvc mvc;
  @MockitoBean JavaMailSender mailSender;
  @MockitoSpyBean Audit audit;
  Account admin, patient, receptionist;
  String patientId;

  @BeforeEach
  void fixture() {
    reset(mailSender);
    admin = account("ADMINISTRATOR", true);
    receptionist = account("RECEPTIONIST", true);
    patient = account("PATIENT", false);
    patientId = Db.id();
    db.update("INSERT INTO patient VALUES(?,?)", patientId, patient.id());
  }

  private String requestAndCaptureOtp(RequestPostProcessor token, String email) throws Exception {
    mvc.perform(post("/api/me/contact/otp").with(token)
        .contentType("application/json")
        .content("{\"email\":\"%s\"}".formatted(email)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.expiresInSeconds").value(300));
    ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
    verify(mailSender, atLeastOnce()).send(captor.capture());
    List<SimpleMailMessage> sent = captor.getAllValues();
    Matcher matcher = OTP_DIGITS.matcher(sent.getLast().getText());
    assertTrue(matcher.find(), "Expected 6-digit OTP in email text");
    return matcher.group(1);
  }

  private Account account(String role, boolean staff) {
    var account = new Account(Db.id(), Db.id());
    db.update(
        "INSERT INTO user_account(id,issuer,subject,display_name,email_encrypted,staff) VALUES(?,?,?,?,?,?)",
        account.id(), ISSUER, account.subject(), "Test Patient", new byte[] {1, 2, 3}, staff);
    db.update("INSERT INTO user_role VALUES(?,?)", account.id(), role);
    return account;
  }

  @Test
  void exactLookupUsesInternalAccountIdAndReturnsOnlyAccountFields() throws Exception {
    mvc.perform(get(PATH + patient.id().toUpperCase(Locale.ROOT)).with(admin.token()))
        .andExpect(status().isOk())
        .andExpect(content().json("""
            {"id":"%s","displayName":"Test Patient","active":true}
            """.formatted(patient.id()), JsonCompareMode.STRICT));
    for (String id : new String[]{patient.subject(), patientId, Db.id()}) {
      mvc.perform(get(PATH + id).with(admin.token())).andExpect(status().isNotFound());
    }
    mvc.perform(get(PATH + "1-1-1-1-1").with(admin.token())).andExpect(status().isBadRequest());
    assertEquals(1, countAudit("PATIENT_ACCOUNT_LOOKUP"));
  }

  @Test
  void exactLookupSupportsEmailAndPhoneAndRejectsPartialQueries() throws Exception {
    String otp = requestAndCaptureOtp(patient.token(), "Patient.Lookup@Example.Test");
    mvc.perform(put("/api/me/contact").with(patient.token())
        .contentType("application/json")
        .content("""
            {"email":"Patient.Lookup@Example.Test","phone":"+84 901 234 567","otp":"%s"}
            """.formatted(otp)))
        .andExpect(status().isOk());

    mvc.perform(get("/api/me/profile").with(patient.token()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value("patient.lookup@example.test"))
        .andExpect(jsonPath("$.phone").value("0901234567"));

    String expected = """
        {"id":"%s","displayName":"Test Patient","active":true}
        """.formatted(patient.id());

    mvc.perform(get(PATH + "lookup").param("q", "patient.lookup@example.test").with(admin.token()))
        .andExpect(status().isOk())
        .andExpect(content().json(expected, JsonCompareMode.STRICT));

    mvc.perform(get(PATH + "lookup").param("q", "0901234567").with(admin.token()))
        .andExpect(status().isOk())
        .andExpect(content().json(expected, JsonCompareMode.STRICT));

    mvc.perform(get(PATH + "lookup").param("q", "+84-901-234-567").with(admin.token()))
        .andExpect(status().isOk())
        .andExpect(content().json(expected, JsonCompareMode.STRICT));

    // Reject partial/name queries and non-matching values.
    mvc.perform(get(PATH + "lookup").param("q", "Test Patient").with(admin.token()))
        .andExpect(status().isBadRequest());
    mvc.perform(get(PATH + "lookup").param("q", "+14155551234").with(admin.token()))
        .andExpect(status().isBadRequest());
    mvc.perform(get(PATH + "lookup").param("q", "0901234568").with(admin.token()))
        .andExpect(status().isNotFound());
    mvc.perform(get(PATH + "lookup").param("q", "other@example.test").with(admin.token()))
        .andExpect(status().isNotFound());
    mvc.perform(get(PATH + "lookup").param("q", "patient.lookup@example.test").with(receptionist.token()))
        .andExpect(status().isForbidden());
    assertEquals(3, countAudit("PATIENT_ACCOUNT_LOOKUP"));
  }

  @Test
  void contactOtpFlowEnforcesVerificationAndAllowsPhoneOnlyUpdate() throws Exception {
    Account otherPatient = account("PATIENT", false);
    db.update("INSERT INTO patient VALUES(?,?)", Db.id(), otherPatient.id());

    // Anonymous OTP request is rejected.
    mvc.perform(post("/api/me/contact/otp")
        .contentType("application/json")
        .content("{\"email\":\"anon@example.test\"}"))
        .andExpect(status().isUnauthorized());

    // Changing email without OTP fails even though notifications-enabled=false.
    mvc.perform(put("/api/me/contact").with(patient.token())
        .contentType("application/json")
        .content("{\"email\":\"verified@example.test\"}"))
        .andExpect(status().isBadRequest());

    String otp = requestAndCaptureOtp(patient.token(), "verified@example.test");
    assertEquals(1, db.count(
        "SELECT COUNT(*) FROM audit_event WHERE actor_id=? AND action='CONTACT_OTP_SENT'", patient.id()));

    // Immediate resend within 30s is rate-limited.
    mvc.perform(post("/api/me/contact/otp").with(patient.token())
        .contentType("application/json")
        .content("{\"email\":\"verified@example.test\"}"))
        .andExpect(status().isTooManyRequests());

    // Wrong OTP or cross-account OTP reuse fails.
    String wrongOtp = otp.equals("000000") ? "111111" : "000000";
    mvc.perform(put("/api/me/contact").with(patient.token())
        .contentType("application/json")
        .content("""
            {"email":"verified@example.test","otp":"%s"}
            """.formatted(wrongOtp)))
        .andExpect(status().isBadRequest());
    mvc.perform(put("/api/me/contact").with(otherPatient.token())
        .contentType("application/json")
        .content("""
            {"email":"verified@example.test","otp":"%s"}
            """.formatted(otp)))
        .andExpect(status().isBadRequest());

    // Valid OTP succeeds, updates contact, and clears persisted contact_otp row.
    mvc.perform(put("/api/me/contact").with(patient.token())
        .contentType("application/json")
        .content("""
            {"email":"verified@example.test","phone":"0912345678","otp":"%s"}
            """.formatted(otp)))
        .andExpect(status().isOk());
    assertEquals(0, db.count("SELECT COUNT(*) FROM contact_otp WHERE actor_id=?", patient.id()));
    assertEquals(1, db.count(
        "SELECT COUNT(*) FROM audit_event WHERE actor_id=? AND action='CONTACT_UPDATED'", patient.id()));

    // Reusing consumed OTP fails.
    mvc.perform(put("/api/me/contact").with(patient.token())
        .contentType("application/json")
        .content("""
            {"email":"other2@example.test","otp":"%s"}
            """.formatted(otp)))
        .andExpect(status().isBadRequest());

    // Updating phone while keeping the same verified email succeeds without OTP.
    mvc.perform(put("/api/me/contact").with(patient.token())
        .contentType("application/json")
        .content("{\"email\":\"verified@example.test\",\"phone\":\"0988776655\"}"))
        .andExpect(status().isOk());
    mvc.perform(get("/api/me/profile").with(patient.token()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.phone").value("0988776655"));

    // Non-Vietnam phone numbers are rejected.
    mvc.perform(put("/api/me/contact").with(patient.token())
        .contentType("application/json")
        .content("{\"email\":\"verified@example.test\",\"phone\":\"+14155551234\"}"))
        .andExpect(status().isBadRequest());

    // Shared family phone across two patient accounts returns 409 on lookup.
    String otherOtp = requestAndCaptureOtp(otherPatient.token(), "family.member@example.test");
    mvc.perform(put("/api/me/contact").with(otherPatient.token())
        .contentType("application/json")
        .content("""
            {"email":"family.member@example.test","phone":"0988776655","otp":"%s"}
            """.formatted(otherOtp)))
        .andExpect(status().isOk());
    mvc.perform(get(PATH + "lookup").param("q", "0988776655").with(admin.token()))
        .andExpect(status().isConflict());
  }

  @Test
  void accessControlsExcludeReceptionistsStaffAndSelf() throws Exception {
    mvc.perform(get(PATH + patient.id())).andExpect(status().isUnauthorized());
    mvc.perform(get(PATH + patient.id()).with(receptionist.token())).andExpect(status().isForbidden());
    mvc.perform(put(PATH + patient.id() + "/access").with(patient.token())
        .contentType("application/json").content(LOCK)).andExpect(status().isForbidden());
    for (String id : new String[]{admin.id(), receptionist.id()}) {
      mvc.perform(get(PATH + id).with(admin.token())).andExpect(status().isNotFound());
      mvc.perform(change(id, LOCK)).andExpect(status().isNotFound());
    }
    var formerStaff = account("PATIENT", true);
    db.update("INSERT INTO patient VALUES(?,?)", Db.id(), formerStaff.id());
    mvc.perform(change(formerStaff.id(), LOCK)).andExpect(status().isNotFound());
  }

  @Test
  void lockBlocksExistingTokenAndUnlockRestoresAccessWithSamePatientRecord() throws Exception {
    String appointment = pastAppointment();
    var existingToken = patient.token();
    mvc.perform(get("/api/me/profile").with(existingToken)).andExpect(status().isOk());
    mvc.perform(change(patient.id(), LOCK)).andExpect(status().isOk())
        .andExpect(jsonPath("$.active").value(false));
    mvc.perform(get("/api/me/profile").with(existingToken)).andExpect(status().isForbidden());
    mvc.perform(get("/api/appointments").with(existingToken)).andExpect(status().isForbidden());
    mvc.perform(change(patient.id(), LOCK)).andExpect(status().isOk());
    assertEquals(1, countAudit("PATIENT_ACCOUNT_LOCKED_SECURITY_REVIEW"));
    mvc.perform(change(patient.id(), """
        {"active":true,"reason":"PATIENT_REQUEST"}
        """)).andExpect(status().isOk()).andExpect(jsonPath("$.active").value(true));
    mvc.perform(get("/api/me/profile").with(existingToken)).andExpect(status().isOk())
        .andExpect(jsonPath("$.patientId").value(patientId));
    mvc.perform(get("/api/appointments").with(existingToken)).andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(appointment))
        .andExpect(jsonPath("$[0].status").value("COMPLETED"));
    assertEquals(1, countAudit("PATIENT_ACCOUNT_UNLOCKED_PATIENT_REQUEST"));
  }

  private String pastAppointment() {
    var doctor = account("DOCTOR", true);
    String doctorId = Db.id(), shift = Db.id(), slot = Db.id(), appointment = Db.id();
    var start = Instant.parse("2025-01-07T02:00:00Z");
    var end = start.plusSeconds(30 * 60);
    db.update("INSERT INTO doctor(id,user_id) VALUES(?,?)", doctorId, doctor.id());
    db.update("INSERT INTO availability VALUES(?,?,?,?,?,'IN_PERSON')", shift, doctorId, start, end, 30);
    db.update("INSERT INTO slot VALUES(?,?,?,?,?,'IN_PERSON')", slot, shift, doctorId, start, end);
    db.update(
        "INSERT INTO appointment(id,patient_id,doctor_id,slot_id,start_at,end_at,mode,status)"
            + " VALUES(?,?,?,?,?,?,'IN_PERSON','COMPLETED')",
        appointment, patientId, doctorId, slot, start, end);
    return appointment;
  }

  @Test
  void invalidOrMissingReasonDoesNotChangeAccountState() throws Exception {
    for (String body : new String[]{
        "{\"active\":false}", "{\"active\":false,\"reason\":\"FREE_TEXT\"}",
        "{\"active\":false,\"reason\":0}", "{\"active\":\"false\",\"reason\":\"SECURITY_REVIEW\"}",
        "{\"reason\":\"SECURITY_REVIEW\"}"}) {
      mvc.perform(change(patient.id(), body)).andExpect(status().isBadRequest());
    }
    mvc.perform(get("/api/me").with(patient.token())).andExpect(status().isOk());
  }

  @Test
  void missingAuditRollsBackTheLock() throws Exception {
    doThrow(new DataAccessResourceFailureException("test audit failure"))
        .when(AopTestUtils.<Audit>getUltimateTargetObject(audit))
        .record(admin.id(), "PATIENT_ACCOUNT_LOCKED_SECURITY_REVIEW", patient.id());
    mvc.perform(change(patient.id(), LOCK)).andExpect(status().isServiceUnavailable());
    mvc.perform(get("/api/me").with(patient.token())).andExpect(status().isOk());
  }

  @Test
  void syncsRegistrationClaimsToProfileAndEnforces90DayCooldownOnPersonalChanges() throws Exception {
    String registeredSubject = Db.id();
    RequestPostProcessor registeredToken = jwt().jwt(j -> j
        .issuer(ISSUER)
        .subject(registeredSubject)
        .claim("preferred_username", "newpatient@example.test")
        .claim("name", "Nguyễn Văn An")
        .claim("email", "newpatient@example.test")
        .claim("phoneNumber", "+84 912 345 678")
        .claim("birthDate", "1998-04-20")
        .claim("hometown", "Nghệ An")
        .claim("permanentAddress", "Quận 7, TP.HCM"));

    mvc.perform(get("/api/me/profile").with(registeredToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.phone").value("0912345678"))
        .andExpect(jsonPath("$.birthDate").value("1998-04-20"))
        .andExpect(jsonPath("$.hometown").value("Nghệ An"))
        .andExpect(jsonPath("$.permanentAddress").value("Quận 7, TP.HCM"))
        .andExpect(jsonPath("$.personalInfoNextEditAt").isEmpty());

    // First modification of existing personal info succeeds once and starts 90-day cooldown.
    mvc.perform(put("/api/me/profile").with(registeredToken)
        .contentType("application/json")
        .content("""
            {"birthDate":"1998-04-20","hometown":"Hà Tĩnh","permanentAddress":"Quận 7, TP.HCM"}
            """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.hometown").value("Hà Tĩnh"))
        .andExpect(jsonPath("$.personalInfoUpdatedAt").isNotEmpty())
        .andExpect(jsonPath("$.personalInfoNextEditAt").isNotEmpty());

    // Second modification within 90 days is rejected with 409 Conflict.
    mvc.perform(put("/api/me/profile").with(registeredToken)
        .contentType("application/json")
        .content("""
            {"birthDate":"1998-04-20","hometown":"Đà Nẵng","permanentAddress":"Quận 7, TP.HCM"}
            """))
        .andExpect(status().isConflict());

    // First-time filling of previously empty personal fields does not lock future edits.
    mvc.perform(put("/api/me/profile").with(patient.token())
        .contentType("application/json")
        .content("""
            {"birthDate":"2000-01-10"}
            """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.birthDate").value("2000-01-10"))
        .andExpect(jsonPath("$.personalInfoNextEditAt").isEmpty());

    mvc.perform(put("/api/me/profile").with(patient.token())
        .contentType("application/json")
        .content("""
            {"birthDate":"2000-01-10","hometown":"Huế"}
            """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.hometown").value("Huế"))
        .andExpect(jsonPath("$.personalInfoNextEditAt").isEmpty());
  }

  private MockHttpServletRequestBuilder change(String id, String body) {
    return put(PATH + id + "/access").with(admin.token()).contentType("application/json").content(body);
  }

  private long countAudit(String action) {
    return db.count("SELECT COUNT(*) FROM audit_event WHERE actor_id=? AND action=? AND resource_id=?",
        admin.id(), action, patient.id());
  }
}
