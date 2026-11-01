package com.clinic.auth;

import com.clinic.audit.Audit;
import com.clinic.common.*;
import java.util.*;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class Access {
  public record Actor(String id, Set<String> roles) {
    public void require(String... allowed) {
      Problem.require(
          Arrays.stream(allowed).anyMatch(roles::contains), 403, "Insufficient permission");
    }

    public boolean has(String role) {
      return roles.contains(role);
    }
  }

  private final Db db;
  private final Audit audit;
  private final Crypto crypto;

  public Access(Db db, Audit audit, Crypto crypto) {
    this.db = db;
    this.audit = audit;
    this.crypto = crypto;
  }

  @Transactional
  public Actor actor(Jwt jwt) {
    String issuer = jwt.getIssuer().toString(), subject = jwt.getSubject();
    Problem.require(subject != null && !subject.isBlank(), 401, "Invalid identity");
    var rows =
        db.list("SELECT id,active FROM user_account WHERE issuer=? AND subject=?", issuer, subject);
    if (rows.isEmpty()) {
      String id =
          UUID.nameUUIDFromBytes(
                  (issuer + "|" + subject).getBytes(java.nio.charset.StandardCharsets.UTF_8))
              .toString();
      // Only PATIENT is auto-provisioned. JWT role claims never grant internal privileges.
      int inserted =
          db.update(
              "INSERT IGNORE INTO user_account(id,issuer,subject,display_name) VALUES(?,?,?,?)",
              id,
              issuer,
              subject,
              "Patient");
      if (inserted == 1) {
        db.update("INSERT INTO user_role VALUES(?,'PATIENT')", id);
        db.update("INSERT INTO patient VALUES(?,?)", id, id);
        audit.record(id, "ACCOUNT_REGISTERED", id);
      }
      rows =
          db.list(
              "SELECT id,active FROM user_account WHERE issuer=? AND subject=?", issuer, subject);
    }
    var row = rows.getFirst();
    Problem.require(
        Boolean.TRUE.equals(row.get("active")) || "1".equals(row.get("active").toString()),
        403,
        "Account disabled");
    String id = row.get("id").toString();
    Set<String> roles = new HashSet<>();
    db.list("SELECT role FROM user_role WHERE user_id=?", id)
        .forEach(x -> roles.add(x.get("role").toString()));
    return new Actor(id, roles);
  }

  public String patient(Actor actor) {
    actor.require("PATIENT");
    return db.one("SELECT id FROM patient WHERE user_id=?", actor.id()).get("id").toString();
  }

  public void doctor(Actor actor, String doctorId) {
    if (actor.has("ADMINISTRATOR")) return;
    actor.require("DOCTOR");
    Problem.require(
        db.count("SELECT COUNT(*) FROM doctor WHERE id=? AND user_id=?", doctorId, actor.id()) == 1,
        403,
        "Doctor assignment required");
  }

  @Transactional
  public void roles(Actor actor, String userId, Set<String> roles) {
    actor.require("ADMINISTRATOR");
    var allowed = Set.of("PATIENT", "DOCTOR", "RECEPTIONIST", "ADMINISTRATOR", "AUDITOR");
    Problem.require(!roles.isEmpty() && allowed.containsAll(roles), 422, "Invalid roles");
    db.one("SELECT id FROM user_account WHERE id=? FOR UPDATE", userId);
    Problem.require(!actor.id().equals(userId), 409, "Self role changes are not allowed");
    if (roles.contains("DOCTOR"))
      Problem.require(
          db.count("SELECT COUNT(*) FROM doctor WHERE user_id=?", userId) > 0,
          409,
          "Create doctor profile first");
    db.update("DELETE FROM user_role WHERE user_id=?", userId);
    for (String role : roles) db.update("INSERT INTO user_role VALUES(?,?)", userId, role);
    if (roles.contains("PATIENT"))
      db.update("INSERT IGNORE INTO patient VALUES(?,?)", userId, userId);
    audit.record(actor.id(), "ROLES_CHANGED", userId);
  }

  @Transactional
  public void contact(Actor actor, String email) {
    db.update(
        "UPDATE user_account SET email_encrypted=? WHERE id=?", crypto.encrypt(email), actor.id());
    audit.record(actor.id(), "CONTACT_UPDATED", actor.id());
  }
}
