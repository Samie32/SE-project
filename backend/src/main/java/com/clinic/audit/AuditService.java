package com.clinic.audit;

import com.clinic.auth.Access;
import com.clinic.common.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {
  public static final String DELETION_POLICY = "APPEND_ONLY_NO_APP_DELETE";
  private static final int VERIFY_BATCH_SIZE = 1000;
  private static final int ARCHIVE_BATCH_MAX_EVENTS = 50_000;
  private static final DateTimeFormatter FILE_DATE =
      DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss").withZone(ZoneOffset.UTC);

  public record AuditFilter(
      Instant from,
      Instant to,
      UUID actorId,
      String resourceId,
      String result,
      String action,
      String category,
      String actorType,
      UUID correlationId,
      boolean excludeReadNoise) {}

  public record AuditSummary(
      long totalEvents,
      long deniedEvents,
      long failureEvents,
      long accessControlEvents,
      long recordAmendedEvents,
      long systemEvents,
      long chainedEvents,
      long legacyUnchainedEvents,
      String latestEventAt) {}

  public record AuditExportResponse(
      String filename,
      String contentType,
      String exportedAt,
      int rowCount,
      int maxRows,
      boolean truncated,
      String contentSha256,
      String csv) {}

  public record AuditIntegrityReport(
      String status,
      String algorithm,
      String verifiedAt,
      long checkedCount,
      long totalChainedCount,
      long legacyUnchainedCount,
      boolean truncated,
      long headSeq,
      String headHash,
      Long firstBrokenSeq,
      String firstBrokenEventId,
      String mismatchReason) {}

  public record AuditArchiveBatch(
      String id,
      String fromCreatedAt,
      String toCreatedAt,
      int eventCount,
      Long firstChainSeq,
      Long lastChainSeq,
      String batchHash,
      int retentionDays,
      String createdBy,
      String createdAt,
      String notes) {}

  public record AuditRetentionStatus(
      int hotRetentionDays,
      int archiveRetentionDays,
      int exportMaxRows,
      String deletionPolicy,
      long totalEvents,
      String oldestEventAt,
      String newestEventAt,
      long eligibleForArchiveCount,
      String archiveCutoffAt,
      long archiveBatchCount,
      List<AuditArchiveBatch> recentBatches) {}

  private final Db db;
  private final Audit audit;
  private final Crypto crypto;
  private final Clock clock;
  private final int hotRetentionDays;
  private final int archiveRetentionDays;
  private final int exportMaxRows;

  public AuditService(
      Db db,
      Audit audit,
      Crypto crypto,
      Clock clock,
      @Value("${clinic.audit.hot-retention-days:365}") int hotRetentionDays,
      @Value("${clinic.audit.archive-retention-days:1825}") int archiveRetentionDays,
      @Value("${clinic.audit.export-max-rows:5000}") int exportMaxRows) {
    this.db = db;
    this.audit = audit;
    this.crypto = crypto;
    this.clock = clock;
    this.hotRetentionDays = hotRetentionDays;
    this.archiveRetentionDays = archiveRetentionDays;
    this.exportMaxRows = exportMaxRows;
  }

  @Transactional
  public List<Map<String, Object>> list(
      Access.Actor actor,
      AuditFilter filter,
      Instant cursorCreatedAt,
      UUID cursorId,
      int limit,
      int offset) {
    actor.require("AUDITOR");
    Problem.require(limit > 0 && limit <= 100 && offset >= 0, 400, "Invalid pagination");
    Problem.require(
        (cursorCreatedAt == null) == (cursorId == null), 400, "Invalid pagination");
    Problem.require(cursorCreatedAt == null || offset == 0, 400, "Invalid pagination");

    StringBuilder sql =
        new StringBuilder(
            "SELECT a.id,a.actor_id,a.actor_type,a.actor_label,a.action,a.resource_id,a.result,"
                + "a.correlation_id,a.created_at,a.chain_seq,a.prev_hash,a.event_hash,"
                + "u.username AS account_username,u.staff AS account_staff"
                + " FROM audit_event a LEFT JOIN user_account u ON u.id=a.actor_id WHERE 1=1");
    List<Object> args = new ArrayList<>();
    appendFilters(sql, args, filter);
    if (cursorCreatedAt != null) {
      sql.append(" AND (a.created_at<? OR (a.created_at=? AND a.id<?))");
      args.add(cursorCreatedAt);
      args.add(cursorCreatedAt);
      args.add(cursorId.toString());
      sql.append(" ORDER BY a.created_at DESC,a.id DESC LIMIT ?");
      args.add(limit);
    } else {
      sql.append(" ORDER BY a.created_at DESC,a.id DESC LIMIT ? OFFSET ?");
      args.add(limit);
      args.add(offset);
    }
    var rows = db.list(sql.toString(), args.toArray());
    enrichRows(rows);
    audit.record(actor.id(), "AUDIT_SEARCH", actor.id());
    return rows;
  }

  @Transactional(readOnly = true)
  public AuditSummary summary(Access.Actor actor, AuditFilter filter) {
    actor.require("AUDITOR");
    StringBuilder sql =
        new StringBuilder(
            "SELECT COUNT(*) AS total_events,"
                + " COALESCE(SUM(CASE WHEN a.result='DENIED' THEN 1 ELSE 0 END),0) AS denied_events,"
                + " COALESCE(SUM(CASE WHEN a.result='FAILURE' THEN 1 ELSE 0 END),0) AS failure_events,"
                + " COALESCE(SUM(CASE WHEN "
                + AuditActionCatalog.ACCESS_CONTROL_SQL
                + " THEN 1 ELSE 0 END),0) AS access_control_events,"
                + " COALESCE(SUM(CASE WHEN a.action='RECORD_AMENDED' THEN 1 ELSE 0 END),0) AS record_amended_events,"
                + " COALESCE(SUM(CASE WHEN a.actor_type='SYSTEM' THEN 1 ELSE 0 END),0) AS system_events,"
                + " COALESCE(SUM(CASE WHEN a.event_hash IS NOT NULL THEN 1 ELSE 0 END),0) AS chained_events,"
                + " COALESCE(SUM(CASE WHEN a.event_hash IS NULL THEN 1 ELSE 0 END),0) AS legacy_unchained_events,"
                + " MAX(a.created_at) AS latest_event_at"
                + " FROM audit_event a WHERE 1=1");
    List<Object> args = new ArrayList<>();
    appendFilters(sql, args, filter);
    var row = db.one(sql.toString(), args.toArray());
    return new AuditSummary(
        asLong(row.get("totalEvents")),
        asLong(row.get("deniedEvents")),
        asLong(row.get("failureEvents")),
        asLong(row.get("accessControlEvents")),
        asLong(row.get("recordAmendedEvents")),
        asLong(row.get("systemEvents")),
        asLong(row.get("chainedEvents")),
        asLong(row.get("legacyUnchainedEvents")),
        asStringOrNull(row.get("latestEventAt")));
  }

  @Transactional
  public AuditExportResponse exportCsv(
      Access.Actor actor, AuditFilter filter, Integer requestedMaxRows) {
    actor.require("AUDITOR");
    int max = requestedMaxRows == null ? exportMaxRows : requestedMaxRows;
    Problem.require(max >= 1 && max <= exportMaxRows, 400, "Invalid export limit");

    StringBuilder sql =
        new StringBuilder(
            "SELECT a.id,a.actor_id,a.actor_type,a.actor_label,a.action,a.resource_id,a.result,"
                + "a.correlation_id,a.created_at,a.chain_seq,a.prev_hash,a.event_hash,"
                + "u.username AS account_username,u.staff AS account_staff"
                + " FROM audit_event a LEFT JOIN user_account u ON u.id=a.actor_id WHERE 1=1");
    List<Object> args = new ArrayList<>();
    appendFilters(sql, args, filter);
    sql.append(" ORDER BY a.created_at DESC,a.id DESC LIMIT ?");
    args.add(max + 1);

    var fetched = db.list(sql.toString(), args.toArray());
    boolean truncated = fetched.size() > max;
    var rows = truncated ? fetched.subList(0, max) : fetched;
    enrichRows(rows);

    StringBuilder csv = new StringBuilder("\uFEFF");
    csv.append(
        "STT chuỗi,Thời điểm (UTC),Mã hành động,Hành động (tiếng Việt),Kết quả,"
            + "Loại tác nhân,Nhãn tác nhân,Mã tác nhân (UUID),Mã đối tượng,"
            + "Correlation ID,Mã băm sự kiện (event_hash),Mã băm liền trước (prev_hash)\r\n");
    for (var row : rows) {
      String action = asStringOrNull(row.get("action"));
      String result = asStringOrNull(row.get("result"));
      csv.append(AuditActionCatalog.csvCell(row.get("chainSeq"))).append(',')
          .append(AuditActionCatalog.csvCell(row.get("createdAt"))).append(',')
          .append(AuditActionCatalog.csvCell(action)).append(',')
          .append(AuditActionCatalog.csvCell(AuditActionCatalog.labelVi(action))).append(',')
          .append(AuditActionCatalog.csvCell(AuditActionCatalog.resultVi(result))).append(',')
          .append(AuditActionCatalog.csvCell(row.get("actorType"))).append(',')
          .append(AuditActionCatalog.csvCell(row.get("actorLabel"))).append(',')
          .append(AuditActionCatalog.csvCell(row.get("actorId"))).append(',')
          .append(AuditActionCatalog.csvCell(row.get("resourceId"))).append(',')
          .append(AuditActionCatalog.csvCell(row.get("correlationId"))).append(',')
          .append(AuditActionCatalog.csvCell(row.get("eventHash"))).append(',')
          .append(AuditActionCatalog.csvCell(row.get("prevHash"))).append("\r\n");
    }

    Instant now = AuditHashChain.normalizeTimestamp(clock.instant());
    String content = csv.toString();
    String sha256 = sha256Hex(content);
    String filename = "cliniccare-audit-" + FILE_DATE.format(now) + ".csv";
    audit.record(
        actor.id(),
        "AUDIT_EXPORT",
        "export:" + rows.size() + ":" + sha256.substring(0, 12));
    return new AuditExportResponse(
        filename,
        "text/csv;charset=utf-8",
        now.toString(),
        rows.size(),
        max,
        truncated,
        sha256,
        content);
  }

  @Transactional
  public AuditIntegrityReport verifyIntegrity(Access.Actor actor, Integer requestedMaxEvents) {
    actor.require("AUDITOR");
    int maxEvents = requestedMaxEvents == null ? 10_000 : requestedMaxEvents;
    Problem.require(maxEvents >= 1 && maxEvents <= 50_000, 400, "Invalid pagination");

    var counts =
        db.one(
            "SELECT COALESCE(SUM(CASE WHEN chain_seq IS NOT NULL THEN 1 ELSE 0 END),0) AS chained,"
                + " COALESCE(SUM(CASE WHEN chain_seq IS NULL THEN 1 ELSE 0 END),0) AS legacy"
                + " FROM audit_event");
    long totalChained = asLong(counts.get("chained"));
    long legacyUnchained = asLong(counts.get("legacy"));

    var head = db.one("SELECT last_seq,last_hash FROM audit_chain_head WHERE id=1");
    long headSeq = asLong(head.get("lastSeq"));
    String headHash = head.get("lastHash").toString();

    long expectedSeq = 1;
    String expectedPrevHash = AuditHashChain.GENESIS_HASH;
    long checked = 0;
    long lastCheckedSeq = 0;
    String lastCheckedHash = AuditHashChain.GENESIS_HASH;
    Long firstBrokenSeq = null;
    String firstBrokenEventId = null;
    String mismatchReason = null;

    long cursorSeq = 0;
    while (checked < maxEvents && mismatchReason == null) {
      int batchSize = (int) Math.min(VERIFY_BATCH_SIZE, maxEvents - checked);
      var batch =
          db.list(
              "SELECT id,actor_id,actor_type,actor_label,action,resource_id,result,"
                  + "correlation_id,created_at,chain_seq,prev_hash,event_hash"
                  + " FROM audit_event WHERE chain_seq IS NOT NULL AND chain_seq>?"
                  + " ORDER BY chain_seq ASC LIMIT ?",
              cursorSeq,
              batchSize);
      if (batch.isEmpty()) break;
      for (var row : batch) {
        long seq = asLong(row.get("chainSeq"));
        String id = row.get("id").toString();
        String prevHash = asStringOrNull(row.get("prevHash"));
        String eventHash = asStringOrNull(row.get("eventHash"));
        if (seq != expectedSeq) {
          firstBrokenSeq = expectedSeq;
          firstBrokenEventId = id;
          mismatchReason = "SEQUENCE_GAP";
          break;
        }
        if (!AuditHashChain.constantTimeEquals(expectedPrevHash, prevHash)) {
          firstBrokenSeq = seq;
          firstBrokenEventId = id;
          mismatchReason = "PREV_HASH_MISMATCH";
          break;
        }
        String computed =
            AuditHashChain.computeEventHash(
                crypto,
                seq,
                prevHash,
                id,
                Instant.parse(row.get("createdAt").toString()),
                asStringOrNull(row.get("actorType")),
                asStringOrNull(row.get("actorId")),
                asStringOrNull(row.get("actorLabel")),
                asStringOrNull(row.get("action")),
                asStringOrNull(row.get("resourceId")),
                asStringOrNull(row.get("result")),
                asStringOrNull(row.get("correlationId")));
        if (!AuditHashChain.constantTimeEquals(computed, eventHash)) {
          firstBrokenSeq = seq;
          firstBrokenEventId = id;
          mismatchReason = "HASH_MISMATCH";
          break;
        }
        checked++;
        lastCheckedSeq = seq;
        lastCheckedHash = eventHash;
        expectedPrevHash = eventHash;
        expectedSeq = seq + 1;
        cursorSeq = seq;
      }
      if (batch.size() < batchSize) break;
    }

    boolean truncated = mismatchReason == null && totalChained > checked;
    if (mismatchReason == null && !truncated) {
      if (lastCheckedSeq != headSeq
          || !AuditHashChain.constantTimeEquals(lastCheckedHash, headHash)) {
        firstBrokenSeq = headSeq;
        mismatchReason = "HEAD_MISMATCH";
      }
    }

    String status =
        mismatchReason != null
            ? "TAMPERED"
            : (totalChained == 0 && headSeq == 0 ? "LEGACY_ONLY" : "VERIFIED");
    Instant verifiedAt = AuditHashChain.normalizeTimestamp(clock.instant());
    audit.record(actor.id(), "AUDIT_INTEGRITY_VERIFIED", status + ":" + checked);

    return new AuditIntegrityReport(
        status,
        AuditHashChain.ALGORITHM,
        verifiedAt.toString(),
        checked,
        totalChained,
        legacyUnchained,
        truncated,
        headSeq,
        headHash,
        firstBrokenSeq,
        firstBrokenEventId,
        mismatchReason);
  }

  @Transactional(readOnly = true)
  public AuditRetentionStatus retentionStatus(Access.Actor actor) {
    actor.require("AUDITOR");
    Instant now = AuditHashChain.normalizeTimestamp(clock.instant());
    Instant cutoff = now.minus(Duration.ofDays(hotRetentionDays));

    var stats =
        db.one(
            "SELECT COUNT(*) AS total_events, MIN(created_at) AS oldest_event_at,"
                + " MAX(created_at) AS newest_event_at FROM audit_event");
    var latestArchive =
        db.one(
            "SELECT COUNT(*) AS batch_count, MAX(to_created_at) AS last_to FROM audit_archive_batch");
    String lastArchivedTo = asStringOrNull(latestArchive.get("lastTo"));
    long eligible;
    if (lastArchivedTo == null) {
      eligible = db.count("SELECT COUNT(*) FROM audit_event WHERE created_at<?", cutoff);
    } else {
      Instant lastTo = Instant.parse(lastArchivedTo);
      eligible =
          lastTo.isBefore(cutoff)
              ? db.count(
                  "SELECT COUNT(*) FROM audit_event WHERE created_at>=? AND created_at<?",
                  lastTo,
                  cutoff)
              : 0L;
    }

    var recentRows =
        db.list(
            "SELECT id,from_created_at,to_created_at,event_count,first_chain_seq,last_chain_seq,"
                + "batch_hash,retention_days,created_by,created_at,notes"
                + " FROM audit_archive_batch ORDER BY created_at DESC,id DESC LIMIT 10");
    List<AuditArchiveBatch> batches = recentRows.stream().map(AuditService::toBatch).toList();

    return new AuditRetentionStatus(
        hotRetentionDays,
        archiveRetentionDays,
        exportMaxRows,
        DELETION_POLICY,
        asLong(stats.get("totalEvents")),
        asStringOrNull(stats.get("oldestEventAt")),
        asStringOrNull(stats.get("newestEventAt")),
        eligible,
        cutoff.toString(),
        asLong(latestArchive.get("batchCount")),
        batches);
  }

  @Transactional
  public AuditArchiveBatch archiveBatch(Access.Actor actor, Instant before, String notes) {
    actor.require("AUDITOR");
    Instant now = AuditHashChain.normalizeTimestamp(clock.instant());
    Instant cutoff =
        before == null
            ? now.minus(Duration.ofDays(hotRetentionDays))
            : AuditHashChain.normalizeTimestamp(before);
    Problem.require(!cutoff.isAfter(now), 400, "Invalid time range");
    String cleanNotes = notes == null || notes.isBlank() ? null : notes.strip();
    Problem.require(cleanNotes == null || cleanNotes.length() <= 500, 400, "Invalid request");

    var prev = db.one("SELECT MAX(to_created_at) AS last_to FROM audit_archive_batch");
    String prevBoundaryStr = asStringOrNull(prev.get("lastTo"));
    Instant prevBoundary = prevBoundaryStr == null ? null : Instant.parse(prevBoundaryStr);
    Problem.require(
        prevBoundary == null || prevBoundary.isBefore(cutoff),
        409,
        "No unarchived audit events in selected period");

    List<Map<String, Object>> events =
        prevBoundary == null
            ? db.list(
                "SELECT id,chain_seq,event_hash,created_at,action,result FROM audit_event"
                    + " WHERE created_at<? ORDER BY created_at ASC,id ASC LIMIT ?",
                cutoff,
                ARCHIVE_BATCH_MAX_EVENTS)
            : db.list(
                "SELECT id,chain_seq,event_hash,created_at,action,result FROM audit_event"
                    + " WHERE created_at>=? AND created_at<? ORDER BY created_at ASC,id ASC LIMIT ?",
                prevBoundary,
                cutoff,
                ARCHIVE_BATCH_MAX_EVENTS);
    Problem.require(!events.isEmpty(), 409, "No unarchived audit events in selected period");

    Instant fromAt =
        prevBoundary != null
            ? prevBoundary
            : Instant.parse(events.getFirst().get("createdAt").toString());
    Instant toAt =
        events.size() < ARCHIVE_BATCH_MAX_EVENTS
            ? cutoff
            : Instant.parse(events.getLast().get("createdAt").toString()).plusNanos(1000);

    Long firstSeq = null;
    Long lastSeq = null;
    for (var ev : events) {
      if (ev.get("chainSeq") instanceof Number n) {
        long seq = n.longValue();
        if (firstSeq == null) firstSeq = seq;
        lastSeq = seq;
      }
    }

    String batchId = Db.id();
    String batchHash = AuditHashChain.computeBatchHash(crypto, fromAt, toAt, events);
    db.update(
        "INSERT INTO audit_archive_batch("
            + "id,from_created_at,to_created_at,event_count,first_chain_seq,last_chain_seq,"
            + "batch_hash,retention_days,created_by,created_at,notes)"
            + " VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        batchId,
        fromAt,
        toAt,
        events.size(),
        firstSeq,
        lastSeq,
        batchHash,
        archiveRetentionDays,
        actor.id(),
        now,
        cleanNotes);
    audit.record(actor.id(), "AUDIT_ARCHIVE_CREATED", batchId);

    return new AuditArchiveBatch(
        batchId,
        fromAt.toString(),
        toAt.toString(),
        events.size(),
        firstSeq,
        lastSeq,
        batchHash,
        archiveRetentionDays,
        actor.id(),
        now.toString(),
        cleanNotes);
  }

  private void appendFilters(StringBuilder sql, List<Object> args, AuditFilter f) {
    Problem.require(
        f.from() == null || f.to() == null || f.from().isBefore(f.to()), 400, "Invalid time range");
    if (f.from() != null) {
      sql.append(" AND a.created_at>=?");
      args.add(f.from());
    }
    if (f.to() != null) {
      sql.append(" AND a.created_at<?");
      args.add(f.to());
    }
    if (f.actorId() != null) {
      sql.append(" AND a.actor_id=?");
      args.add(f.actorId().toString());
    }
    if (f.resourceId() != null && !f.resourceId().isBlank()) {
      String res = f.resourceId().strip();
      Problem.require(res.length() <= 128, 400, "Invalid audit filter");
      sql.append(" AND a.resource_id=?");
      args.add(res);
    }
    if (f.result() != null && !f.result().isBlank()) {
      String res = f.result().strip().toUpperCase(Locale.ROOT);
      Problem.require(AuditActionCatalog.VALID_RESULTS.contains(res), 400, "Invalid audit filter");
      sql.append(" AND a.result=?");
      args.add(res);
    }
    if (f.actorType() != null && !f.actorType().isBlank()) {
      String type = f.actorType().strip().toUpperCase(Locale.ROOT);
      Problem.require(
          AuditActionCatalog.VALID_ACTOR_TYPES.contains(type), 400, "Invalid audit filter");
      sql.append(" AND a.actor_type=?");
      args.add(type);
    }
    if (f.correlationId() != null) {
      sql.append(" AND a.correlation_id=?");
      args.add(f.correlationId().toString());
    }
    if (f.category() != null && !f.category().isBlank()) {
      String cat = f.category().strip().toUpperCase(Locale.ROOT);
      String clause = AuditActionCatalog.CATEGORY_SQL.get(cat);
      Problem.require(clause != null, 400, "Invalid audit filter");
      sql.append(" AND ").append(clause);
    }
    if (f.action() != null && !f.action().isBlank()) {
      String act = f.action().strip();
      Problem.require(act.length() <= 64, 400, "Invalid audit filter");
      String upper = act.toUpperCase(Locale.ROOT);
      if (upper.endsWith("*") || upper.endsWith("_")) {
        String prefix = upper.endsWith("*") ? upper.substring(0, upper.length() - 1) : upper;
        Problem.require(!prefix.isEmpty(), 400, "Invalid audit filter");
        sql.append(" AND a.action LIKE ? ESCAPE '!'");
        args.add(escapeLike(prefix) + "%");
      } else if (AuditActionCatalog.isKnownExactAction(upper)) {
        sql.append(" AND a.action=?");
        args.add(upper);
      } else {
        sql.append(" AND LOCATE(?,LOWER(a.action))>0");
        args.add(act.toLowerCase(Locale.ROOT));
      }
    }
    if (f.excludeReadNoise()) {
      sql.append(" AND a.action NOT IN (");
      for (int i = 0; i < AuditActionCatalog.READ_NOISE_ACTIONS.size(); i++) {
        if (i > 0) sql.append(',');
        sql.append('?');
        args.add(AuditActionCatalog.READ_NOISE_ACTIONS.get(i));
      }
      sql.append(')');
    }
  }

  private static void enrichRows(List<Map<String, Object>> rows) {
    for (var row : rows) {
      Object accountUsername = row.remove("accountUsername");
      Object accountStaff = row.remove("accountStaff");
      String actorType = asStringOrNull(row.get("actorType"));
      String actorId = asStringOrNull(row.get("actorId"));
      row.put(
          "actorLabel",
          AuditActionCatalog.sanitizeActorLabel(
              actorType, row.get("actorLabel"), accountUsername, accountStaff, actorId));
    }
  }

  private static AuditArchiveBatch toBatch(Map<String, Object> row) {
    return new AuditArchiveBatch(
        row.get("id").toString(),
        row.get("fromCreatedAt").toString(),
        row.get("toCreatedAt").toString(),
        ((Number) row.get("eventCount")).intValue(),
        asNullableLong(row.get("firstChainSeq")),
        asNullableLong(row.get("lastChainSeq")),
        row.get("batchHash").toString(),
        ((Number) row.get("retentionDays")).intValue(),
        asStringOrNull(row.get("createdBy")),
        row.get("createdAt").toString(),
        asStringOrNull(row.get("notes")));
  }

  private static String escapeLike(String raw) {
    return raw.replace("!", "!!").replace("%", "!%").replace("_", "!_");
  }

  private static long asLong(Object value) {
    return value instanceof Number n ? n.longValue() : 0L;
  }

  private static Long asNullableLong(Object value) {
    return value instanceof Number n ? n.longValue() : null;
  }

  private static String asStringOrNull(Object value) {
    return value == null ? null : value.toString();
  }

  private static String sha256Hex(String content) {
    try {
      byte[] digest =
          MessageDigest.getInstance("SHA-256").digest(content.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digest);
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }
}
