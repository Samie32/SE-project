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
    insert(actor, action, resource, "SUCCESS");
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public void denied(String actor, String action, String resource) {
    insert(actor, action, resource, "DENIED");
  }

  private void insert(String actor, String action, String resource, String result) {
    var request =
        org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
    Object correlation =
        request == null
            ? null
            : request.getAttribute(com.clinic.common.RequestCorrelation.ATTRIBUTE, 0);
    db.update(
        "INSERT INTO"
            + " audit_event(id,actor_id,actor_type,action,resource_id,result,correlation_id,created_at,actor_label)"
            + " VALUES(?,?,?,?,?,?,?,?,?)",
        Db.id(),
        actor,
        actor == null ? "SYSTEM" : "USER",
        action,
        resource,
        result,
        correlation == null ? Db.id() : correlation.toString(),
        clock.instant(),
        actor == null ? "clinic-background-worker" : null);
  }
}
