package com.clinic.audit;

import com.clinic.auth.Access;
import com.clinic.common.*;
import java.time.Instant;
import java.util.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/audit-events")
public class AuditController {
  private final Access access;
  private final Db db;
  private final Audit audit;

  public AuditController(Access access, Db db, Audit audit) {
    this.access = access;
    this.db = db;
    this.audit = audit;
  }

  @GetMapping
  @Transactional
  public Object list(
      @AuthenticationPrincipal Jwt jwt,
      @RequestParam(required = false) Instant from,
      @RequestParam(required = false) Instant to,
      @RequestParam(required = false) UUID actorId,
      @RequestParam(required = false) String resourceId,
      @RequestParam(defaultValue = "20") int limit,
      @RequestParam(defaultValue = "0") int offset) {
    var actor = access.actor(jwt);
    actor.require("AUDITOR");
    Problem.require(limit > 0 && limit <= 100 && offset >= 0, 400, "Invalid pagination");
    Problem.require(from == null || to == null || from.isBefore(to), 400, "Invalid time range");
    StringBuilder sql = new StringBuilder("SELECT * FROM audit_event WHERE 1=1");
    List<Object> args = new ArrayList<>();
    if (from != null) {
      sql.append(" AND created_at>=?");
      args.add(from);
    }
    if (to != null) {
      sql.append(" AND created_at<?");
      args.add(to);
    }
    if (actorId != null) {
      sql.append(" AND actor_id=?");
      args.add(actorId.toString());
    }
    if (resourceId != null) {
      sql.append(" AND resource_id=?");
      args.add(resourceId);
    }
    sql.append(" ORDER BY created_at DESC,id LIMIT ? OFFSET ?");
    args.add(limit);
    args.add(offset);
    var result = db.list(sql.toString(), args.toArray());
    audit.record(actor.id(), "AUDIT_SEARCH", actor.id());
    return result;
  }
}
