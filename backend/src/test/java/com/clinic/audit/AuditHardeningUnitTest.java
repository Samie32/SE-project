package com.clinic.audit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.clinic.auth.Access;
import com.clinic.common.Crypto;
import com.clinic.common.Db;
import com.clinic.common.Problem;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

class AuditHardeningUnitTest {
  private static final Instant NOW = Instant.parse("2026-11-23T09:00:00.123456789Z");
  private static final Clock FIXED_CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);
  private static final Crypto CRYPTO =
      new Crypto(Base64.getEncoder().encodeToString(new byte[32]));
  private static final Access.Actor AUDITOR =
      new Access.Actor("00000000-0000-0000-0000-000000000006", Set.of("AUDITOR"));
  private static final Access.Actor ADMIN =
      new Access.Actor("00000000-0000-0000-0000-000000000001", Set.of("ADMINISTRATOR"));

  @Test
  void cryptoAuditMacUsesSeparateDerivedKeyFromBlindIndex() {
    String blindHash = CRYPTO.hash("audit-sample");
    String auditMac = CRYPTO.auditMac("audit-sample");

    assertEquals(64, auditMac.length());
    assertEquals(auditMac, CRYPTO.auditMac("audit-sample"));
    assertNotEquals(blindHash, auditMac);
  }

  @Test
  void actionCatalogTranslatesVietnameseSanitizesActorsAndNeutralizesCsvInjection() {
    assertEquals("Chỉnh sửa bổ sung bệnh án", AuditActionCatalog.labelVi("RECORD_AMENDED"));
    assertEquals("Thay đổi phân quyền nhân sự", AuditActionCatalog.labelVi("ROLES_CHANGED"));
    assertEquals(
        "Từ chối tham gia phòng khám từ xa",
        AuditActionCatalog.labelVi("TELEHEALTH_JOINED", "DENIED"));
    assertEquals(
        "Tham gia phòng khám từ xa",
        AuditActionCatalog.labelVi("TELEHEALTH_JOINED", "SUCCESS"));
    assertEquals(
        "Khóa tài khoản bệnh nhân (Rà soát bảo mật)",
        AuditActionCatalog.labelVi("PATIENT_ACCOUNT_LOCKED_SECURITY_REVIEW"));
    assertEquals(
        "Mở khóa tài khoản bệnh nhân (Yêu cầu bệnh nhân)",
        AuditActionCatalog.labelVi("PATIENT_ACCOUNT_UNLOCKED_PATIENT_REQUEST"));
    assertEquals(
        "Khóa tài khoản bệnh nhân (CUSTOM_REASON)",
        AuditActionCatalog.labelVi("PATIENT_ACCOUNT_LOCKED_CUSTOM_REASON"));
    assertEquals(
        "Mở khóa tài khoản bệnh nhân (CUSTOM_REASON)",
        AuditActionCatalog.labelVi("PATIENT_ACCOUNT_UNLOCKED_CUSTOM_REASON"));
    assertEquals("CUSTOM_FUTURE_EVENT", AuditActionCatalog.labelVi("CUSTOM_FUTURE_EVENT"));
    assertEquals("", AuditActionCatalog.labelVi(" "));

    // Vietnamese keyword action matching (accent-insensitive)
    var recordMatches = AuditActionCatalog.matchActions("bệnh án");
    assertTrue(recordMatches.contains("RECORD_AMENDED"));
    assertTrue(recordMatches.contains("PATIENT_RECORDS_READ"));
    assertTrue(AuditActionCatalog.matchActions("don thuoc").contains("PRESCRIPTION_ISSUED"));
    assertTrue(
        AuditActionCatalog.matchActions("khóa tài khoản")
            .contains("PATIENT_ACCOUNT_LOCKED_SECURITY_REVIEW"));
    assertTrue(AuditActionCatalog.matchActions("từ chối tham gia").contains("TELEHEALTH_JOINED"));
    assertTrue(AuditActionCatalog.matchActions("   ").isEmpty());
    assertTrue(AuditActionCatalog.matchActions("zzzz_nonexistent_keyword").isEmpty());

    assertEquals("Thành công", AuditActionCatalog.resultVi("SUCCESS"));
    assertEquals("Bị từ chối", AuditActionCatalog.resultVi("DENIED"));
    assertEquals("Thất bại", AuditActionCatalog.resultVi("FAILURE"));
    assertEquals("", AuditActionCatalog.resultVi(null));

    assertTrue(AuditActionCatalog.isKnownExactAction("RECORD_AMENDED"));
    assertTrue(AuditActionCatalog.isKnownExactAction("PATIENT_ACCOUNT_LOCKED_SECURITY_REVIEW"));
    assertTrue(AuditActionCatalog.isKnownExactAction("PATIENT_ACCOUNT_UNLOCKED_POLICY_REVIEW"));
    assertFalse(AuditActionCatalog.isKnownExactAction("CREATED"));

    // Safe actor labels must never expose email or phone numbers.
    assertEquals(
        "clinic-background-worker",
        AuditActionCatalog.sanitizeActorLabel("SYSTEM", null, null, false, null));
    assertEquals(
        "notification-worker",
        AuditActionCatalog.sanitizeActorLabel("SYSTEM", "notification-worker", null, false, null));
    assertEquals(
        "auditor",
        AuditActionCatalog.sanitizeActorLabel(
            "USER", null, "auditor", true, "00000000-0000-0000-0000-000000000006"));
    assertEquals(
        "user-00000003",
        AuditActionCatalog.sanitizeActorLabel(
            "USER", null, "patient@gmail.com", false, "00000000-0000-0000-0000-000000000003"));
    assertEquals(
        "staff-00000002",
        AuditActionCatalog.sanitizeActorLabel(
            "USER", null, "+84 901-234-567", true, "00000000-0000-0000-0000-000000000002"));
    assertEquals(
        "stored-safe",
        AuditActionCatalog.sanitizeActorLabel("USER", "stored-safe", "ignored", true, "id"));
    assertEquals("user", AuditActionCatalog.sanitizeActorLabel("USER", null, null, false, "short"));

    // RFC-4180 + formula injection neutralization.
    assertEquals("'=CMD()", AuditActionCatalog.csvCell("=CMD()"));
    assertEquals("'+1+2", AuditActionCatalog.csvCell("+1+2"));
    assertEquals("'-SUM(A1)", AuditActionCatalog.csvCell("-SUM(A1)"));
    assertEquals("'@HYPERLINK", AuditActionCatalog.csvCell("@HYPERLINK"));
    assertEquals("'  =1+1", AuditActionCatalog.csvCell("  =1+1"));
    assertEquals("\"a, \"\"b\"\"\nc\"", AuditActionCatalog.csvCell("a, \"b\"\nc"));
    assertEquals("", AuditActionCatalog.csvCell(null));
  }

  @Test
  void hashChainNormalizesMicrosAndDetectsFieldTampering() {
    Instant withNanos = Instant.parse("2026-11-23T09:00:00.123456789Z");
    Instant truncated = Instant.parse("2026-11-23T09:00:00.123456Z");
    String h1 =
        AuditHashChain.computeEventHash(
            CRYPTO,
            1L,
            AuditHashChain.GENESIS_HASH,
            "ev-1",
            withNanos,
            "USER",
            AUDITOR.id(),
            null,
            "RECORD_AMENDED",
            "rec-1",
            "SUCCESS",
            "corr-1");
    String h2 =
        AuditHashChain.computeEventHash(
            CRYPTO,
            1L,
            AuditHashChain.GENESIS_HASH,
            "ev-1",
            truncated,
            "USER",
            AUDITOR.id(),
            null,
            "RECORD_AMENDED",
            "rec-1",
            "SUCCESS",
            "corr-1");
    String tampered =
        AuditHashChain.computeEventHash(
            CRYPTO,
            1L,
            AuditHashChain.GENESIS_HASH,
            "ev-1",
            truncated,
            "USER",
            AUDITOR.id(),
            null,
            "RECORD_READ",
            "rec-1",
            "SUCCESS",
            "corr-1");

    assertEquals(h1, h2);
    assertNotEquals(h1, tampered);
    assertTrue(AuditHashChain.constantTimeEquals(h1, h2));
    assertFalse(AuditHashChain.constantTimeEquals(h1, tampered));
    assertFalse(AuditHashChain.constantTimeEquals(h1, null));
  }

  @Test
  void auditRecordAndDeniedAppendToCryptographicHashChain() {
    Db db = mock(Db.class);
    Clock spyClock = mock(Clock.class);
    when(spyClock.instant()).thenReturn(NOW);
    when(db.one("SELECT last_seq,last_hash FROM audit_chain_head WHERE id=1 FOR UPDATE"))
        .thenReturn(Map.of("lastSeq", 5L, "lastHash", AuditHashChain.GENESIS_HASH));
    Audit audit = new Audit(db, spyClock, CRYPTO);

    audit.record(AUDITOR.id(), "RECORD_AMENDED", "rec-9");
    audit.denied(null, "TELEHEALTH_JOINED", "room-1");

    InOrder order = inOrder(db, spyClock);
    order.verify(db).one("SELECT last_seq,last_hash FROM audit_chain_head WHERE id=1 FOR UPDATE");
    order.verify(spyClock).instant();

    ArgumentCaptor<Object[]> argsCaptor = ArgumentCaptor.forClass(Object[].class);
    verify(db, times(2)).update(startsWith("INSERT INTO audit_event("), argsCaptor.capture());
    Object[] firstInsert = argsCaptor.getAllValues().get(0);
    assertEquals("USER", firstInsert[2]);
    assertEquals("RECORD_AMENDED", firstInsert[3]);
    assertEquals("SUCCESS", firstInsert[5]);
    assertEquals(Instant.parse("2026-11-23T09:00:00.123456Z"), firstInsert[7]);
    assertNull(firstInsert[8]);
    assertEquals(6L, firstInsert[9]);
    assertEquals(AuditHashChain.GENESIS_HASH, firstInsert[10]);
    assertEquals(64, firstInsert[11].toString().length());

    Object[] secondInsert = argsCaptor.getAllValues().get(1);
    assertEquals("SYSTEM", secondInsert[2]);
    assertEquals("DENIED", secondInsert[5]);
    assertEquals("clinic-background-worker", secondInsert[8]);

    verify(db, times(2))
        .update(
            eq("UPDATE audit_chain_head SET last_seq=?,last_hash=?,updated_at=? WHERE id=1"),
            eq(6L),
            anyString(),
            eq(Instant.parse("2026-11-23T09:00:00.123456Z")));
  }

  @Test
  void listEnforcesRoleValidationCursorPaginationAndSafeActorEnrichment() {
    Db db = mock(Db.class);
    Audit audit = mock(Audit.class);
    AuditService service = new AuditService(db, audit, CRYPTO, FIXED_CLOCK, 365, 1825, 5000);
    AuditService.AuditFilter empty =
        new AuditService.AuditFilter(null, null, null, null, null, null, null, null, null, false);

    // Non-AUDITOR forbidden
    Problem forbidden =
        assertThrows(Problem.class, () -> service.list(ADMIN, empty, null, null, 20, 0));
    assertEquals(403, forbidden.status);

    // Boundary / abnormal pagination & filter validation
    assertEquals(
        400,
        assertThrows(Problem.class, () -> service.list(AUDITOR, empty, null, null, 0, 0)).status);
    assertEquals(
        400,
        assertThrows(Problem.class, () -> service.list(AUDITOR, empty, null, null, 101, 0)).status);
    assertEquals(
        400,
        assertThrows(Problem.class, () -> service.list(AUDITOR, empty, null, null, 20, -1)).status);
    assertEquals(
        400,
        assertThrows(Problem.class, () -> service.list(AUDITOR, empty, NOW, null, 20, 0)).status);
    assertEquals(
        400,
        assertThrows(
                Problem.class,
                () -> service.list(AUDITOR, empty, NOW, UUID.randomUUID(), 20, 5))
            .status);
    assertEquals(
        400,
        assertThrows(
                Problem.class,
                () ->
                    service.list(
                        AUDITOR,
                        new AuditService.AuditFilter(
                            NOW, NOW, null, null, null, null, null, null, null, false),
                        null,
                        null,
                        20,
                        0))
            .status);
    assertEquals(
        400,
        assertThrows(
                Problem.class,
                () ->
                    service.list(
                        AUDITOR,
                        new AuditService.AuditFilter(
                            null, null, null, null, "BAD", null, null, null, null, false),
                        null,
                        null,
                        20,
                        0))
            .status);
    assertEquals(
        400,
        assertThrows(
                Problem.class,
                () ->
                    service.list(
                        AUDITOR,
                        new AuditService.AuditFilter(
                            null, null, null, null, null, null, "UNKNOWN", null, null, false),
                        null,
                        null,
                        20,
                        0))
            .status);
    assertEquals(
        400,
        assertThrows(
                Problem.class,
                () ->
                    service.list(
                        AUDITOR,
                        new AuditService.AuditFilter(
                            null, null, null, null, null, null, null, "BOT", null, false),
                        null,
                        null,
                        20,
                        0))
            .status);
    assertEquals(
        400,
        assertThrows(
                Problem.class,
                () ->
                    service.list(
                        AUDITOR,
                        new AuditService.AuditFilter(
                            null, null, null, null, null, "*", null, null, null, false),
                        null,
                        null,
                        20,
                        0))
            .status);

    // Cursor pagination + all server-side filters + safe actor label enrichment
    UUID actorUuid = UUID.fromString("00000000-0000-0000-0000-000000000003");
    UUID corrUuid = UUID.fromString("19c3518a-47e3-45cb-9685-e2e1138f9a10");
    UUID cursorId = UUID.fromString("11111111-1111-1111-1111-111111111111");
    Instant from = Instant.parse("2026-11-22T00:00:00Z");
    Instant to = Instant.parse("2026-11-24T00:00:00Z");

    Map<String, Object> rawRow = new LinkedHashMap<>();
    rawRow.put("id", "ev-1");
    rawRow.put("actorId", actorUuid.toString());
    rawRow.put("actorType", "USER");
    rawRow.put("actorLabel", null);
    rawRow.put("accountUsername", "patient@example.test");
    rawRow.put("accountStaff", false);
    rawRow.put("action", "RECORD_AMENDED");
    rawRow.put("resourceId", "rec-1");
    rawRow.put("result", "SUCCESS");
    rawRow.put("correlationId", corrUuid.toString());
    rawRow.put("createdAt", "2026-11-23T08:00:00Z");
    rawRow.put("chainSeq", 12L);
    rawRow.put("prevHash", AuditHashChain.GENESIS_HASH);
    rawRow.put("eventHash", "a".repeat(64));

    when(db.list(anyString(), any(Object[].class))).thenReturn(List.of(rawRow));

    var filter =
        new AuditService.AuditFilter(
            from,
            to,
            actorUuid,
            "rec-1",
            "SUCCESS",
            "RECORD_AMENDED",
            "CLINICAL",
            "USER",
            corrUuid,
            true);
    var rows = service.list(AUDITOR, filter, NOW, cursorId, 20, 0);

    assertEquals(1, rows.size());
    assertEquals("user-00000003", rows.getFirst().get("actorLabel"));
    assertFalse(rows.getFirst().containsKey("accountUsername"));
    assertFalse(rows.getFirst().containsKey("accountStaff"));

    ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
    verify(db).list(sqlCaptor.capture(), any(Object[].class));
    String sql = sqlCaptor.getValue();
    assertTrue(sql.contains("a.created_at<? OR (a.created_at=? AND a.id<?)"));
    assertTrue(sql.contains("a.action=?"));
    assertTrue(sql.contains("a.action NOT IN ("));
    assertFalse(sql.contains("OFFSET"));
    verify(audit).record(AUDITOR.id(), "AUDIT_SEARCH", AUDITOR.id());

    // Prefix, Vietnamese keyword, and unknown substring action branches with offset pagination
    when(db.list(anyString(), any(Object[].class))).thenReturn(List.of());
    service.list(
        AUDITOR,
        new AuditService.AuditFilter(
            null, null, null, null, null, "APPOINTMENT_", null, null, null, false),
        null,
        null,
        10,
        20);
    service.list(
        AUDITOR,
        new AuditService.AuditFilter(
            null, null, null, null, null, "bệnh án", null, null, null, false),
        null,
        null,
        10,
        0);
    service.list(
        AUDITOR,
        new AuditService.AuditFilter(
            null, null, null, null, null, "XYZ_FUTURE_TOKEN", null, null, null, false),
        null,
        null,
        10,
        0);
    verify(db).list(contains("a.action LIKE ? ESCAPE '!'"), any(Object[].class));
    verify(db).list(contains("AND (a.action IN ("), any(Object[].class));
    verify(db).list(contains("AND LOCATE(?,LOWER(a.action))>0"), any(Object[].class));
  }

  @Test
  void summaryAndCsvExportEnforceLimitsNeutralizeFormulasAndAuditExport() {
    Db db = mock(Db.class);
    Audit audit = mock(Audit.class);
    AuditService service = new AuditService(db, audit, CRYPTO, FIXED_CLOCK, 365, 1825, 10);
    AuditService.AuditFilter empty =
        new AuditService.AuditFilter(null, null, null, null, null, null, null, null, null, false);

    Map<String, Object> agg = new LinkedHashMap<>();
    agg.put("totalEvents", 42L);
    agg.put("deniedEvents", 3L);
    agg.put("failureEvents", 1L);
    agg.put("accessControlEvents", 7L);
    agg.put("recordAmendedEvents", 2L);
    agg.put("systemEvents", 5L);
    agg.put("chainedEvents", 40L);
    agg.put("legacyUnchainedEvents", 2L);
    agg.put("latestEventAt", "2026-11-23T08:55:00Z");
    when(db.one(startsWith("SELECT COUNT(*) AS total_events"), any(Object[].class)))
        .thenReturn(agg);

    var summary = service.summary(AUDITOR, empty);
    assertEquals(42L, summary.totalEvents());
    assertEquals(3L, summary.deniedEvents());
    assertEquals(7L, summary.accessControlEvents());
    assertEquals(2L, summary.recordAmendedEvents());
    assertEquals(40L, summary.chainedEvents());
    assertEquals(2L, summary.legacyUnchainedEvents());

    // Abnormal export limits
    assertEquals(
        400, assertThrows(Problem.class, () -> service.exportCsv(AUDITOR, empty, 0)).status);
    assertEquals(
        400, assertThrows(Problem.class, () -> service.exportCsv(AUDITOR, empty, 11)).status);

    // Normal + truncation + formula injection defense
    Map<String, Object> r1 = new LinkedHashMap<>();
    r1.put("id", "ev-1");
    r1.put("actorId", AUDITOR.id());
    r1.put("actorType", "USER");
    r1.put("actorLabel", null);
    r1.put("accountUsername", "auditor");
    r1.put("accountStaff", true);
    r1.put("action", "RECORD_AMENDED");
    r1.put("resourceId", "=HYPERLINK(\"http://evil\")");
    r1.put("result", "SUCCESS");
    r1.put("correlationId", "corr-1");
    r1.put("createdAt", "2026-11-23T08:50:00Z");
    r1.put("chainSeq", 10L);
    r1.put("prevHash", AuditHashChain.GENESIS_HASH);
    r1.put("eventHash", "b".repeat(64));

    Map<String, Object> r2 = new LinkedHashMap<>(r1);
    r2.put("id", "ev-2");
    r2.put("chainSeq", 9L);

    when(db.list(startsWith("SELECT a.id,a.actor_id"), any(Object[].class)))
        .thenReturn(new ArrayList<>(List.of(r1, r2)));

    var export = service.exportCsv(AUDITOR, empty, 1);
    assertTrue(export.truncated());
    assertEquals(1, export.rowCount());
    assertEquals(1, export.maxRows());
    assertEquals(64, export.contentSha256().length());
    assertTrue(export.csv().startsWith("\uFEFF"));
    assertTrue(export.csv().contains("Mã sự kiện (UUID)"));
    assertTrue(export.csv().contains(",ev-1,"));
    assertTrue(export.csv().contains("Chỉnh sửa bổ sung bệnh án"));
    assertTrue(export.csv().contains("'=HYPERLINK("));
    assertTrue(export.csv().contains(AUDITOR.id()));
    verify(audit).record(eq(AUDITOR.id()), eq("AUDIT_EXPORT"), startsWith("export:1:"));

    // Denied telehealth join exports contextual Vietnamese label
    Map<String, Object> deniedTele = new LinkedHashMap<>(r1);
    deniedTele.put("action", "TELEHEALTH_JOINED");
    deniedTele.put("result", "DENIED");
    when(db.list(startsWith("SELECT a.id,a.actor_id"), any(Object[].class)))
        .thenReturn(new ArrayList<>(List.of(deniedTele)));
    var exportDenied = service.exportCsv(AUDITOR, empty, 5);
    assertTrue(exportDenied.csv().contains("Từ chối tham gia phòng khám từ xa"));
  }

  @Test
  void verifyIntegrityHandlesVerifiedLegacyAndAllTamperModes() throws Exception {
    // Verify REPEATABLE_READ snapshot isolation prevents false positives under concurrent writes
    Transactional tx =
        AuditService.class
            .getMethod("verifyIntegrity", Access.Actor.class, Integer.class)
            .getAnnotation(Transactional.class);
    assertNotNull(tx);
    assertEquals(Isolation.REPEATABLE_READ, tx.isolation());

    Db db = mock(Db.class);
    Audit audit = mock(Audit.class);
    AuditService service = new AuditService(db, audit, CRYPTO, FIXED_CLOCK, 365, 1825, 5000);

    Instant t1 = Instant.parse("2026-11-23T08:00:00Z");
    Instant t2 = Instant.parse("2026-11-23T08:01:00Z");
    String h1 =
        AuditHashChain.computeEventHash(
            CRYPTO,
            1L,
            AuditHashChain.GENESIS_HASH,
            "ev-1",
            t1,
            "USER",
            AUDITOR.id(),
            null,
            "PROFILE_READ",
            AUDITOR.id(),
            "SUCCESS",
            "c-1");
    String h2 =
        AuditHashChain.computeEventHash(
            CRYPTO,
            2L,
            h1,
            "ev-2",
            t2,
            "SYSTEM",
            null,
            "clinic-background-worker",
            "NOTIFICATION_SENT",
            "job-1",
            "SUCCESS",
            "c-2");

    Map<String, Object> ev1 = eventRow(1L, AuditHashChain.GENESIS_HASH, h1, "ev-1", t1, "USER",
        AUDITOR.id(), null, "PROFILE_READ", AUDITOR.id(), "SUCCESS", "c-1");
    Map<String, Object> ev2 = eventRow(2L, h1, h2, "ev-2", t2, "SYSTEM",
        null, "clinic-background-worker", "NOTIFICATION_SENT", "job-1", "SUCCESS", "c-2");

    // 1. VERIFIED
    when(db.one(startsWith("SELECT COALESCE(SUM(CASE WHEN chain_seq")))
        .thenReturn(Map.of("chained", 2L, "legacy", 3L));
    when(db.one("SELECT last_seq,last_hash FROM audit_chain_head WHERE id=1"))
        .thenReturn(Map.of("lastSeq", 2L, "lastHash", h2));
    when(db.list(contains("FROM audit_event WHERE chain_seq IS NOT NULL ORDER BY"), anyInt()))
        .thenReturn(List.of(ev1, ev2));

    var ok = service.verifyIntegrity(AUDITOR, 1000);
    assertEquals("VERIFIED", ok.status());
    assertEquals(2L, ok.checkedCount());
    assertEquals(3L, ok.legacyUnchainedCount());
    assertFalse(ok.truncated());
    assertNull(ok.mismatchReason());

    // 1b. Truncated partial scan (maxEvents=1 < totalChained=2)
    when(db.list(contains("FROM audit_event WHERE chain_seq IS NOT NULL ORDER BY"), eq(1)))
        .thenReturn(List.of(ev1));
    var partial = service.verifyIntegrity(AUDITOR, 1);
    assertEquals("VERIFIED", partial.status());
    assertTrue(partial.truncated());
    assertEquals(1L, partial.checkedCount());

    // 2. HASH_MISMATCH (tampered action on ev2)
    Map<String, Object> tamperedEv2 = new LinkedHashMap<>(ev2);
    tamperedEv2.put("action", "NOTIFICATION_FAILED");
    when(db.list(contains("FROM audit_event WHERE chain_seq IS NOT NULL ORDER BY"), anyInt()))
        .thenReturn(List.of(ev1, tamperedEv2));
    var hashMismatch = service.verifyIntegrity(AUDITOR, 1000);
    assertEquals("TAMPERED", hashMismatch.status());
    assertEquals("HASH_MISMATCH", hashMismatch.mismatchReason());
    assertEquals(2L, hashMismatch.firstBrokenSeq());
    assertEquals("ev-2", hashMismatch.firstBrokenEventId());

    // 3. PREV_HASH_MISMATCH
    Map<String, Object> brokenPrev = new LinkedHashMap<>(ev2);
    brokenPrev.put("prevHash", "f".repeat(64));
    when(db.list(contains("FROM audit_event WHERE chain_seq IS NOT NULL ORDER BY"), anyInt()))
        .thenReturn(List.of(ev1, brokenPrev));
    var prevMismatch = service.verifyIntegrity(AUDITOR, 1000);
    assertEquals("TAMPERED", prevMismatch.status());
    assertEquals("PREV_HASH_MISMATCH", prevMismatch.mismatchReason());

    // 4. SEQUENCE_GAP (including injected seq=0)
    Map<String, Object> seqZero = eventRow(0L, AuditHashChain.GENESIS_HASH, h1, "ev-0", t1,
        "USER", AUDITOR.id(), null, "PROFILE_READ", AUDITOR.id(), "SUCCESS", "c-0");
    when(db.list(contains("FROM audit_event WHERE chain_seq IS NOT NULL ORDER BY"), anyInt()))
        .thenReturn(List.of(seqZero, ev1));
    var zeroGap = service.verifyIntegrity(AUDITOR, 1000);
    assertEquals("TAMPERED", zeroGap.status());
    assertEquals("SEQUENCE_GAP", zeroGap.mismatchReason());
    assertEquals(1L, zeroGap.firstBrokenSeq());
    assertEquals("ev-0", zeroGap.firstBrokenEventId());

    when(db.list(contains("FROM audit_event WHERE chain_seq IS NOT NULL ORDER BY"), anyInt()))
        .thenReturn(List.of(ev2));
    var gap = service.verifyIntegrity(AUDITOR, 1000);
    assertEquals("TAMPERED", gap.status());
    assertEquals("SEQUENCE_GAP", gap.mismatchReason());
    assertEquals(1L, gap.firstBrokenSeq());

    // 5. HEAD_MISMATCH (tail truncation)
    when(db.one(startsWith("SELECT COALESCE(SUM(CASE WHEN chain_seq")))
        .thenReturn(Map.of("chained", 1L, "legacy", 0L, "maxSeq", 1L));
    when(db.one("SELECT last_seq,last_hash FROM audit_chain_head WHERE id=1"))
        .thenReturn(Map.of("lastSeq", 2L, "lastHash", h2));
    when(db.list(contains("FROM audit_event WHERE chain_seq IS NOT NULL ORDER BY"), anyInt()))
        .thenReturn(List.of(ev1));
    var headMismatch = service.verifyIntegrity(AUDITOR, 1000);
    assertEquals("TAMPERED", headMismatch.status());
    assertEquals("HEAD_MISMATCH", headMismatch.mismatchReason());

    // 5b. HEAD_MISMATCH (chain head rolled back below maxSeq, even on truncated scan):
    // must report TAMPERED without invoking audit.record (which would hit uq_audit_chain_seq)
    clearInvocations(audit);
    when(db.one(startsWith("SELECT COALESCE(SUM(CASE WHEN chain_seq")))
        .thenReturn(Map.of("chained", 2L, "legacy", 0L, "maxSeq", 2L));
    when(db.one("SELECT last_seq,last_hash FROM audit_chain_head WHERE id=1"))
        .thenReturn(Map.of("lastSeq", 1L, "lastHash", h1));
    when(db.list(contains("FROM audit_event WHERE chain_seq IS NOT NULL ORDER BY"), eq(1)))
        .thenReturn(List.of(ev1));
    var headRollback = service.verifyIntegrity(AUDITOR, 1);
    assertEquals("TAMPERED", headRollback.status());
    assertEquals("HEAD_MISMATCH", headRollback.mismatchReason());
    assertEquals(1L, headRollback.firstBrokenSeq());
    assertFalse(headRollback.truncated());
    verify(audit, never()).record(any(), any(), any());

    // 6. LEGACY_ONLY
    when(db.one(startsWith("SELECT COALESCE(SUM(CASE WHEN chain_seq")))
        .thenReturn(Map.of("chained", 0L, "legacy", 10L));
    when(db.one("SELECT last_seq,last_hash FROM audit_chain_head WHERE id=1"))
        .thenReturn(Map.of("lastSeq", 0L, "lastHash", AuditHashChain.GENESIS_HASH));
    when(db.list(contains("FROM audit_event WHERE chain_seq IS NOT NULL ORDER BY"), anyInt()))
        .thenReturn(List.of());
    var legacy = service.verifyIntegrity(AUDITOR, null);
    assertEquals("LEGACY_ONLY", legacy.status());
    assertEquals(10L, legacy.legacyUnchainedCount());

    // 7. Invalid maxEvents
    assertEquals(400, assertThrows(Problem.class, () -> service.verifyIntegrity(AUDITOR, 0)).status);
    assertEquals(
        400, assertThrows(Problem.class, () -> service.verifyIntegrity(AUDITOR, 50_001)).status);
  }

  @Test
  void retentionStatusAndArchiveBatchSealImmutableBatchesAndRejectInvalidBounds() {
    Db db = mock(Db.class);
    Audit audit = mock(Audit.class);
    AuditService service = new AuditService(db, audit, CRYPTO, FIXED_CLOCK, 365, 1825, 5000);

    Map<String, Object> stats = new LinkedHashMap<>();
    stats.put("totalEvents", 120L);
    stats.put("oldestEventAt", "2025-01-01T00:00:00Z");
    stats.put("newestEventAt", "2026-11-23T08:00:00Z");
    Map<String, Object> archMeta = new LinkedHashMap<>();
    archMeta.put("batchCount", 1L);
    archMeta.put("lastTo", "2025-06-01T00:00:00Z");
    Map<String, Object> recent = new LinkedHashMap<>();
    recent.put("id", "batch-1");
    recent.put("fromCreatedAt", "2025-01-01T00:00:00Z");
    recent.put("toCreatedAt", "2025-06-01T00:00:00Z");
    recent.put("eventCount", 25);
    recent.put("firstChainSeq", 1L);
    recent.put("lastChainSeq", 25L);
    recent.put("batchHash", "c".repeat(64));
    recent.put("retentionDays", 1825);
    recent.put("createdBy", AUDITOR.id());
    recent.put("createdAt", "2026-06-02T00:00:00Z");
    recent.put("notes", "Q1-Q2");

    when(db.one(startsWith("SELECT COUNT(*) AS total_events"))).thenReturn(stats);
    when(db.one(startsWith("SELECT COUNT(*) AS batch_count"))).thenReturn(archMeta);
    when(db.count(startsWith("SELECT COUNT(*) FROM audit_event WHERE created_at>=?"), any(), any()))
        .thenReturn(15L);
    when(db.list(startsWith("SELECT id,from_created_at"))).thenReturn(List.of(recent));

    var status = service.retentionStatus(AUDITOR);
    assertEquals(365, status.hotRetentionDays());
    assertEquals(1825, status.archiveRetentionDays());
    assertEquals(AuditService.DELETION_POLICY, status.deletionPolicy());
    assertEquals(15L, status.eligibleForArchiveCount());
    assertEquals(1, status.recentBatches().size());

    // Archive validation errors
    assertEquals(
        400,
        assertThrows(
                Problem.class, () -> service.archiveBatch(AUDITOR, NOW.plusSeconds(60), null))
            .status);
    assertEquals(
        400,
        assertThrows(Problem.class, () -> service.archiveBatch(AUDITOR, NOW, "x".repeat(501)))
            .status);

    // No events -> 409 (and acquires head lock before checking prev archive)
    when(db.one("SELECT last_seq FROM audit_chain_head WHERE id=1 FOR UPDATE"))
        .thenReturn(Map.of("lastSeq", 10L));
    Map<String, Object> prevNone = new LinkedHashMap<>();
    prevNone.put("lastTo", null);
    when(db.one("SELECT MAX(to_created_at) AS last_to FROM audit_archive_batch"))
        .thenReturn(prevNone);
    when(db.list(startsWith("SELECT id,chain_seq,event_hash"), any(), anyInt()))
        .thenReturn(List.of());
    assertEquals(
        409, assertThrows(Problem.class, () -> service.archiveBatch(AUDITOR, NOW, "empty")).status);

    // Seal batch successfully
    Map<String, Object> ev = new LinkedHashMap<>();
    ev.put("id", "ev-arch-1");
    ev.put("chainSeq", 7L);
    ev.put("eventHash", "d".repeat(64));
    ev.put("createdAt", "2026-10-01T00:00:00Z");
    ev.put("action", "APPOINTMENT_BOOKED");
    ev.put("result", "SUCCESS");
    when(db.list(startsWith("SELECT id,chain_seq,event_hash"), any(), anyInt()))
        .thenReturn(List.of(ev));

    var sealed = service.archiveBatch(AUDITOR, Instant.parse("2026-11-01T00:00:00Z"), " Tháng 10 ");
    assertEquals(1, sealed.eventCount());
    assertEquals(7L, sealed.firstChainSeq());
    assertEquals(7L, sealed.lastChainSeq());
    assertEquals(64, sealed.batchHash().length());
    assertEquals("Tháng 10", sealed.notes());
    InOrder archOrder = inOrder(db);
    archOrder.verify(db).one("SELECT last_seq FROM audit_chain_head WHERE id=1 FOR UPDATE");
    archOrder.verify(db).one("SELECT MAX(to_created_at) AS last_to FROM audit_archive_batch");
    verify(db).update(startsWith("INSERT INTO audit_archive_batch("), any(Object[].class));
    verify(audit).record(AUDITOR.id(), "AUDIT_ARCHIVE_CREATED", sealed.id());

    // Overflow split with shared microsecond boundary must NOT skip events at same timestamp
    AuditService smallBatch =
        new AuditService(db, audit, CRYPTO, FIXED_CLOCK, 365, 1825, 5000, 2);
    Map<String, Object> e1 = new LinkedHashMap<>(ev);
    e1.put("id", "ev-1");
    e1.put("chainSeq", 1L);
    e1.put("createdAt", "2026-10-01T00:00:00Z");
    Map<String, Object> e2 = new LinkedHashMap<>(ev);
    e2.put("id", "ev-2");
    e2.put("chainSeq", 2L);
    e2.put("createdAt", "2026-10-01T00:00:01Z");
    Map<String, Object> e3 = new LinkedHashMap<>(ev);
    e3.put("id", "ev-3");
    e3.put("chainSeq", 3L);
    e3.put("createdAt", "2026-10-01T00:00:01Z");
    when(db.list(startsWith("SELECT id,chain_seq,event_hash"), any(), eq(3)))
        .thenReturn(List.of(e1, e2, e3));
    var split = smallBatch.archiveBatch(AUDITOR, Instant.parse("2026-11-01T00:00:00Z"), "split");
    assertEquals(1, split.eventCount());
    assertEquals("2026-10-01T00:00:01Z", split.toCreatedAt());

    // Overflow when all rows share the exact same microsecond -> fallback to +1µs
    // Also verify firstChainSeq/lastChainSeq use min/max even when UUID order reverses chain_seq
    Map<String, Object> s1 = new LinkedHashMap<>(e1);
    s1.put("id", "00000000-0000-0000-0000-000000000001");
    s1.put("chainSeq", 11L);
    Map<String, Object> s2 = new LinkedHashMap<>(e1);
    s2.put("id", "ffffffff-ffff-ffff-ffff-ffffffffffff");
    s2.put("chainSeq", 10L);
    Map<String, Object> s3 = new LinkedHashMap<>(e1);
    s3.put("id", "ffffffff-ffff-ffff-ffff-fffffffffffe");
    s3.put("chainSeq", 12L);
    when(db.list(startsWith("SELECT id,chain_seq,event_hash"), any(), eq(3)))
        .thenReturn(List.of(s1, s2, s3));
    var sameTs = smallBatch.archiveBatch(AUDITOR, Instant.parse("2026-11-01T00:00:00Z"), null);
    assertEquals(2, sameTs.eventCount());
    assertEquals(10L, sameTs.firstChainSeq());
    assertEquals(11L, sameTs.lastChainSeq());
    assertEquals("2026-10-01T00:00:00.000001Z", sameTs.toCreatedAt());
  }

  @Test
  void controllerDelegatesAllSixAuditEndpoints() {
    Access access = mock(Access.class);
    AuditService service = mock(AuditService.class);
    Jwt jwt = mock(Jwt.class);
    when(access.actor(jwt)).thenReturn(AUDITOR);
    AuditController controller = new AuditController(access, service);

    controller.list(jwt, null, null, null, null, null, null, null, null, null, false, null, null, 20, 0);
    controller.summary(jwt, null, null, null, null, null, null, null, null, null, false);
    controller.export(jwt, null, null, null, null, null, null, null, null, null, false, 100);
    controller.verify(jwt, 500);
    controller.retention(jwt);
    controller.archive(jwt, new AuditController.ArchiveAuditRequest(NOW, "note"));
    controller.archive(jwt, null);

    verify(service).list(eq(AUDITOR), any(), isNull(), isNull(), eq(20), eq(0));
    verify(service).summary(eq(AUDITOR), any());
    verify(service).exportCsv(eq(AUDITOR), any(), eq(100));
    verify(service).verifyIntegrity(AUDITOR, 500);
    verify(service).retentionStatus(AUDITOR);
    verify(service).archiveBatch(AUDITOR, NOW, "note");
    verify(service).archiveBatch(AUDITOR, null, null);
  }

  private static Map<String, Object> eventRow(
      long seq,
      String prevHash,
      String eventHash,
      String id,
      Instant createdAt,
      String actorType,
      String actorId,
      String actorLabel,
      String action,
      String resourceId,
      String result,
      String correlationId) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("chainSeq", seq);
    m.put("prevHash", prevHash);
    m.put("eventHash", eventHash);
    m.put("id", id);
    m.put("createdAt", createdAt.toString());
    m.put("actorType", actorType);
    m.put("actorId", actorId);
    m.put("actorLabel", actorLabel);
    m.put("action", action);
    m.put("resourceId", resourceId);
    m.put("result", result);
    m.put("correlationId", correlationId);
    return m;
  }
}
