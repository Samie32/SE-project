package com.clinic.clinical;

import com.clinic.audit.Audit;
import com.clinic.auth.Access;
import com.clinic.common.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ClinicalService {
  private final Db db;
  private final CareAccess care;
  private final Audit audit;
  private final Crypto crypto;
  private final Clock clock;
  private final ObjectMapper json;

  public ClinicalService(
      Db db, CareAccess care, Audit audit, Crypto crypto, Clock clock, ObjectMapper json) {
    this.db = db;
    this.care = care;
    this.audit = audit;
    this.crypto = crypto;
    this.clock = clock;
    this.json = json;
  }

  private void active(Map<String, Object> e) {
    Problem.require("IN_PROGRESS".equals(e.get("status")), 409, "Encounter is complete");
  }

  private void content(String value) {
    Problem.require(
        value != null && !value.isBlank() && value.length() <= 100000,
        422,
        "Record content must contain 1 to 100000 characters");
  }

  private Map<String, Object> record(Map<String, Object> row) {
    row.put("content", crypto.decrypt((byte[]) row.remove("contentEncrypted")));
    return row;
  }

  public Map<String, Object> save(
      Access.Actor actor, String encounter, int version, String content, String status) {
    active(care.encounter(actor, encounter));
    content(content);
    Problem.require(Set.of("DRAFT", "FINAL").contains(status), 422, "Invalid record status");
    var records =
        db.list(
            "SELECT * FROM medical_record WHERE encounter_id=? ORDER BY version DESC", encounter);
    String id;
    if (records.isEmpty()) {
      Problem.require(version == 0, 409, "Initial version must be zero");
      id = Db.id();
      db.update(
          "INSERT INTO medical_record(id,encounter_id,version,status,content_encrypted,created_at)"
              + " VALUES(?,?,1,?,?,?)",
          id,
          encounter,
          status,
          crypto.encrypt(content),
          clock.instant());
    } else {
      var latest = records.getFirst();
      care.version(latest, version);
      Problem.require(
          "DRAFT".equals(latest.get("status")), 409, "Final records require an amendment");
      id = latest.get("id").toString();
      db.update(
          "UPDATE medical_record SET version=version+1,status=?,content_encrypted=? WHERE id=?",
          status,
          crypto.encrypt(content),
          id);
    }
    audit.record(actor.id(), "RECORD_" + status, id);
    return record(db.one("SELECT * FROM medical_record WHERE id=?", id));
  }

  public Map<String, Object> amend(
      Access.Actor actor, String id, int version, String content, String reason) {
    content(content);
    Problem.require(
        reason != null && !reason.isBlank() && reason.length() <= 1000,
        422,
        "Amendment reason required");
    var old = db.one("SELECT * FROM medical_record WHERE id=?", id);
    care.encounter(actor, old.get("encounterId").toString());
    var latest =
        db.one(
            "SELECT * FROM medical_record WHERE encounter_id=? ORDER BY version DESC LIMIT 1",
            old.get("encounterId"));
    care.version(latest, version);
    Problem.require(
        id.equals(latest.get("id")) && "FINAL".equals(latest.get("status")),
        409,
        "Amend only the latest final record");
    String next = Db.id();
    db.update(
        "INSERT INTO"
            + " medical_record(id,encounter_id,version,status,content_encrypted,supersedes_id,amendment_reason,created_at)"
            + " VALUES(?,?,?,'FINAL',?,?,?,?)",
        next,
        old.get("encounterId"),
        version + 1,
        crypto.encrypt(content),
        id,
        reason,
        clock.instant());
    audit.record(actor.id(), "RECORD_AMENDED", next);
    return record(db.one("SELECT * FROM medical_record WHERE id=?", next));
  }

  public Map<String, Object> encounterRecord(Access.Actor actor, String encounter) {
    var e = db.one("SELECT * FROM encounter WHERE id=?", encounter);
    var a = db.one("SELECT * FROM appointment WHERE id=?", e.get("appointmentId"));
    care.participant(actor, a);
    var r =
        db.one(
            "SELECT * FROM medical_record WHERE encounter_id=? AND (status='FINAL' OR ?=TRUE) ORDER"
                + " BY version DESC LIMIT 1",
            encounter,
            care.isDoctor(actor, a));
    audit.record(actor.id(), "RECORD_READ", r.get("id").toString());
    return record(r);
  }

  /**
   * Own patient history, or FINAL history during treatment; after treatment only own encounters.
   */
  private List<Map<String, Object>> history(
      Access.Actor actor, String patient, String table, String status, int limit, int offset) {
    Problem.require(limit > 0 && limit <= 100 && offset >= 0, 400, "Invalid pagination");
    boolean own =
        actor.has("PATIENT")
            && db.count(
                    "SELECT COUNT(*) FROM patient WHERE id=? AND user_id=?", patient, actor.id())
                == 1;
    boolean treating =
        actor.has("DOCTOR")
            && db.count(
                    "SELECT COUNT(*) FROM appointment a JOIN doctor d ON d.id=a.doctor_id WHERE"
                        + " a.patient_id=? AND d.user_id=? AND a.status IN"
                        + " ('CONFIRMED','CHECKED_IN','IN_PROGRESS')",
                    patient,
                    actor.id())
                > 0;
    if (!own && !treating) {
      actor.require("DOCTOR");
      Problem.require(
          db.count(
                  "SELECT COUNT(*) FROM appointment a JOIN doctor d ON d.id=a.doctor_id WHERE"
                      + " a.patient_id=? AND d.user_id=? AND a.status='COMPLETED'",
                  patient,
                  actor.id())
              > 0,
          404,
          "Resource not found");
    }
    var rows =
        db.list(
            "SELECT r.*,a.patient_id,a.doctor_id,a.start_at FROM "
                + table
                + " r JOIN encounter e ON e.id=r.encounter_id JOIN appointment a ON"
                + " a.id=e.appointment_id JOIN doctor d ON d.id=a.doctor_id WHERE a.patient_id=?"
                + " AND r.status=? AND (?=TRUE OR d.user_id=?) ORDER BY a.start_at DESC,r.id LIMIT"
                + " ? OFFSET ?",
            patient,
            status,
            own || treating,
            actor.id(),
            limit,
            offset);
    audit.record(
        actor.id(),
        table.equals("medical_record") ? "PATIENT_RECORDS_READ" : "PATIENT_PRESCRIPTIONS_READ",
        patient);
    return rows;
  }

  public List<Map<String, Object>> records(
      Access.Actor actor, String patient, int limit, int offset) {
    return history(actor, patient, "medical_record", "FINAL", limit, offset).stream()
        .map(this::record)
        .toList();
  }

  private String items(List<ClinicalController.Item> items, boolean issuing) {
    Problem.require(
        items != null && items.size() <= 100 && (!issuing || !items.isEmpty()),
        422,
        "Prescription requires valid medicine items");
    for (var item : items) {
      Problem.require(item != null, 422, "Invalid medicine item");
      for (String field :
          Arrays.asList(
              item.medicineName(),
              item.doseText(),
              item.route(),
              item.frequency(),
              item.durationText()))
        Problem.require(
            field != null && !field.isBlank() && field.length() <= 1000,
            422,
            "Complete all medicine fields");
    }
    try {
      return json.writeValueAsString(items);
    } catch (Exception e) {
      throw new IllegalStateException("Cannot encode prescription");
    }
  }

  private Map<String, Object> prescription(Map<String, Object> p) {
    try {
      p.put(
          "items",
          json.readValue(
              crypto.decrypt((byte[]) p.remove("itemsEncrypted")),
              new TypeReference<List<ClinicalController.Item>>() {}));
    } catch (Exception e) {
      throw new IllegalStateException("Cannot decode prescription");
    }
    return p;
  }

  public Map<String, Object> prescribe(
      Access.Actor actor, String encounter, List<ClinicalController.Item> items) {
    active(care.encounter(actor, encounter));
    String encoded = items(items, false), id = Db.id();
    db.update(
        "INSERT INTO prescription(id,encounter_id,items_encrypted,created_at) VALUES(?,?,?,?)",
        id,
        encounter,
        crypto.encrypt(encoded),
        clock.instant());
    audit.record(actor.id(), "PRESCRIPTION_CREATED", id);
    return prescription(db.one("SELECT * FROM prescription WHERE id=?", id));
  }

  public Map<String, Object> updatePrescription(
      Access.Actor actor, String id, int version, List<ClinicalController.Item> items) {
    var initial = db.one("SELECT * FROM prescription WHERE id=?", id);
    active(care.encounter(actor, initial.get("encounterId").toString()));
    var p = db.one("SELECT * FROM prescription WHERE id=? FOR UPDATE", id);
    care.version(p, version);
    Problem.require("DRAFT".equals(p.get("status")), 409, "Issued prescriptions are immutable");
    db.update(
        "UPDATE prescription SET items_encrypted=?,version=version+1 WHERE id=?",
        crypto.encrypt(items(items, false)),
        id);
    audit.record(actor.id(), "PRESCRIPTION_UPDATED", id);
    return prescription(db.one("SELECT * FROM prescription WHERE id=?", id));
  }

  public Map<String, Object> issue(Access.Actor actor, String id, int version) {
    var initial = db.one("SELECT * FROM prescription WHERE id=?", id);
    active(care.encounter(actor, initial.get("encounterId").toString()));
    var p = db.one("SELECT * FROM prescription WHERE id=? FOR UPDATE", id);
    care.version(p, version);
    Problem.require("DRAFT".equals(p.get("status")), 409, "Prescription already issued");
    try {
      items(
          json.readValue(
              crypto.decrypt((byte[]) p.get("itemsEncrypted")),
              new TypeReference<List<ClinicalController.Item>>() {}),
          true);
    } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
      throw new IllegalStateException("Invalid stored prescription");
    }
    db.update(
        "UPDATE prescription SET status='ISSUED',version=version+1,issued_at=? WHERE id=?",
        clock.instant(),
        id);
    audit.record(actor.id(), "PRESCRIPTION_ISSUED", id);
    return prescription(db.one("SELECT * FROM prescription WHERE id=?", id));
  }

  public List<Map<String, Object>> prescriptions(
      Access.Actor actor, String patient, int limit, int offset) {
    return history(actor, patient, "prescription", "ISSUED", limit, offset).stream()
        .map(this::prescription)
        .toList();
  }

  public List<Map<String, Object>> encounterPrescriptions(Access.Actor actor, String encounter) {
    var e = db.one("SELECT * FROM encounter WHERE id=?", encounter);
    var a = db.one("SELECT * FROM appointment WHERE id=?", e.get("appointmentId"));
    care.participant(actor, a);
    var rows =
        db.list(
            "SELECT * FROM prescription WHERE encounter_id=? AND (status='ISSUED' OR ?=TRUE) ORDER"
                + " BY created_at,id",
            encounter,
            care.isDoctor(actor, a));
    audit.record(actor.id(), "ENCOUNTER_PRESCRIPTIONS_READ", encounter);
    return rows.stream().map(this::prescription).toList();
  }
}
