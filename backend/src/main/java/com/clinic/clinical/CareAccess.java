package com.clinic.clinical;

import com.clinic.auth.Access;
import com.clinic.common.*;
import java.util.Map;
import org.springframework.stereotype.Component;

/** Shared resource authorization. Clinical writes never inherit the administrator bypass. */
@Component
public class CareAccess {
  private final Db db;

  public CareAccess(Db db) {
    this.db = db;
  }

  public Map<String, Object> lockAppointment(String id) {
    var original = db.one("SELECT doctor_id FROM appointment WHERE id=?", id);
    db.one("SELECT id FROM doctor WHERE id=? FOR UPDATE", original.get("doctorId"));
    return db.one("SELECT * FROM appointment WHERE id=? FOR UPDATE", id);
  }

  public boolean isDoctor(Access.Actor actor, Map<String, Object> a) {
    return actor.has("DOCTOR")
        && db.count(
                "SELECT COUNT(*) FROM doctor WHERE id=? AND user_id=?",
                a.get("doctorId"),
                actor.id())
            == 1;
  }

  public boolean isPatient(Access.Actor actor, Map<String, Object> a) {
    return actor.has("PATIENT")
        && db.count(
                "SELECT COUNT(*) FROM patient WHERE id=? AND user_id=?",
                a.get("patientId"),
                actor.id())
            == 1;
  }

  public void doctor(Access.Actor actor, Map<String, Object> a) {
    Problem.require(isDoctor(actor, a), 403, "Assigned doctor required");
  }

  public void participant(Access.Actor actor, Map<String, Object> a) {
    Problem.require(isDoctor(actor, a) || isPatient(actor, a), 404, "Resource not found");
  }

  public Map<String, Object> encounter(Access.Actor actor, String id) {
    var e = db.one("SELECT * FROM encounter WHERE id=?", id);
    var a = lockAppointment(e.get("appointmentId").toString());
    doctor(actor, a);
    return db.one("SELECT * FROM encounter WHERE id=? FOR UPDATE", id);
  }

  public void version(Map<String, Object> row, int expected) {
    Problem.require(((Number) row.get("version")).intValue() == expected, 409, "Stale version");
  }
}
