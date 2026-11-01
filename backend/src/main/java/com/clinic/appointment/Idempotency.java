package com.clinic.appointment;

import com.clinic.common.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Component;

@Component
public class Idempotency {
  private final Db db;
  private final ObjectMapper json;
  private final Clock clock;

  public Idempotency(Db db, ObjectMapper json, Clock clock) {
    this.db = db;
    this.json = json;
    this.clock = clock;
  }

  public Map<String, Object> begin(String actor, String operation, String key, Object payload) {
    Problem.require(
        key != null && key.matches("[A-Za-z0-9._:-]{1,128}"),
        400,
        "Valid Idempotency-Key required");
    String hash = hash(payload);
    db.update(
        "INSERT INTO idempotency_record(actor_id,operation,request_key,request_hash,expires_at)"
            + " VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE request_key=request_key",
        actor,
        operation,
        key,
        hash,
        clock.instant().plus(Duration.ofHours(24)));
    var row =
        db.one(
            "SELECT * FROM idempotency_record WHERE actor_id=? AND operation=? AND request_key=?"
                + " FOR UPDATE",
            actor,
            operation,
            key);
    if (!Db.instant(row, "expiresAt").isAfter(clock.instant())) {
      db.update(
          "UPDATE idempotency_record SET request_hash=?,response_json=NULL,expires_at=? WHERE"
              + " actor_id=? AND operation=? AND request_key=?",
          hash,
          clock.instant().plus(Duration.ofHours(24)),
          actor,
          operation,
          key);
      return null;
    }
    Problem.require(
        hash.equals(row.get("requestHash")),
        409,
        "Idempotency key already used with different payload");
    if (row.get("responseJson") == null) return null;
    try {
      return json.readValue(
          row.get("responseJson").toString(),
          new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
    } catch (Exception e) {
      throw new IllegalStateException("Invalid persisted response", e);
    }
  }

  public void complete(String actor, String op, String key, Map<String, Object> result) {
    try {
      db.update(
          "UPDATE idempotency_record SET response_json=? WHERE actor_id=? AND operation=? AND"
              + " request_key=?",
          json.writeValueAsString(result),
          actor,
          op,
          key);
    } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
      throw new IllegalStateException(e);
    }
  }

  private String hash(Object payload) {
    try {
      return HexFormat.of()
          .formatHex(MessageDigest.getInstance("SHA-256").digest(json.writeValueAsBytes(payload)));
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }
}
