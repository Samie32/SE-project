package com.clinic.audit;

import com.clinic.common.Crypto;
import com.clinic.common.Db;
import java.time.Clock;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
public class Audit {
  private final Db db;
  private final Clock clock;
  private final Crypto crypto;

  public Audit(Db db, Clock clock, Crypto crypto) {
    this.db = db;
    this.clock = clock;
    this.crypto = crypto;
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
    String id = Db.id();
    String actorType = actor == null ? "SYSTEM" : "USER";
    String actorLabel = actor == null ? "clinic-background-worker" : null;
    String correlationId = correlation == null ? Db.id() : correlation.toString();
    Instant createdAt = AuditHashChain.normalizeTimestamp(clock.instant());

    var head = db.one("SELECT last_seq,last_hash FROM audit_chain_head WHERE id=1 FOR UPDATE");
    long nextSeq = ((Number) head.get("lastSeq")).longValue() + 1;
    String prevHash = head.get("lastHash").toString();
    String eventHash =
        AuditHashChain.computeEventHash(
            crypto,
            nextSeq,
            prevHash,
            id,
            createdAt,
            actorType,
            actor,
            actorLabel,
            action,
            resource,
            result,
            correlationId);

    db.update(
        "INSERT INTO audit_event("
            + "id,actor_id,actor_type,action,resource_id,result,correlation_id,created_at,"
            + "actor_label,chain_seq,prev_hash,event_hash)"
            + " VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
        id,
        actor,
        actorType,
        action,
        resource,
        result,
        correlationId,
        createdAt,
        actorLabel,
        nextSeq,
        prevHash,
        eventHash);
    db.update(
        "UPDATE audit_chain_head SET last_seq=?,last_hash=?,updated_at=? WHERE id=1",
        nextSeq,
        eventHash,
        createdAt);
  }
}
