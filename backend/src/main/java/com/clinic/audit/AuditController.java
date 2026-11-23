package com.clinic.audit;

import com.clinic.auth.Access;
import java.time.Instant;
import java.util.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/audit-events")
public class AuditController {
  public record ArchiveAuditRequest(Instant before, String notes) {}

  private final Access access;
  private final AuditService auditService;

  public AuditController(Access access, AuditService auditService) {
    this.access = access;
    this.auditService = auditService;
  }

  @GetMapping
  public List<Map<String, Object>> list(
      @AuthenticationPrincipal Jwt jwt,
      @RequestParam(required = false) Instant from,
      @RequestParam(required = false) Instant to,
      @RequestParam(required = false) UUID actorId,
      @RequestParam(required = false) String resourceId,
      @RequestParam(required = false) String result,
      @RequestParam(required = false) String action,
      @RequestParam(required = false) String category,
      @RequestParam(required = false) String actorType,
      @RequestParam(required = false) UUID correlationId,
      @RequestParam(defaultValue = "false") boolean excludeReadNoise,
      @RequestParam(required = false) Instant cursorCreatedAt,
      @RequestParam(required = false) UUID cursorId,
      @RequestParam(defaultValue = "20") int limit,
      @RequestParam(defaultValue = "0") int offset) {
    var actor = access.actor(jwt);
    var filter =
        new AuditService.AuditFilter(
            from, to, actorId, resourceId, result, action, category, actorType, correlationId,
            excludeReadNoise);
    return auditService.list(actor, filter, cursorCreatedAt, cursorId, limit, offset);
  }

  @GetMapping("/summary")
  public AuditService.AuditSummary summary(
      @AuthenticationPrincipal Jwt jwt,
      @RequestParam(required = false) Instant from,
      @RequestParam(required = false) Instant to,
      @RequestParam(required = false) UUID actorId,
      @RequestParam(required = false) String resourceId,
      @RequestParam(required = false) String result,
      @RequestParam(required = false) String action,
      @RequestParam(required = false) String category,
      @RequestParam(required = false) String actorType,
      @RequestParam(required = false) UUID correlationId,
      @RequestParam(defaultValue = "false") boolean excludeReadNoise) {
    var actor = access.actor(jwt);
    var filter =
        new AuditService.AuditFilter(
            from, to, actorId, resourceId, result, action, category, actorType, correlationId,
            excludeReadNoise);
    return auditService.summary(actor, filter);
  }

  @GetMapping("/export")
  public AuditService.AuditExportResponse export(
      @AuthenticationPrincipal Jwt jwt,
      @RequestParam(required = false) Instant from,
      @RequestParam(required = false) Instant to,
      @RequestParam(required = false) UUID actorId,
      @RequestParam(required = false) String resourceId,
      @RequestParam(required = false) String result,
      @RequestParam(required = false) String action,
      @RequestParam(required = false) String category,
      @RequestParam(required = false) String actorType,
      @RequestParam(required = false) UUID correlationId,
      @RequestParam(defaultValue = "false") boolean excludeReadNoise,
      @RequestParam(required = false) Integer maxRows) {
    var actor = access.actor(jwt);
    var filter =
        new AuditService.AuditFilter(
            from, to, actorId, resourceId, result, action, category, actorType, correlationId,
            excludeReadNoise);
    return auditService.exportCsv(actor, filter, maxRows);
  }

  @PostMapping("/verify")
  public AuditService.AuditIntegrityReport verify(
      @AuthenticationPrincipal Jwt jwt,
      @RequestParam(required = false) Integer maxEvents) {
    var actor = access.actor(jwt);
    return auditService.verifyIntegrity(actor, maxEvents);
  }

  @GetMapping("/retention")
  public AuditService.AuditRetentionStatus retention(@AuthenticationPrincipal Jwt jwt) {
    var actor = access.actor(jwt);
    return auditService.retentionStatus(actor);
  }

  @PostMapping("/archive")
  public AuditService.AuditArchiveBatch archive(
      @AuthenticationPrincipal Jwt jwt,
      @RequestBody(required = false) ArchiveAuditRequest body) {
    var actor = access.actor(jwt);
    Instant before = body == null ? null : body.before();
    String notes = body == null ? null : body.notes();
    return auditService.archiveBatch(actor, before, notes);
  }
}
