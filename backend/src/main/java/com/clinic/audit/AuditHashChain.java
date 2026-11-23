package com.clinic.audit;

import com.clinic.common.Crypto;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

public final class AuditHashChain {
  private AuditHashChain() {}

  public static final String GENESIS_HASH = "0".repeat(64);
  public static final String ALGORITHM = "HMAC-SHA256-CHAIN-V1";

  public static Instant normalizeTimestamp(Instant instant) {
    return instant.truncatedTo(ChronoUnit.MICROS);
  }

  public static String formatMicros(Instant instant) {
    Instant t = normalizeTimestamp(instant);
    return t.getEpochSecond() + "." + String.format(Locale.ROOT, "%06d", t.getNano() / 1000);
  }

  public static String computeEventHash(
      Crypto crypto,
      long chainSeq,
      String prevHash,
      String id,
      Instant createdAt,
      String actorType,
      String actorId,
      String actorLabel,
      String action,
      String resourceId,
      String result,
      String correlationId) {
    String payload =
        String.join(
            "|",
            "v1",
            Long.toString(chainSeq),
            str(prevHash),
            str(id),
            formatMicros(createdAt),
            str(actorType),
            str(actorId),
            str(actorLabel),
            str(action),
            str(resourceId),
            str(result),
            str(correlationId));
    return crypto.auditMac(payload);
  }

  public static String computeBatchHash(
      Crypto crypto, Instant from, Instant to, List<Map<String, Object>> events) {
    StringBuilder sb = new StringBuilder();
    sb.append("batch-v1|")
        .append(formatMicros(from))
        .append("|")
        .append(formatMicros(to))
        .append("|")
        .append(events.size());
    for (var event : events) {
      Instant createdAt = Instant.parse(event.get("createdAt").toString());
      sb.append("\n")
          .append(str(event.get("id")))
          .append("|")
          .append(str(event.get("chainSeq")))
          .append("|")
          .append(str(event.get("eventHash")))
          .append("|")
          .append(formatMicros(createdAt))
          .append("|")
          .append(str(event.get("action")))
          .append("|")
          .append(str(event.get("result")));
    }
    return crypto.auditMac(sb.toString());
  }

  public static boolean constantTimeEquals(String expected, String actual) {
    return expected != null
        && actual != null
        && MessageDigest.isEqual(
            expected.getBytes(StandardCharsets.UTF_8), actual.getBytes(StandardCharsets.UTF_8));
  }

  private static String str(Object value) {
    return value == null ? "" : value.toString();
  }
}
