package com.clinic.audit;

import com.clinic.common.Db;
import java.time.Clock;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
public class Audit {
  private final Db db;
  private final Clock clock;

  public Audit(Db db, Clock clock) {
    this.db = db;
    this.clock = clock;
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public void record(String actor, String action, String resource) {
    db.update(
        "INSERT INTO"
            + " audit_event(id,actor_id,actor_type,action,resource_id,result,correlation_id,created_at)"
            + " VALUES(?,?,?,?,?,'SUCCESS',?,?)",
        Db.id(),
        actor,
        actor == null ? "SYSTEM" : "USER",
        action,
        resource,
        Db.id(),
        clock.instant());
  }
}
