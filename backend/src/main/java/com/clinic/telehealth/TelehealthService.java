package com.clinic.telehealth;

import com.clinic.audit.Audit;
import com.clinic.auth.Access;
import com.clinic.clinical.CareAccess;
import com.clinic.common.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Private WebRTC signaling rooms; media is exchanged by the clients, never stored here. */
@Service
@Transactional
public class TelehealthService {
  private final Db db;
  private final CareAccess care;
  private final Audit audit;
  private final Clock clock;
  private final Crypto crypto;

  public TelehealthService(Db db, CareAccess care, Audit audit, Clock clock, Crypto crypto) {
    this.db = db;
    this.care = care;
    this.audit = audit;
    this.clock = clock;
    this.crypto = crypto;
  }

  private void window(Map<String, Object> a) {
    Instant now = clock.instant(), start = Db.instant(a, "startAt");
    Problem.require(
        !now.isBefore(start.minusSeconds(600)) && now.isBefore(start.plusSeconds(900)),
        409,
        "Outside remote join window");
  }

  private Map<String, Object> appointment(String session) {
    var s = db.one("SELECT appointment_id FROM telehealth_session WHERE id=?", session);
    return care.lockAppointment(s.get("appointmentId").toString());
  }

  private Map<String, Object> session(String id) {
    return db.one("SELECT * FROM telehealth_session WHERE id=? FOR UPDATE", id);
  }

  private boolean running(Map<String, Object> s) {
    return Set.of("ACTIVE", "RECONNECTING").contains(s.get("status").toString());
  }

  private void open(Map<String, Object> s) {
    Problem.require(
        !Set.of("ENDED", "CANCELLED").contains(s.get("status").toString()),
        409,
        "Session is closed");
  }

  public Map<String, Object> prepare(Access.Actor actor, String appointment) {
    var a = care.lockAppointment(appointment);
    care.participant(actor, a);
    Problem.require("REMOTE".equals(a.get("mode")), 409, "Remote appointment required");
    var rows = db.list("SELECT * FROM telehealth_session WHERE appointment_id=?", appointment);
    if (!rows.isEmpty()) {
      var s = rows.getFirst();
      open(s);
      if (!running(s)) window(a);
      audit.record(actor.id(), "TELEHEALTH_READ", s.get("id").toString());
      return s;
    }
    Problem.require("CONFIRMED".equals(a.get("status")), 409, "Appointment is not CONFIRMED");
    window(a);
    String id = Db.id();
    db.update("INSERT INTO telehealth_session(id,appointment_id) VALUES(?,?)", id, appointment);
    audit.record(actor.id(), "TELEHEALTH_CREATED", id);
    return session(id);
  }

  public Map<String, Object> read(Access.Actor actor, String id) {
    var a = appointment(id);
    care.participant(actor, a);
    audit.record(actor.id(), "TELEHEALTH_READ", id);
    return session(id);
  }

  public Map<String, Object> join(Access.Actor actor, String id, boolean consent) {
    var a = appointment(id);
    care.participant(actor, a);
    var s = session(id);
    open(s);
    boolean patient = care.isPatient(actor, a);
    if (patient) Problem.require(consent, 422, "Patient consent required");
    if (!running(s)) {
      window(a);
      Problem.require(patient, 409, "Doctor must start the session before joining");
      Problem.require("CONFIRMED".equals(a.get("status")), 409, "Appointment is not CONFIRMED");
      if ("CREATED".equals(s.get("status")))
        db.update(
            "UPDATE telehealth_session SET"
                + " status='WAITING',patient_consented_at=?,version=version+1 WHERE id=?",
            clock.instant(),
            id);
    }
    byte[] random = new byte[32];
    new SecureRandom().nextBytes(random);
    String token = Base64.getUrlEncoder().withoutPadding().encodeToString(random);
    Instant expires = clock.instant().plusSeconds(300);
    db.update("DELETE FROM telehealth_token WHERE session_id=? AND user_id=?", id, actor.id());
    db.update(
        "INSERT INTO telehealth_token(token_hash,session_id,user_id,expires_at) VALUES(?,?,?,?)",
        hash(token),
        id,
        actor.id(),
        expires);
    audit.record(actor.id(), "TELEHEALTH_JOINED", id);
    return Map.of(
        "sessionId",
        id,
        "token",
        token,
        "expiresAt",
        expires.toString(),
        "signalingUrl",
        "/api/telehealth-sessions/" + id + "/signals");
  }

