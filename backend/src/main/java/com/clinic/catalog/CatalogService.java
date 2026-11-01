package com.clinic.catalog;

import com.clinic.audit.Audit;
import com.clinic.auth.Access;
import com.clinic.common.*;
import java.time.Clock;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CatalogService {
  private final Db db;
  private final Audit audit;
  private final Clock clock;

  public CatalogService(Db db, Audit audit, Clock clock) {
    this.db = db;
    this.audit = audit;
    this.clock = clock;
  }

  public List<Map<String, Object>> specialties() {
    return db.list("SELECT * FROM specialty WHERE active=TRUE ORDER BY name");
  }

  public List<Map<String, Object>> doctors() {
    return db.list(
        "SELECT d.id,d.active,u.display_name,ds.specialty_id FROM doctor d JOIN user_account u ON"
            + " u.id=d.user_id JOIN doctor_specialty ds ON ds.doctor_id=d.id ORDER BY"
            + " u.display_name");
  }

  @Transactional
  public Map<String, Object> specialty(Access.Actor actor, String name) {
    actor.require("ADMINISTRATOR");
    String id = Db.id();
    Problem.require(!name.strip().isEmpty(), 422, "Name required");
    db.update("INSERT INTO specialty(id,name) VALUES(?,?)", id, name.strip());
    audit.record(actor.id(), "SPECIALTY_CREATED", id);
    return db.one("SELECT * FROM specialty WHERE id=?", id);
  }

  @Transactional
  public Map<String, Object> doctor(Access.Actor actor, String userId, List<UUID> specialties) {
    actor.require("ADMINISTRATOR");
    db.one("SELECT id FROM user_account WHERE id=? FOR UPDATE", userId);
    String id = Db.id();
    db.update("INSERT INTO doctor(id,user_id) VALUES(?,?)", id, userId);
    for (UUID sid : new HashSet<>(specialties)) {
      db.one("SELECT id FROM specialty WHERE id=? AND active=TRUE", sid.toString());
      db.update("INSERT INTO doctor_specialty VALUES(?,?)", id, sid.toString());
    }
    db.update("INSERT IGNORE INTO user_role VALUES(?,'DOCTOR')", userId);
    audit.record(actor.id(), "DOCTOR_CREATED", id);
    return db.one("SELECT * FROM doctor WHERE id=?", id);
  }

  @Transactional
  public Map<String, Object> updateDoctor(
      Access.Actor actor, String id, boolean active, String name, List<UUID> specialties) {
    actor.require("ADMINISTRATOR");
    var doctor = db.one("SELECT * FROM doctor WHERE id=? FOR UPDATE", id);
    if (!active)
      Problem.require(
          db.count(
                  "SELECT COUNT(*) FROM appointment WHERE doctor_id=? AND end_at>? AND status IN"
                      + " ('CONFIRMED','CHECKED_IN','IN_PROGRESS')",
                  id,
                  clock.instant())
              == 0,
          409,
          "Doctor has active appointments");
    db.update("UPDATE doctor SET active=? WHERE id=?", active, id);
    db.update(
        "UPDATE user_account SET display_name=? WHERE id=?", name.strip(), doctor.get("userId"));
    db.update("DELETE FROM doctor_specialty WHERE doctor_id=?", id);
    for (UUID sid : new HashSet<>(specialties)) {
      db.one("SELECT id FROM specialty WHERE id=? AND active=TRUE", sid.toString());
      db.update("INSERT INTO doctor_specialty VALUES(?,?)", id, sid.toString());
    }
    audit.record(actor.id(), "DOCTOR_UPDATED", id);
    return db.one("SELECT * FROM doctor WHERE id=?", id);
  }
}
