package com.clinic.auth;

import com.clinic.audit.Audit;
import com.clinic.common.*;
import java.util.*;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class Access {
  static final Set<String> STAFF_ROLES = Set.of("DOCTOR", "RECEPTIONIST", "ADMINISTRATOR", "AUDITOR");
  public record Actor(String id, Set<String> roles) {
    public void require(String... allowed) {
      Problem.require(
          Arrays.stream(allowed).anyMatch(roles::contains), 403, "Insufficient permission");
    }

    public boolean has(String role) {
      return roles.contains(role);
    }

    public void requireSchedulingCatalogRead() {
      require("PATIENT", "DOCTOR", "RECEPTIONIST", "ADMINISTRATOR");
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
    String username = identityLabel(jwt.getClaimAsString("preferred_username"));
    String byIdentity = "SELECT id,active,username FROM user_account WHERE issuer=? AND subject=?";
    var rows = db.list(byIdentity, issuer, subject);
    boolean firstLogin = rows.isEmpty();
    Map<String, Object> row;
    if (firstLogin) {
      String id =
          UUID.nameUUIDFromBytes(
                  (issuer + "|" + subject).getBytes(java.nio.charset.StandardCharsets.UTF_8))
              .toString();
      // Only PATIENT is auto-provisioned. JWT role claims never grant internal privileges.
      String displayName = identityLabel(jwt.getClaimAsString("name"));
      int inserted =
          db.update(
              "INSERT IGNORE INTO user_account(id,issuer,subject,display_name,username) VALUES(?,?,?,?,?)",
              id,
              issuer,
              subject,
              displayName != null ? displayName : Objects.requireNonNullElse(username, "Patient"),
              username);
      if (inserted == 1) {
        db.update("INSERT INTO user_role VALUES(?,'PATIENT')", id);
        db.update("INSERT INTO patient VALUES(?,?)", id, id);
        audit.record(id, "ACCOUNT_REGISTERED", id);
      }
      // The original snapshot may predate a concurrent registration that won the insert.
      row = db.one(byIdentity + " FOR SHARE", issuer, subject);
    } else {
      row = rows.getFirst();
    }
    Problem.require(
        Boolean.TRUE.equals(row.get("active")) || "1".equals(row.get("active").toString()),
        403,
        "Account disabled");
    String id = row.get("id").toString();
    if (username != null && !username.equals(row.get("username"))) {
      db.update("UPDATE user_account SET username=? WHERE id=?", username, id);
    }
    Set<String> roles = new HashSet<>();
    db.list("SELECT role FROM user_role WHERE user_id=?" + (firstLogin ? " FOR SHARE" : ""), id)
        .forEach(x -> roles.add(x.get("role").toString()));
    return new Actor(id, roles);
  }

  private static String identityLabel(String value) {
    return value == null || value.isBlank() || value.length() > 255 ? null : value.strip();
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
  public Map<String, Object> createStaff(Actor actor, String issuer, String subject, String username, String name) {
    actor.require("ADMINISTRATOR");
    String id = Db.id();
    int inserted = db.update(
        "INSERT IGNORE INTO user_account(id,issuer,subject,username,display_name,staff) VALUES(?,?,?,?,?,TRUE)",
        id, issuer, subject, username.strip(), name.strip());
    var account = db.one("SELECT id,staff,username FROM user_account WHERE issuer=? AND subject=? FOR UPDATE", issuer, subject);
    Problem.require(enabled(account.get("staff")), 409, "Patient account cannot be enrolled as staff");
    if (inserted == 0 && account.get("username") == null) {
      db.update("UPDATE user_account SET username=? WHERE id=?", username.strip(), account.get("id"));
    }
    if (inserted == 1) audit.record(actor.id(), "STAFF_CREATED", id);
    return Map.of("id", account.get("id"));
  }

  @Transactional
  public void updateStaff(Actor actor, String userId, String displayName, boolean active) {
    actor.require("ADMINISTRATOR");
    var account = db.one("SELECT id,active FROM user_account WHERE id=? AND staff=TRUE FOR UPDATE", userId);
    Problem.require(active || !actor.id().equals(userId), 409, "Cannot disable your own account");
    if (!active && enabled(account.get("active"))) requireDoctorPaused(userId);
    db.update("UPDATE user_account SET display_name=?,active=? WHERE id=?", displayName.strip(), active, userId);
    audit.record(actor.id(), "STAFF_UPDATED", userId);
  }

  private static boolean enabled(Object value) {
    return Boolean.TRUE.equals(value) || "1".equals(String.valueOf(value));
  }

  private void requireDoctorPaused(String userId) {
    Problem.require(db.count("SELECT COUNT(*) FROM doctor WHERE user_id=? AND active=TRUE", userId) == 0,
        409, "Pause doctor scheduling first");
  }

  @Transactional
  public void roles(Actor actor, String userId, Set<String> roles) {
    actor.require("ADMINISTRATOR");
    db.one("SELECT id FROM user_account WHERE id=? AND staff=TRUE FOR UPDATE", userId);
    Problem.require(!actor.id().equals(userId), 409, "Self role changes are not allowed");
    var staffRoles = new HashSet<>(roles);
    staffRoles.remove("PATIENT");
    Problem.require(STAFF_ROLES.containsAll(staffRoles)
        && (!roles.contains("PATIENT") || db.count(
            "SELECT COUNT(*) FROM user_role WHERE user_id=? AND role='PATIENT'", userId) == 1),
        422, "Invalid roles");
    if (roles.contains("DOCTOR"))
      Problem.require(
          db.count("SELECT COUNT(*) FROM doctor WHERE user_id=?", userId) > 0,
          409,
          "Create doctor profile first");
    else if (db.count("SELECT COUNT(*) FROM user_role WHERE user_id=? AND role='DOCTOR'", userId) == 1)
      requireDoctorPaused(userId);
    db.update("DELETE FROM user_role WHERE user_id=?", userId);
    for (String role : roles) db.update("INSERT INTO user_role VALUES(?,?)", userId, role);
    audit.record(actor.id(), "ROLES_CHANGED", userId);
  }

  @Transactional
  public void contact(Actor actor, String email) {
    db.update(
        "UPDATE user_account SET email_encrypted=? WHERE id=?", crypto.encrypt(email), actor.id());
    audit.record(actor.id(), "CONTACT_UPDATED", actor.id());
  }

  @Transactional
  public Map<String, Object> profile(Actor actor) {
    var result = db.one("SELECT id,display_name,active FROM user_account WHERE id=?", actor.id());
    result.put("roles", actor.roles());
    var patients = db.list("SELECT id FROM patient WHERE user_id=?", actor.id());
    var doctors = db.list("SELECT id FROM doctor WHERE user_id=?", actor.id());
    result.put("patientId", patients.isEmpty() ? null : patients.getFirst().get("id"));
    result.put("doctorId", doctors.isEmpty() ? null : doctors.getFirst().get("id"));
    audit.record(actor.id(), "PROFILE_READ", actor.id());
    return result;
  }

  @Transactional
  public List<Map<String, Object>> users(Actor actor, int limit, int offset, String query, String role, Boolean active) {
    actor.require("ADMINISTRATOR");
    Problem.require(limit > 0 && limit <= 100 && offset >= 0, 400, "Invalid pagination");
    String term = query.strip().toLowerCase(Locale.ROOT);
    Problem.require(term.length() <= 255, 400, "Invalid search query");
    Problem.require(role.isEmpty() || STAFF_ROLES.contains(role) || "UNASSIGNED".equals(role), 400, "Invalid role filter");
    var users =
        db.list(
            "SELECT u.id,u.display_name,u.username,u.active,d.id AS doctor_id"
                + " FROM user_account u LEFT JOIN doctor d ON d.user_id=u.id"
                + " WHERE u.staff=TRUE AND (?='' OR LOCATE(?,LOWER(u.display_name))>0 OR LOCATE(?,LOWER(u.username))>0)"
                + " AND (? IS NULL OR u.active=?)"
                + " AND (?='' OR EXISTS (SELECT 1 FROM user_role r WHERE r.user_id=u.id AND r.role=?)"
                + " OR (?='UNASSIGNED' AND NOT EXISTS"
                + " (SELECT 1 FROM user_role r WHERE r.user_id=u.id AND r.role<>'PATIENT')))"
                + " ORDER BY u.display_name,u.id LIMIT ? OFFSET ?",
            term,
            term,
            term,
            active,
            active,
            role,
            role,
            role,
            limit,
            offset);
    for (var user : users)
      user.put(
          "roles",
          db
              .list("SELECT role FROM user_role WHERE user_id=? ORDER BY role", user.get("id"))
              .stream()
              .map(x -> x.get("role"))
              .toList());
    audit.record(actor.id(), "USERS_READ", actor.id());
    return users;
  }
}
