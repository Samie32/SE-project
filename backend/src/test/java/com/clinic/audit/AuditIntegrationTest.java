package com.clinic.audit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.clinic.common.Crypto;
import com.clinic.common.Db;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class AuditIntegrationTest {
  private static final String ISSUER = "http://localhost:8180/realms/clinic";

  @Container
  static final MySQLContainer<?> mysql =
      new MySQLContainer<>("mysql:8.4")
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

  record Account(String id, String subject, String username) {
    RequestPostProcessor token() {
      return jwt().jwt(j -> j.issuer(ISSUER).subject(subject));
    }
  }

  @Autowired Db db;
  @Autowired Audit audit;
  @Autowired Crypto crypto;
  @Autowired TransactionTemplate tx;
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @MockitoBean Clock clock;
  @MockitoBean JavaMailSender mailSender;

  private final AtomicReference<Instant> currentNow =
      new AtomicReference<>(Instant.parse("2026-11-23T08:00:00Z"));

  private Account auditor;
  private Account admin;
  private Account patient;

  @BeforeEach
  void setUp() {
    currentNow.set(Instant.parse("2026-11-23T08:00:00Z"));
    when(clock.instant()).thenAnswer(inv -> currentNow.get());
    when(clock.getZone()).thenReturn(ZoneOffset.UTC);

    auditor = createAccount("AUDITOR", true, "auditor_main");
    admin = createAccount("ADMINISTRATOR", true, "admin_main");
    patient = createAccount("PATIENT", false, "patient_plain");
  }

  private Account createAccount(String role, boolean staff, String username) {
    String id = Db.id();
    String subject = "sub-" + id;
    db.update(
        "INSERT INTO user_account(id,issuer,subject,display_name,username,staff) VALUES(?,?,?,?,?,?)",
        id,
        ISSUER,
        subject,
        "Test " + role,
        username,
        staff);
    db.update("INSERT INTO user_role(user_id,role) VALUES(?,?)", id, role);
    return new Account(id, subject, username);
  }

  private void recordAt(Instant at, String actorId, String action, String resourceId) {
    currentNow.set(at);
    tx.executeWithoutResult(status -> audit.record(actorId, action, resourceId));
  }

  private void deniedAt(Instant at, String actorId, String action, String resourceId) {
    currentNow.set(at);
    audit.denied(actorId, action, resourceId);
  }

  @Test
  void hashChainAndIntegrityVerificationSucceedOnRealMysqlDatetime6() throws Exception {
    var headStart = db.one("SELECT last_seq,last_hash FROM audit_chain_head WHERE id=1");
    long seqStart = ((Number) headStart.get("lastSeq")).longValue();
    String hashStart = headStart.get("lastHash").toString();

    // Exercise fractional microseconds, sub-microsecond truncation (including .999999999 rollover
    // edge so MySQL DATETIME(6) never rounds up to the next second), zero/half-second edges,
    // SYSTEM actor, and DENIED result.
    recordAt(
        Instant.parse("2026-11-23T08:00:00.123456789Z"),
        auditor.id(),
        "RECORD_AMENDED",
        "chain-res-1");
    recordAt(
        Instant.parse("2026-11-23T08:00:01.000001Z"),
        null,
        "NOTIFICATION_SENT",
        "chain-res-2");
    recordAt(
        Instant.parse("2026-11-23T08:00:02.500000Z"),
        admin.id(),
        "ROLES_CHANGED",
        "chain-res-3");
    deniedAt(
        Instant.parse("2026-11-23T08:00:03.000000Z"),
        patient.id(),
        "TELEHEALTH_JOINED",
        "chain-res-4");
    recordAt(
        Instant.parse("2026-11-23T08:00:03.999999999Z"),
        auditor.id(),
        "PRESCRIPTION_ISSUED",
        "chain-res-5");

    // Verify chained rows in MySQL and recompute event_hash from DATETIME(6) round-tripped rows.
    var newRows =
        db.list(
            "SELECT id,actor_id,actor_type,actor_label,action,resource_id,result,correlation_id,"
                + "created_at,chain_seq,prev_hash,event_hash"
                + " FROM audit_event WHERE chain_seq>? ORDER BY chain_seq ASC",
            seqStart);
    assertEquals(5, newRows.size());
    String expectedPrev = hashStart;
    long expectedSeq = seqStart + 1;
    for (var row : newRows) {
      long seq = ((Number) row.get("chainSeq")).longValue();
      assertEquals(expectedSeq, seq);
      assertEquals(expectedPrev, row.get("prevHash"));
      String recomputed =
          AuditHashChain.computeEventHash(
              crypto,
              seq,
              row.get("prevHash").toString(),
              row.get("id").toString(),
              Instant.parse(row.get("createdAt").toString()),
              row.get("actorType").toString(),
              row.get("actorId") == null ? null : row.get("actorId").toString(),
              row.get("actorLabel") == null ? null : row.get("actorLabel").toString(),
              row.get("action").toString(),
              row.get("resourceId").toString(),
              row.get("result").toString(),
              row.get("correlationId").toString());
      assertEquals(recomputed, row.get("eventHash"));
      expectedPrev = recomputed;
      expectedSeq++;
    }
    var headAfterSeed = db.one("SELECT last_seq,last_hash FROM audit_chain_head WHERE id=1");
    long seqBeforeVerify = ((Number) headAfterSeed.get("lastSeq")).longValue();
    String hashBeforeVerify = headAfterSeed.get("lastHash").toString();
    assertEquals(seqStart + 5, seqBeforeVerify);
    assertEquals(expectedPrev, hashBeforeVerify);

    // Insert a legacy pre-V12 unchained row (chain_seq/prev_hash/event_hash = NULL).
    String legacyId = Db.id();
    db.update(
        "INSERT INTO audit_event(id,actor_id,actor_type,action,resource_id,result,correlation_id,"
            + "created_at,actor_label) VALUES(?,?,?,?,?,?,?,?,?)",
        legacyId,
        auditor.id(),
        "USER",
        "PROFILE_READ",
        "legacy-res-" + legacyId,
        "SUCCESS",
        Db.id(),
        Instant.parse("2026-11-23T08:00:04.000000Z"),
        null);

    // 1. First verify under REPEATABLE_READ + AUDIT_INTEGRITY_VERIFIED write.
    currentNow.set(Instant.parse("2026-11-23T08:01:00.654321Z"));
    String body1 =
        mvc.perform(post("/api/audit-events/verify").with(auditor.token()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("VERIFIED"))
            .andExpect(jsonPath("$.algorithm").value(AuditHashChain.ALGORITHM))
            .andExpect(jsonPath("$.truncated").value(false))
            .andExpect(jsonPath("$.checkedCount").value(seqBeforeVerify))
            .andExpect(jsonPath("$.totalChainedCount").value(seqBeforeVerify))
            .andExpect(jsonPath("$.headSeq").value(seqBeforeVerify))
            .andExpect(jsonPath("$.headHash").value(hashBeforeVerify))
            .andExpect(jsonPath("$.firstBrokenSeq").value(org.hamcrest.Matchers.nullValue()))
            .andExpect(jsonPath("$.firstBrokenEventId").value(org.hamcrest.Matchers.nullValue()))
            .andExpect(jsonPath("$.mismatchReason").value(org.hamcrest.Matchers.nullValue()))
            .andReturn()
            .getResponse()
            .getContentAsString(StandardCharsets.UTF_8);
    JsonNode report1 = json.readTree(body1);
    assertTrue(report1.get("legacyUnchainedCount").asLong() >= 1L);

    // Confirm AUDIT_INTEGRITY_VERIFIED was appended and chained cleanly.
    var verifiedEvent =
        db.one(
            "SELECT action,actor_id,resource_id,prev_hash,chain_seq FROM audit_event"
                + " WHERE chain_seq=?",
            seqBeforeVerify + 1);
    assertEquals("AUDIT_INTEGRITY_VERIFIED", verifiedEvent.get("action"));
    assertEquals(auditor.id(), verifiedEvent.get("actorId"));
    assertEquals("VERIFIED:" + seqBeforeVerify, verifiedEvent.get("resourceId"));
    assertEquals(hashBeforeVerify, verifiedEvent.get("prevHash"));

    // 2. Second verify immediately after proves the newly recorded AUDIT_INTEGRITY_VERIFIED row
    // itself passes DATETIME(6) round-trip verification.
    currentNow.set(Instant.parse("2026-11-23T08:01:05.111222Z"));
    mvc.perform(post("/api/audit-events/verify").with(auditor.token()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("VERIFIED"))
        .andExpect(jsonPath("$.truncated").value(false))
        .andExpect(jsonPath("$.checkedCount").value(seqBeforeVerify + 1))
        .andExpect(jsonPath("$.headSeq").value(seqBeforeVerify + 1));

    // 3. Truncated scan when maxEvents < totalChainedCount, plus maxEvents boundary validation.
    currentNow.set(Instant.parse("2026-11-23T08:01:10.000000Z"));
    mvc.perform(post("/api/audit-events/verify").param("maxEvents", "2").with(auditor.token()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("VERIFIED"))
        .andExpect(jsonPath("$.checkedCount").value(2))
        .andExpect(jsonPath("$.truncated").value(true));

    mvc.perform(post("/api/audit-events/verify").param("maxEvents", "0").with(auditor.token()))
        .andExpect(status().isBadRequest());
    mvc.perform(post("/api/audit-events/verify").param("maxEvents", "50001").with(auditor.token()))
        .andExpect(status().isBadRequest());

    // 4. Concurrent audit.record writes alongside REPEATABLE_READ verify must not deadlock or
    // corrupt the chain.
    currentNow.set(Instant.parse("2026-11-23T08:02:00.222333Z"));
    String concurrentPrefix = "concurrent-" + Db.id().substring(0, 8) + "-";
    CountDownLatch startGate = new CountDownLatch(1);
    ExecutorService pool = Executors.newFixedThreadPool(4);
    try {
      List<Future<String>> verifyFutures = new ArrayList<>();
      for (int v = 0; v < 2; v++) {
        verifyFutures.add(
            pool.submit(
                () -> {
                  startGate.await(5, TimeUnit.SECONDS);
                  return mvc.perform(post("/api/audit-events/verify").with(auditor.token()))
                      .andExpect(status().isOk())
                      .andReturn()
                      .getResponse()
                      .getContentAsString(StandardCharsets.UTF_8);
                }));
      }
      List<Future<Void>> writerFutures = new ArrayList<>();
      for (int w = 0; w < 2; w++) {
        final int worker = w;
        writerFutures.add(
            pool.submit(
                () -> {
                  startGate.await(5, TimeUnit.SECONDS);
                  for (int i = 0; i < 5; i++) {
                    final int idx = i;
                    tx.executeWithoutResult(
                        s ->
                            audit.record(
                                admin.id(),
                                "SPECIALTY_UPDATED",
                                concurrentPrefix + worker + "-" + idx));
                  }
                  return null;
                }));
      }
      startGate.countDown();
      for (var vf : verifyFutures) {
        JsonNode concurrentReport = json.readTree(vf.get(15, TimeUnit.SECONDS));
        assertEquals("VERIFIED", concurrentReport.get("status").asText());
      }
      for (var wf : writerFutures) {
        wf.get(15, TimeUnit.SECONDS);
      }
    } finally {
      pool.shutdownNow();
    }
    assertEquals(
        10L,
        db.count(
            "SELECT COUNT(*) FROM audit_event WHERE action='SPECIALTY_UPDATED'"
                + " AND resource_id LIKE ?",
            concurrentPrefix + "%"));

    // 5. Rolled-back audit_chain_head must return 200 TAMPERED / HEAD_MISMATCH (both full and
    // truncated scans) without hitting uq_audit_chain_seq 409 or mutating audit_event.
    var savedHead = db.one("SELECT last_seq,last_hash,updated_at FROM audit_chain_head WHERE id=1");
    long savedSeq = ((Number) savedHead.get("lastSeq")).longValue();
    String savedHash = savedHead.get("lastHash").toString();
    Instant savedUpdatedAt = Instant.parse(savedHead.get("updatedAt").toString());
    long totalAuditBeforeTamper = db.count("SELECT COUNT(*) FROM audit_event");
    try {
      db.update("UPDATE audit_chain_head SET last_seq=? WHERE id=1", savedSeq - 1);
      currentNow.set(Instant.parse("2026-11-23T08:02:05.000000Z"));
      mvc.perform(post("/api/audit-events/verify").with(auditor.token()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.status").value("TAMPERED"))
          .andExpect(jsonPath("$.mismatchReason").value("HEAD_MISMATCH"))
          .andExpect(jsonPath("$.firstBrokenSeq").value(savedSeq - 1))
          .andExpect(jsonPath("$.truncated").value(false));
      mvc.perform(post("/api/audit-events/verify").param("maxEvents", "2").with(auditor.token()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.status").value("TAMPERED"))
          .andExpect(jsonPath("$.mismatchReason").value("HEAD_MISMATCH"))
          .andExpect(jsonPath("$.firstBrokenSeq").value(savedSeq - 1))
          .andExpect(jsonPath("$.truncated").value(false));
      assertEquals(totalAuditBeforeTamper, db.count("SELECT COUNT(*) FROM audit_event"));
    } finally {
      db.update(
          "UPDATE audit_chain_head SET last_seq=?,last_hash=?,updated_at=? WHERE id=1",
          savedSeq,
          savedHash,
          savedUpdatedAt);
    }

    // 6. Direct JDBC UPDATE/DELETE on audit_event must be rejected by MySQL append-only triggers.
    String sampleEventId = newRows.getFirst().get("id").toString();
    DataAccessException auditUpdateEx =
        assertThrows(
            DataAccessException.class,
            () ->
                db.jdbc.update(
                    "UPDATE audit_event SET action='TAMPERED' WHERE id=?", sampleEventId));
    SQLException auditUpdateSql = findSqlException(auditUpdateEx);
    assertNotNull(auditUpdateSql);
    assertEquals("45000", auditUpdateSql.getSQLState());
    assertTrue(auditUpdateSql.getMessage().contains("Audit is append-only"));

    DataAccessException auditDeleteEx =
        assertThrows(
            DataAccessException.class,
            () -> db.jdbc.update("DELETE FROM audit_event WHERE id=?", sampleEventId));
    SQLException auditDeleteSql = findSqlException(auditDeleteEx);
    assertNotNull(auditDeleteSql);
    assertEquals("45000", auditDeleteSql.getSQLState());
    assertTrue(auditDeleteSql.getMessage().contains("Audit is append-only"));

    currentNow.set(Instant.parse("2026-11-23T08:02:10.000000Z"));
    mvc.perform(post("/api/audit-events/verify").with(auditor.token()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("VERIFIED"))
        .andExpect(jsonPath("$.truncated").value(false));
  }

  @Test
  void listSupportsKeysetPaginationVietnameseSearchFiltersAndSafeActorLabels() throws Exception {
    Account emailPatient = createAccount("PATIENT", false, "secret.patient@example.test");
    Account phoneDoctor = createAccount("DOCTOR", true, "+84 901-234-567");

    // --- Part A: Keyset cursor pagination across an identical-microsecond tie-breaker ---
    // Isolated in 2028-05-01; query uses to=2028-05-02 so AUDIT_SEARCH inserted at 09:02+
    // lands at the top of the query range on every page call.
    recordAt(Instant.parse("2028-05-01T09:00:01.000000Z"), emailPatient.id(), "APPOINTMENT_BOOKED", "pg-1");
    recordAt(Instant.parse("2028-05-01T09:00:02.000000Z"), emailPatient.id(), "APPOINTMENT_BOOKED", "pg-2");
    Instant sharedMicro = Instant.parse("2028-05-01T09:00:03.456789Z");
    recordAt(sharedMicro, phoneDoctor.id(), "RECORD_DRAFT", "pg-3a");
    recordAt(sharedMicro, phoneDoctor.id(), "RECORD_FINAL", "pg-3b");
    recordAt(Instant.parse("2028-05-01T09:00:05.000000Z"), auditor.id(), "ROLES_CHANGED", "pg-5");

    var seededPgRows =
        db.list(
            "SELECT id FROM audit_event WHERE created_at>=? AND created_at<?",
            Instant.parse("2028-05-01T09:00:00Z"),
            Instant.parse("2028-05-01T09:01:00Z"));
    assertEquals(5, seededPgRows.size());
    Set<String> expectedPgIds = new HashSet<>();
    for (var r : seededPgRows) expectedPgIds.add(r.get("id").toString());

    long auditSearchBefore =
        db.count(
            "SELECT COUNT(*) FROM audit_event WHERE actor_id=? AND action='AUDIT_SEARCH'",
            auditor.id());

    List<String> collectedIds = new ArrayList<>();
    Set<String> uniqueIds = new HashSet<>();
    String cursorCreatedAt = null;
    String cursorId = null;
    Instant prevTs = null;
    String prevId = null;
    int pagesFetched = 0;

    for (int page = 0; page < 5; page++) {
      currentNow.set(Instant.parse("2028-05-01T09:02:00Z").plusSeconds(page));
      var req =
          get("/api/audit-events")
              .with(auditor.token())
              .param("from", "2028-05-01T09:00:00Z")
              .param("to", "2028-05-02T00:00:00Z")
              .param("limit", "2");
      if (cursorCreatedAt != null) {
        req.param("cursorCreatedAt", cursorCreatedAt).param("cursorId", cursorId);
      }
      String resp =
          mvc.perform(req)
              .andExpect(status().isOk())
              .andReturn()
              .getResponse()
              .getContentAsString(StandardCharsets.UTF_8);
      JsonNode arr = json.readTree(resp);
      pagesFetched++;
      if (arr.isEmpty()) break;

      for (JsonNode item : arr) {
        String id = item.get("id").asText();
        Instant ts = Instant.parse(item.get("createdAt").asText());
        assertTrue(uniqueIds.add(id), "Duplicate event across keyset pages: " + id);
        if (prevTs != null) {
          assertTrue(
              ts.isBefore(prevTs) || (ts.equals(prevTs) && id.compareTo(prevId) < 0),
              "Expected strictly descending (createdAt, id) order across pages");
        }
        prevTs = ts;
        prevId = id;
        collectedIds.add(id);
      }
      JsonNode last = arr.get(arr.size() - 1);
      cursorCreatedAt = last.get("createdAt").asText();
      cursorId = last.get("id").asText();
    }

    assertEquals(expectedPgIds, uniqueIds);
    assertEquals(5, collectedIds.size());
    long auditSearchAfter =
        db.count(
            "SELECT COUNT(*) FROM audit_event WHERE actor_id=? AND action='AUDIT_SEARCH'",
            auditor.id());
    assertEquals(auditSearchBefore + pagesFetched, auditSearchAfter);

    // Invalid cursor pagination parameters are rejected with 400.
    mvc.perform(
            get("/api/audit-events")
                .with(auditor.token())
                .param("cursorCreatedAt", "2028-05-01T09:00:05Z"))
        .andExpect(status().isBadRequest());
    mvc.perform(
            get("/api/audit-events")
                .with(auditor.token())
                .param("cursorCreatedAt", "2028-05-01T09:00:05Z")
                .param("cursorId", Db.id())
                .param("offset", "1"))
        .andExpect(status().isBadRequest());

    // --- Part B: Vietnamese search, filters, excludeReadNoise, and safe actorLabel ---
    // Isolated in 2028-06-01.
    recordAt(Instant.parse("2028-06-01T10:00:01Z"), emailPatient.id(), "RECORD_AMENDED", "vn-rec-1");
    recordAt(Instant.parse("2028-06-01T10:00:02Z"), phoneDoctor.id(), "RECORD_FINAL", "vn-rec-2");
    recordAt(Instant.parse("2028-06-01T10:00:03Z"), phoneDoctor.id(), "PRESCRIPTION_ISSUED", "vn-rx-1");
    recordAt(Instant.parse("2028-06-01T10:00:04Z"), emailPatient.id(), "APPOINTMENT_BOOKED", "vn-apt-1");
    deniedAt(Instant.parse("2028-06-01T10:00:05Z"), emailPatient.id(), "TELEHEALTH_JOINED", "vn-tele-1");
    recordAt(Instant.parse("2028-06-01T10:00:06Z"), null, "NOTIFICATION_SENT", "vn-noti-1");
    recordAt(Instant.parse("2028-06-01T10:00:07Z"), auditor.id(), "PROFILE_READ", "vn-prof-1");
    recordAt(
        Instant.parse("2028-06-01T10:00:08Z"),
        admin.id(),
        "PATIENT_ACCOUNT_LOCKED_SECURITY_REVIEW",
        "vn-lock-1");

    currentNow.set(Instant.parse("2028-06-01T10:05:00Z"));

    // Accented Vietnamese keyword search ("bệnh án")
    JsonNode vnAccented =
        json.readTree(
            mvc.perform(
                    get("/api/audit-events")
                        .with(auditor.token())
                        .characterEncoding(StandardCharsets.UTF_8)
                        .param("from", "2028-06-01T10:00:00Z")
                        .param("to", "2028-06-01T10:01:00Z")
                        .param("action", "bệnh án"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8));
    assertEquals(2, vnAccented.size());
    assertEquals(Set.of("RECORD_AMENDED", "RECORD_FINAL"), extractField(vnAccented, "action"));

    // Verify safe actorLabel enrichment on email-like and phone-like usernames
    Map<String, JsonNode> byAction = new HashMap<>();
    for (JsonNode n : vnAccented) byAction.put(n.get("action").asText(), n);

    JsonNode emailRow = byAction.get("RECORD_AMENDED");
    String expectedPatientLabel =
        "user-" + emailPatient.id().substring(emailPatient.id().length() - 8);
    assertEquals(expectedPatientLabel, emailRow.get("actorLabel").asText());
    assertFalse(emailRow.get("actorLabel").asText().contains("@"));
    assertFalse(emailRow.has("accountUsername"));
    assertFalse(emailRow.has("accountStaff"));

    JsonNode phoneRow = byAction.get("RECORD_FINAL");
    String expectedDoctorLabel =
        "staff-" + phoneDoctor.id().substring(phoneDoctor.id().length() - 8);
    assertEquals(expectedDoctorLabel, phoneRow.get("actorLabel").asText());

    // Unaccented Vietnamese keyword search ("don thuoc")
    JsonNode vnUnaccented =
        json.readTree(
            mvc.perform(
                    get("/api/audit-events")
                        .with(auditor.token())
                        .characterEncoding(StandardCharsets.UTF_8)
                        .param("from", "2028-06-01T10:00:00Z")
                        .param("to", "2028-06-01T10:01:00Z")
                        .param("action", "don thuoc"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8));
    assertEquals(1, vnUnaccented.size());
    assertEquals("PRESCRIPTION_ISSUED", vnUnaccented.get(0).get("action").asText());
    assertEquals("vn-rx-1", vnUnaccented.get(0).get("resourceId").asText());

    // Contextual Vietnamese search ("từ chối tham gia") -> TELEHEALTH_JOINED
    JsonNode vnDenied =
        json.readTree(
            mvc.perform(
                    get("/api/audit-events")
                        .with(auditor.token())
                        .characterEncoding(StandardCharsets.UTF_8)
                        .param("from", "2028-06-01T10:00:00Z")
                        .param("to", "2028-06-01T10:01:00Z")
                        .param("action", "từ chối tham gia"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8));
    assertEquals(1, vnDenied.size());
    assertEquals("TELEHEALTH_JOINED", vnDenied.get(0).get("action").asText());

    // category=CLINICAL
    JsonNode clinical =
        json.readTree(
            mvc.perform(
                    get("/api/audit-events")
                        .with(auditor.token())
                        .param("from", "2028-06-01T10:00:00Z")
                        .param("to", "2028-06-01T10:01:00Z")
                        .param("category", "CLINICAL"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8));
    assertEquals(
        Set.of("RECORD_AMENDED", "RECORD_FINAL", "PRESCRIPTION_ISSUED"),
        extractField(clinical, "action"));

    // result=DENIED
    JsonNode deniedOnly =
        json.readTree(
            mvc.perform(
                    get("/api/audit-events")
                        .with(auditor.token())
                        .param("from", "2028-06-01T10:00:00Z")
                        .param("to", "2028-06-01T10:01:00Z")
                        .param("result", "DENIED"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8));
    assertEquals(1, deniedOnly.size());
    assertEquals("vn-tele-1", deniedOnly.get(0).get("resourceId").asText());

    // actorType=SYSTEM
    JsonNode systemOnly =
        json.readTree(
            mvc.perform(
                    get("/api/audit-events")
                        .with(auditor.token())
                        .param("from", "2028-06-01T10:00:00Z")
                        .param("to", "2028-06-01T10:01:00Z")
                        .param("actorType", "SYSTEM"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8));
    assertEquals(1, systemOnly.size());
    assertEquals("clinic-background-worker", systemOnly.get(0).get("actorLabel").asText());

    // Safe non-email username passes through directly
    JsonNode profileRow =
        json.readTree(
            mvc.perform(
                    get("/api/audit-events")
                        .with(auditor.token())
                        .param("from", "2028-06-01T10:00:00Z")
                        .param("to", "2028-06-01T10:01:00Z")
                        .param("action", "PROFILE_READ"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8));
    assertEquals(1, profileRow.size());
    assertEquals("auditor_main", profileRow.get(0).get("actorLabel").asText());

    // Prefix action search ("RECORD_") exercises LIKE ? ESCAPE '!' on MySQL 8.4
    JsonNode prefixRows =
        json.readTree(
            mvc.perform(
                    get("/api/audit-events")
                        .with(auditor.token())
                        .param("from", "2028-06-01T10:00:00Z")
                        .param("to", "2028-06-01T10:01:00Z")
                        .param("action", "RECORD_"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8));
    assertEquals(Set.of("RECORD_AMENDED", "RECORD_FINAL"), extractField(prefixRows, "action"));

    // Unmatched action substring exercises pure LOCATE(?, LOWER(a.action)) > 0 fallback on MySQL 8.4
    JsonNode unknownSubstr =
        json.readTree(
            mvc.perform(
                    get("/api/audit-events")
                        .with(auditor.token())
                        .param("from", "2028-06-01T10:00:00Z")
                        .param("to", "2028-06-01T10:01:00Z")
                        .param("action", "zzz_no_match_token"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8));
    assertEquals(0, unknownSubstr.size());

    // category=ACCESS_CONTROL matches PATIENT_ACCOUNT_LOCKED_% on MySQL 8.4
    var accessControlResult =
        mvc.perform(
                get("/api/audit-events")
                    .with(auditor.token())
                    .param("from", "2028-06-01T10:00:00Z")
                    .param("to", "2028-06-01T10:01:00Z")
                    .param("category", "ACCESS_CONTROL"))
            .andExpect(status().isOk())
            .andReturn();
    JsonNode accessControl =
        json.readTree(accessControlResult.getResponse().getContentAsString(StandardCharsets.UTF_8));
    assertEquals(1, accessControl.size());
    assertEquals("PATIENT_ACCOUNT_LOCKED_SECURITY_REVIEW", accessControl.get(0).get("action").asText());
    String requestCorrelationId = accessControlResult.getResponse().getHeader("X-Request-Id");
    assertNotNull(requestCorrelationId);

    // actorId, resourceId, correlationId, and offset pagination filters on MySQL 8.4
    JsonNode byActorAndResource =
        json.readTree(
            mvc.perform(
                    get("/api/audit-events")
                        .with(auditor.token())
                        .param("from", "2028-06-01T10:00:00Z")
                        .param("to", "2028-06-01T10:01:00Z")
                        .param("actorId", admin.id())
                        .param("resourceId", "vn-lock-1"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8));
    assertEquals(1, byActorAndResource.size());
    assertEquals("vn-lock-1", byActorAndResource.get(0).get("resourceId").asText());

    JsonNode byCorrelation =
        json.readTree(
            mvc.perform(
                    get("/api/audit-events")
                        .with(auditor.token())
                        .param("correlationId", requestCorrelationId))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8));
    assertEquals(1, byCorrelation.size());
    assertEquals("AUDIT_SEARCH", byCorrelation.get(0).get("action").asText());

    JsonNode offsetPage =
        json.readTree(
            mvc.perform(
                    get("/api/audit-events")
                        .with(auditor.token())
                        .param("from", "2028-06-01T10:00:00Z")
                        .param("to", "2028-06-01T10:01:00Z")
                        .param("limit", "2")
                        .param("offset", "1"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8));
    assertEquals(2, offsetPage.size());
    assertEquals("vn-prof-1", offsetPage.get(0).get("resourceId").asText());

    // excludeReadNoise=true over a range that includes both PROFILE_READ and prior AUDIT_SEARCH rows
    JsonNode noNoise =
        json.readTree(
            mvc.perform(
                    get("/api/audit-events")
                        .with(auditor.token())
                        .param("from", "2028-06-01T10:00:00Z")
                        .param("to", "2028-06-02T00:00:00Z")
                        .param("excludeReadNoise", "true"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8));
    assertEquals(7, noNoise.size());
    Set<String> noNoiseActions = extractField(noNoise, "action");
    for (String noise : AuditActionCatalog.READ_NOISE_ACTIONS) {
      assertFalse(noNoiseActions.contains(noise), "Unexpected read noise action: " + noise);
    }
  }

  @Test
  void summaryReturnsExactCountsForPopulatedAndZeroMatchFilters() throws Exception {
    // Isolated in 2028-03-01.
    recordAt(Instant.parse("2028-03-01T10:00:01Z"), auditor.id(), "RECORD_AMENDED", "sum-1");
    recordAt(Instant.parse("2028-03-01T10:00:02Z"), admin.id(), "ROLES_CHANGED", "sum-2");
    deniedAt(Instant.parse("2028-03-01T10:00:03Z"), patient.id(), "TELEHEALTH_JOINED", "sum-3");
    recordAt(Instant.parse("2028-03-01T10:00:04Z"), null, "NOTIFICATION_SENT", "sum-4");
    // Unchained SYSTEM FAILURE row (chain_seq/event_hash = NULL) exercises legacyUnchainedEvents
    // and failureEvents without breaking the hash chain.
    db.update(
        "INSERT INTO audit_event(id,actor_id,actor_type,action,resource_id,result,correlation_id,"
            + "created_at,actor_label) VALUES(?,?,?,?,?,?,?,?,?)",
        Db.id(),
        null,
        "SYSTEM",
        "NOTIFICATION_FAILED",
        "sum-5",
        "FAILURE",
        Db.id(),
        Instant.parse("2028-03-01T10:00:05.123456Z"),
        "clinic-background-worker");

    long auditCountBefore = db.count("SELECT COUNT(*) FROM audit_event");

    mvc.perform(
            get("/api/audit-events/summary")
                .with(auditor.token())
                .param("from", "2028-03-01T10:00:00Z")
                .param("to", "2028-03-01T10:01:00Z"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalEvents").value(5))
        .andExpect(jsonPath("$.deniedEvents").value(1))
        .andExpect(jsonPath("$.failureEvents").value(1))
        .andExpect(jsonPath("$.accessControlEvents").value(1))
        .andExpect(jsonPath("$.recordAmendedEvents").value(1))
        .andExpect(jsonPath("$.systemEvents").value(2))
        .andExpect(jsonPath("$.chainedEvents").value(4))
        .andExpect(jsonPath("$.legacyUnchainedEvents").value(1))
        .andExpect(jsonPath("$.latestEventAt").value("2028-03-01T10:00:05.123456Z"));

    // Zero-match filter verifies COALESCE(SUM(...), 0) maps cleanly to 0 and latestEventAt to null.
    mvc.perform(
            get("/api/audit-events/summary")
                .with(auditor.token())
                .param("resourceId", "zero-match-" + Db.id()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalEvents").value(0))
        .andExpect(jsonPath("$.deniedEvents").value(0))
        .andExpect(jsonPath("$.failureEvents").value(0))
        .andExpect(jsonPath("$.accessControlEvents").value(0))
        .andExpect(jsonPath("$.recordAmendedEvents").value(0))
        .andExpect(jsonPath("$.systemEvents").value(0))
        .andExpect(jsonPath("$.chainedEvents").value(0))
        .andExpect(jsonPath("$.legacyUnchainedEvents").value(0))
        .andExpect(jsonPath("$.latestEventAt").value(org.hamcrest.Matchers.nullValue()));

    // Summary is read-only and must not emit AUDIT_SEARCH rows.
    assertEquals(auditCountBefore, db.count("SELECT COUNT(*) FROM audit_event"));
  }

  @Test
  void exportReturnsUtf8BomCsvWithNeutralizedFormulasSha256AndAuditTrail() throws Exception {
    Account emailPatient = createAccount("PATIENT", false, "export.leak@example.test");

    // Isolated in 2028-04-01.
    recordAt(
        Instant.parse("2028-04-01T11:00:01.111111Z"),
        emailPatient.id(),
        "RECORD_AMENDED",
        "=HYPERLINK(\"http://evil.test\")");
    deniedAt(
        Instant.parse("2028-04-01T11:00:02.222222Z"),
        auditor.id(),
        "TELEHEALTH_JOINED",
        "+1+2");
    recordAt(
        Instant.parse("2028-04-01T11:00:03.333333Z"),
        auditor.id(),
        "PRESCRIPTION_ISSUED",
        "-SUM(A1)");

    var seeded =
        db.list(
            "SELECT id FROM audit_event WHERE created_at>=? AND created_at<?",
            Instant.parse("2028-04-01T11:00:00Z"),
            Instant.parse("2028-04-01T11:01:00Z"));
    assertEquals(3, seeded.size());

    currentNow.set(Instant.parse("2028-04-01T11:05:00Z"));
    String responseBody =
        mvc.perform(
                get("/api/audit-events/export")
                    .with(auditor.token())
                    .param("from", "2028-04-01T11:00:00Z")
                    .param("to", "2028-04-01T11:01:00Z"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.filename").value("cliniccare-audit-20280401-110500.csv"))
            .andExpect(jsonPath("$.contentType").value("text/csv;charset=utf-8"))
            .andExpect(jsonPath("$.rowCount").value(3))
            .andExpect(jsonPath("$.truncated").value(false))
            .andReturn()
            .getResponse()
            .getContentAsString(StandardCharsets.UTF_8);

    JsonNode body = json.readTree(responseBody);
    String csv = body.get("csv").asText();
    String reportedSha = body.get("contentSha256").asText();

    assertTrue(csv.startsWith("\uFEFF"), "CSV must start with UTF-8 BOM");
    String[] lines = csv.substring(1).split("\r\n");
    assertEquals(4, lines.length, "Expected 1 header row + 3 data rows");
    String expectedHeader =
        "STT chuỗi,Mã sự kiện (UUID),Thời điểm (UTC),Mã hành động,Hành động (tiếng Việt),Kết quả,"
            + "Loại tác nhân,Nhãn tác nhân,Mã tác nhân (UUID),Mã đối tượng,"
            + "Correlation ID,Mã băm sự kiện (event_hash),Mã băm liền trước (prev_hash)";
    assertEquals(expectedHeader, lines[0]);
    assertEquals(13, lines[0].split(",").length);

    for (var row : seeded) {
      assertTrue(csv.contains("," + row.get("id") + ","), "CSV missing event UUID " + row.get("id"));
    }
    assertTrue(csv.contains("Chỉnh sửa bổ sung bệnh án"));
    assertTrue(csv.contains("Từ chối tham gia phòng khám từ xa"));
    assertTrue(csv.contains("Phát hành đơn thuốc"));
    assertTrue(csv.contains("Thành công"));
    assertTrue(csv.contains("Bị từ chối"));
    assertTrue(csv.contains("\"'=HYPERLINK(\"\"http://evil.test\"\")\""));
    assertTrue(csv.contains(",'+1+2,"));
    assertTrue(csv.contains(",'-SUM(A1),"));
    assertFalse(csv.contains("export.leak@example.test"), "Email must never leak in exported CSV");

    String computedSha = sha256Hex(csv);
    assertEquals(computedSha, reportedSha);

    // Verify AUDIT_EXPORT event was recorded with exact row count and hash prefix.
    assertEquals(
        1L,
        db.count(
            "SELECT COUNT(*) FROM audit_event WHERE actor_id=? AND action='AUDIT_EXPORT'"
                + " AND resource_id=?",
            auditor.id(),
            "export:3:" + reportedSha.substring(0, 12)));

    // Truncated export when maxRows < matched rows, and 400 for invalid maxRows.
    mvc.perform(
            get("/api/audit-events/export")
                .with(auditor.token())
                .param("from", "2028-04-01T11:00:00Z")
                .param("to", "2028-04-01T11:01:00Z")
                .param("maxRows", "2"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.rowCount").value(2))
        .andExpect(jsonPath("$.maxRows").value(2))
        .andExpect(jsonPath("$.truncated").value(true));

    mvc.perform(
            get("/api/audit-events/export").with(auditor.token()).param("maxRows", "0"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void retentionAndArchiveSealImmutableBatchAndEnforceTriggers() throws Exception {
    // Seed 8 chained events in the exact same microsecond (proving firstChainSeq/lastChainSeq use
    // min/max rather than random UUID order), 1 chained event the next day, and 1 legacy unchained
    // event right on the 2020-06-01 boundary (for Batch 2 tiling + NULL chain_seq round-trip).
    Instant ev1At = Instant.parse("2020-01-15T06:00:00.123456Z");
    Instant ev2At = Instant.parse("2020-01-16T07:30:00.654321Z");
    Instant boundaryAt = Instant.parse("2020-06-01T00:00:00.000000Z");
    for (int i = 0; i < 8; i++) {
      recordAt(ev1At, admin.id(), "APPOINTMENT_BOOKED", "arch-2020-same-" + i);
    }
    recordAt(ev2At, admin.id(), "RECORD_FINAL", "arch-2020-2");
    db.update(
        "INSERT INTO audit_event(id,actor_id,actor_type,action,resource_id,result,correlation_id,"
            + "created_at,actor_label) VALUES(?,?,?,?,?,?,?,?,?)",
        Db.id(),
        null,
        "SYSTEM",
        "NOTIFICATION_SENT",
        "arch-2020-boundary-legacy",
        "SUCCESS",
        Db.id(),
        boundaryAt,
        "clinic-background-worker");

    Instant now = Instant.parse("2026-11-23T12:00:00Z");
    currentNow.set(now);

    mvc.perform(get("/api/audit-events/retention").with(auditor.token()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.hotRetentionDays").value(365))
        .andExpect(jsonPath("$.archiveRetentionDays").value(1825))
        .andExpect(jsonPath("$.exportMaxRows").value(5000))
        .andExpect(jsonPath("$.deletionPolicy").value(AuditService.DELETION_POLICY))
        .andExpect(jsonPath("$.eligibleForArchiveCount").value(10))
        .andExpect(jsonPath("$.archiveBatchCount").value(0))
        .andExpect(jsonPath("$.oldestEventAt").value("2020-01-15T06:00:00.123456Z"))
        .andExpect(jsonPath("$.recentBatches.length()").value(0));

    Instant beforeCutoff = boundaryAt;
    String archiveBody =
        mvc.perform(
                post("/api/audit-events/archive")
                    .with(auditor.token())
                    .characterEncoding(StandardCharsets.UTF_8)
                    .contentType("application/json")
                    .content(
                        """
                        {"before":"2020-06-01T00:00:00Z","notes":"Lưu trữ kiểm toán 2020"}
                        """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.fromCreatedAt").value("2020-01-15T06:00:00.123456Z"))
            .andExpect(jsonPath("$.toCreatedAt").value("2020-06-01T00:00:00Z"))
            .andExpect(jsonPath("$.eventCount").value(9))
            .andExpect(jsonPath("$.retentionDays").value(1825))
            .andExpect(jsonPath("$.createdBy").value(auditor.id()))
            .andExpect(jsonPath("$.notes").value("Lưu trữ kiểm toán 2020"))
            .andReturn()
            .getResponse()
            .getContentAsString(StandardCharsets.UTF_8);

    JsonNode batch = json.readTree(archiveBody);
    String batchId = batch.get("id").asText();
    String reportedBatchHash = batch.get("batchHash").asText();
    assertEquals(64, reportedBatchHash.length());
    var seqBounds =
        db.one(
            "SELECT MIN(chain_seq) AS min_seq, MAX(chain_seq) AS max_seq"
                + " FROM audit_event WHERE created_at<?",
            beforeCutoff);
    assertEquals(
        ((Number) seqBounds.get("minSeq")).longValue(), batch.get("firstChainSeq").asLong());
    assertEquals(
        ((Number) seqBounds.get("maxSeq")).longValue(), batch.get("lastChainSeq").asLong());
    assertEquals(batch.get("firstChainSeq").asLong() + 8, batch.get("lastChainSeq").asLong());

    // Recompute batchHash directly from the archived rows in MySQL.
    var archivedEvents =
        db.list(
            "SELECT id,chain_seq,event_hash,created_at,action,result FROM audit_event"
                + " WHERE created_at<? ORDER BY created_at ASC,id ASC",
            beforeCutoff);
    assertEquals(9, archivedEvents.size());
    String expectedBatchHash =
        AuditHashChain.computeBatchHash(crypto, ev1At, beforeCutoff, archivedEvents);
    assertEquals(expectedBatchHash, reportedBatchHash);

    // Verify AUDIT_ARCHIVE_CREATED event was recorded.
    assertEquals(
        1L,
        db.count(
            "SELECT COUNT(*) FROM audit_event WHERE actor_id=? AND action='AUDIT_ARCHIVE_CREATED'"
                + " AND resource_id=?",
            auditor.id(),
            batchId));

    // Subsequent retention call exercises MAX(to_created_at) -> Instant.parse and
    // WHERE created_at>=? AND created_at<? (1 boundary legacy event still eligible).
    mvc.perform(get("/api/audit-events/retention").with(auditor.token()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.archiveBatchCount").value(1))
        .andExpect(jsonPath("$.eligibleForArchiveCount").value(1))
        .andExpect(jsonPath("$.recentBatches.length()").value(1))
        .andExpect(jsonPath("$.recentBatches[0].id").value(batchId))
        .andExpect(jsonPath("$.recentBatches[0].batchHash").value(reportedBatchHash));

    // Overlapping re-archive rejected with 409.
    mvc.perform(
            post("/api/audit-events/archive")
                .with(auditor.token())
                .contentType("application/json")
                .content("{\"before\":\"2020-06-01T00:00:00Z\",\"notes\":\"overlap\"}"))
        .andExpect(status().isConflict());

    // Batch 2 with omitted `before` uses default 365-day hot cutoff, tiles cleanly from
    // prevBoundary (2020-06-01T00:00:00Z), and seals legacy NULL chain_seq bounds cleanly.
    currentNow.set(Instant.parse("2026-11-23T12:00:05Z"));
    mvc.perform(
            post("/api/audit-events/archive")
                .with(auditor.token())
                .contentType("application/json")
                .content("{}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.fromCreatedAt").value("2020-06-01T00:00:00Z"))
        .andExpect(jsonPath("$.toCreatedAt").value("2025-11-23T12:00:05Z"))
        .andExpect(jsonPath("$.eventCount").value(1))
        .andExpect(jsonPath("$.firstChainSeq").value(org.hamcrest.Matchers.nullValue()))
        .andExpect(jsonPath("$.lastChainSeq").value(org.hamcrest.Matchers.nullValue()));

    mvc.perform(get("/api/audit-events/retention").with(auditor.token()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.archiveBatchCount").value(2))
        .andExpect(jsonPath("$.eligibleForArchiveCount").value(0))
        .andExpect(jsonPath("$.recentBatches.length()").value(2));

    // Empty subsequent window rejected with 409.
    mvc.perform(
            post("/api/audit-events/archive")
                .with(auditor.token())
                .contentType("application/json")
                .content("{\"before\":\"2025-12-01T00:00:00Z\",\"notes\":\"empty\"}"))
        .andExpect(status().isConflict());

    // Future before timestamp rejected with 400.
    mvc.perform(
            post("/api/audit-events/archive")
                .with(auditor.token())
                .contentType("application/json")
                .content("{\"before\":\"2026-11-24T00:00:00Z\"}"))
        .andExpect(status().isBadRequest());

    // Direct JDBC UPDATE and DELETE must be blocked by MySQL immutability triggers.
    DataAccessException updateEx =
        assertThrows(
            DataAccessException.class,
            () ->
                db.jdbc.update(
                    "UPDATE audit_archive_batch SET notes='tampered' WHERE id=?", batchId));
    SQLException updateSql = findSqlException(updateEx);
    assertNotNull(updateSql, "Expected underlying SQLException from UPDATE trigger");
    assertEquals("45000", updateSql.getSQLState());
    assertTrue(
        updateSql.getMessage().contains("Audit archive batches are immutable"),
        "Unexpected UPDATE trigger message: " + updateSql.getMessage());

    DataAccessException deleteEx =
        assertThrows(
            DataAccessException.class,
            () -> db.jdbc.update("DELETE FROM audit_archive_batch WHERE id=?", batchId));
    SQLException deleteSql = findSqlException(deleteEx);
    assertNotNull(deleteSql, "Expected underlying SQLException from DELETE trigger");
    assertEquals("45000", deleteSql.getSQLState());
    assertTrue(
        deleteSql.getMessage().contains("Audit archive batches are immutable"),
        "Unexpected DELETE trigger message: " + deleteSql.getMessage());

    // Confirm row remained completely intact.
    assertEquals(
        "Lưu trữ kiểm toán 2020",
        db.one("SELECT notes FROM audit_archive_batch WHERE id=?", batchId).get("notes"));
  }

  @Test
  void nonAuditorAndAnonymousAreRejectedOnAllSixEndpoints() throws Exception {
    for (Account nonAuditor : List.of(admin, patient)) {
      mvc.perform(get("/api/audit-events").with(nonAuditor.token()))
          .andExpect(status().isForbidden());
      mvc.perform(get("/api/audit-events/summary").with(nonAuditor.token()))
          .andExpect(status().isForbidden());
      mvc.perform(get("/api/audit-events/export").with(nonAuditor.token()))
          .andExpect(status().isForbidden());
      mvc.perform(post("/api/audit-events/verify").with(nonAuditor.token()))
          .andExpect(status().isForbidden());
      mvc.perform(get("/api/audit-events/retention").with(nonAuditor.token()))
          .andExpect(status().isForbidden());
      mvc.perform(
              post("/api/audit-events/archive")
                  .with(nonAuditor.token())
                  .contentType("application/json")
                  .content("{}"))
          .andExpect(status().isForbidden());
    }

    mvc.perform(get("/api/audit-events")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/audit-events/summary")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/audit-events/export")).andExpect(status().isUnauthorized());
    mvc.perform(post("/api/audit-events/verify")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/audit-events/retention")).andExpect(status().isUnauthorized());
    mvc.perform(post("/api/audit-events/archive").contentType("application/json").content("{}"))
        .andExpect(status().isUnauthorized());
  }

  private static Set<String> extractField(JsonNode array, String field) {
    Set<String> out = new HashSet<>();
    for (JsonNode item : array) {
      out.add(item.get(field).asText());
    }
    return out;
  }

  private static SQLException findSqlException(Throwable t) {
    Throwable cur = t;
    while (cur != null) {
      if (cur instanceof SQLException sqlEx) return sqlEx;
      cur = cur.getCause();
    }
    return null;
  }

  private static String sha256Hex(String content) throws Exception {
    byte[] digest =
        MessageDigest.getInstance("SHA-256").digest(content.getBytes(StandardCharsets.UTF_8));
    return HexFormat.of().formatHex(digest);
  }
}