  public Map<String, Object> start(Access.Actor actor, String id, int version) {
    var a = appointment(id);
    care.doctor(actor, a);
    var s = session(id);
    care.version(s, version);
    window(a);
    Problem.require(
        !clock.instant().isBefore(Db.instant(a, "startAt")),
        409,
        "Cannot start before appointment time");
    Problem.require(
        "WAITING".equals(s.get("status"))
            && s.get("patientConsentedAt") != null
            && "CONFIRMED".equals(a.get("status")),
        409,
        "Admitted patient and waiting session required");
    db.update("UPDATE telehealth_session SET status='ACTIVE',version=version+1 WHERE id=?", id);
    db.update(
        "UPDATE appointment SET status='IN_PROGRESS',version=version+1 WHERE id=?", a.get("id"));
    db.update(
        "INSERT INTO encounter(id,appointment_id,started_at) VALUES(?,?,?)",
        Db.id(),
        a.get("id"),
        clock.instant());
    audit.record(actor.id(), "TELEHEALTH_STARTED", id);
    return session(id);
  }

  public Map<String, Object> end(Access.Actor actor, String id, int version) {
    var a = appointment(id);
    care.doctor(actor, a);
    var s = session(id);
    care.version(s, version);
    Problem.require(running(s), 409, "Only an active session can end");
    db.update(
        "UPDATE telehealth_session SET status='ENDED',version=version+1,ended_at=? WHERE id=?",
        clock.instant(),
        id);
    // Our room is the signaling service itself: revoke access durably in the same transaction.
    db.update("DELETE FROM telehealth_token WHERE session_id=?", id);
    db.update("DELETE FROM telehealth_signal WHERE session_id=?", id);
    audit.record(actor.id(), "TELEHEALTH_ENDED", id);
    return session(id);
  }

  public Map<String, Object> connection(
      Access.Actor actor, String id, int version, String state, String token) {
    var a = appointment(id);
    care.participant(actor, a);
    var s = session(id);
    authorizeToken(actor, id, token);
    care.version(s, version);
    Problem.require(
        running(s) && Set.of("ACTIVE", "RECONNECTING").contains(state),
        409,
        "Invalid connection transition");
    db.update("UPDATE telehealth_session SET status=?,version=version+1 WHERE id=?", state, id);
    audit.record(actor.id(), "TELEHEALTH_" + state, id);
    return session(id);
  }

  private static String hash(String token) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }

  private void authorizeToken(Access.Actor actor, String id, String token) {
    Problem.require(
        token != null
            && token.length() <= 128
            && db.count(
                    "SELECT COUNT(*) FROM telehealth_token WHERE token_hash=? AND session_id=? AND"
                        + " user_id=? AND expires_at>?",
                    hash(token),
                    id,
                    actor.id(),
                    clock.instant())
                == 1,
        403,
        "Invalid or expired room token");
  }

  public Map<String, Object> signal(
      Access.Actor actor, String id, String token, String kind, String payload) {
    var a = appointment(id);
    care.participant(actor, a);
    var s = session(id);
    authorizeToken(actor, id, token);
    Problem.require(running(s), 409, "Session is not active");
    Problem.require(
        kind != null
            && Set.of("OFFER", "ANSWER", "ICE").contains(kind)
            && payload != null
            && !payload.isBlank()
            && payload.length() <= 65536,
        422,
        "Invalid signaling message");
    Problem.require(
        db.count(
                "SELECT COUNT(*) FROM telehealth_signal WHERE session_id=? AND sender_id=? AND"
                    + " created_at>?",
                id,
                actor.id(),
                clock.instant().minusSeconds(60))
            < 300,
        429,
        "Too many signaling messages");
    db.update(
        "INSERT INTO telehealth_signal(session_id,sender_id,kind,payload_encrypted,created_at)"
            + " VALUES(?,?,?,?,?)",
        id,
        actor.id(),
        kind,
        crypto.encrypt(payload),
        clock.instant());
    audit.record(actor.id(), "TELEHEALTH_SIGNAL_SENT", id);
    return Map.of("accepted", true);
  }

  public List<Map<String, Object>> signals(
      Access.Actor actor, String id, String token, long after) {
    var a = appointment(id);
    care.participant(actor, a);
    var s = session(id);
    authorizeToken(actor, id, token);
    Problem.require(running(s), 409, "Session is not active");
    Problem.require(after >= 0, 400, "Invalid signal cursor");
    var rows =
        db.list(
            "SELECT id,kind,payload_encrypted,created_at FROM telehealth_signal WHERE session_id=?"
                + " AND sender_id<>? AND id>? AND created_at>? ORDER BY id LIMIT 100",
            id,
            actor.id(),
            after,
            clock.instant().minusSeconds(300));
    for (var row : rows)
      row.put("payload", crypto.decrypt((byte[]) row.remove("payloadEncrypted")));
    audit.record(actor.id(), "TELEHEALTH_SIGNALS_READ", id);
    return rows;
  }
}
