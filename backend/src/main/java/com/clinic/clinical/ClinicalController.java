package com.clinic.clinical;

import com.clinic.auth.Access;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ClinicalController {
  private final Access access;
  private final com.clinic.common.Commands commands;
  private final WorkflowService workflow;
  private final ClinicalService clinical;

  public ClinicalController(
      Access access,
      WorkflowService workflow,
      ClinicalService clinical,
      com.clinic.common.Commands commands) {
    this.commands = commands;
    this.access = access;
    this.workflow = workflow;
    this.clinical = clinical;
  }

  public record Version(@NotNull @Min(0) Integer version) {}

  public record Progress(@NotBlank String targetStatus, @NotNull @Min(0) Integer version) {}

  public record Skip(@NotBlank @Size(max = 1000) String reason, @NotNull @Min(0) Integer version) {}

  public record RecordInput(
      @NotNull @Min(0) Integer version,
      @NotBlank @Size(max = 100000) String content,
      @Pattern(regexp = "DRAFT|FINAL") @NotNull String status) {}

  public record Amendment(
      @NotNull @Min(0) Integer version,
      @NotBlank @Size(max = 100000) String content,
      @NotBlank @Size(max = 1000) String reason) {}

  public record Item(
      @NotBlank @Size(max = 1000) String medicineName,
      @NotBlank @Size(max = 1000) String doseText,
      @NotBlank @Size(max = 1000) String route,
      @NotBlank @Size(max = 1000) String frequency,
      @NotBlank @Size(max = 1000) String durationText) {}

  public record PrescriptionInput(@NotNull @Size(max = 100) List<@NotNull @Valid Item> items) {}

  public record PrescriptionUpdate(
      @NotNull @Min(0) Integer version,
      @NotNull @Size(max = 100) List<@NotNull @Valid Item> items) {}

  @GetMapping("/appointments/{id}")
  public Object appointment(@AuthenticationPrincipal Jwt j, @PathVariable UUID id) {
    return workflow.detail(access.actor(j), id.toString());
  }

  @PostMapping("/appointments/{id}/check-in")
  public Object checkIn(
      @AuthenticationPrincipal Jwt j,
      @PathVariable UUID id,
      @RequestHeader("Idempotency-Key") String key) {
    var actor = access.actor(j);
    return commands.run(
        actor, "CHECKIN:" + id, key, id.toString(), () -> workflow.checkIn(actor, id.toString()));
  }

  @PostMapping("/appointments/{id}/progress")
  public Object progress(
      @AuthenticationPrincipal Jwt j,
      @PathVariable UUID id,
      @Valid @RequestBody Progress b,
      @RequestHeader("Idempotency-Key") String key) {
    var actor = access.actor(j);
    return commands.run(
        actor,
        "PROGRESS:" + id,
        key,
        b,
        () -> workflow.progress(actor, id.toString(), b.targetStatus(), b.version()));
  }

  @GetMapping("/doctors/{id}/queue")
  public Object queue(
      @AuthenticationPrincipal Jwt j, @PathVariable UUID id, @RequestParam LocalDate date) {
    return workflow.queue(access.actor(j), id.toString(), date);
  }

  @PostMapping("/doctors/{id}/queue/next")
  public Object next(
      @AuthenticationPrincipal Jwt j,
      @PathVariable UUID id,
      @RequestParam LocalDate date,
      @RequestHeader("Idempotency-Key") String key) {
    var actor = access.actor(j);
    return commands.run(
        actor,
        "QUEUE_NEXT:" + id,
        key,
        date.toString(),
        () -> workflow.next(actor, id.toString(), date));
  }

  @PostMapping("/queue-tickets/{id}/skip")
  public Object skip(
      @AuthenticationPrincipal Jwt j,
      @PathVariable UUID id,
      @Valid @RequestBody Skip b,
      @RequestHeader("Idempotency-Key") String key) {
    var actor = access.actor(j);
    return commands.run(
        actor,
        "QUEUE_SKIP:" + id,
        key,
        b,
        () -> workflow.skip(actor, id.toString(), b.reason(), b.version()));
  }

  @GetMapping("/patients/{id}/records")
  public Object records(
      @AuthenticationPrincipal Jwt j,
      @PathVariable UUID id,
      @RequestParam(defaultValue = "20") int limit,
      @RequestParam(defaultValue = "0") int offset) {
    return clinical.records(access.actor(j), id.toString(), limit, offset);
  }

  @GetMapping("/encounters/{id}/record")
  public Object record(@AuthenticationPrincipal Jwt j, @PathVariable UUID id) {
    return clinical.encounterRecord(access.actor(j), id.toString());
  }

  @PutMapping("/encounters/{id}/record")
  public Object save(
      @AuthenticationPrincipal Jwt j,
      @PathVariable UUID id,
      @Valid @RequestBody RecordInput b,
      @RequestHeader("Idempotency-Key") String key) {
    var actor = access.actor(j);
    return commands.run(
        actor,
        "RECORD_SAVE:" + id,
        key,
        b,
        () -> clinical.save(actor, id.toString(), b.version(), b.content(), b.status()));
  }

  @PostMapping("/records/{id}/amendments")
  public Object amend(
      @AuthenticationPrincipal Jwt j,
      @PathVariable UUID id,
      @Valid @RequestBody Amendment b,
      @RequestHeader("Idempotency-Key") String key) {
    var actor = access.actor(j);
    return commands.run(
        actor,
        "RECORD_AMEND:" + id,
        key,
        b,
        () -> clinical.amend(actor, id.toString(), b.version(), b.content(), b.reason()));
  }

  @PostMapping("/encounters/{id}/prescriptions")
  public Object prescribe(
      @AuthenticationPrincipal Jwt j,
      @PathVariable UUID id,
      @Valid @RequestBody PrescriptionInput b,
      @RequestHeader("Idempotency-Key") String key) {
    var actor = access.actor(j);
    return commands.run(
        actor,
        "PRESCRIBE:" + id,
        key,
        b,
        () -> clinical.prescribe(actor, id.toString(), b.items()));
  }

  @GetMapping("/encounters/{id}/prescriptions")
  public Object encounterPrescriptions(@AuthenticationPrincipal Jwt j, @PathVariable UUID id) {
    return clinical.encounterPrescriptions(access.actor(j), id.toString());
  }

  @PutMapping("/prescriptions/{id}")
  public Object updatePrescription(
      @AuthenticationPrincipal Jwt j,
      @PathVariable UUID id,
      @Valid @RequestBody PrescriptionUpdate b,
      @RequestHeader("Idempotency-Key") String key) {
    var actor = access.actor(j);
    return commands.run(
        actor,
        "RX_UPDATE:" + id,
        key,
        b,
        () -> clinical.updatePrescription(actor, id.toString(), b.version(), b.items()));
  }

  @PostMapping("/prescriptions/{id}/issue")
  public Object issue(
      @AuthenticationPrincipal Jwt j,
      @PathVariable UUID id,
      @Valid @RequestBody Version b,
      @RequestHeader("Idempotency-Key") String key) {
    var actor = access.actor(j);
    return commands.run(
        actor, "RX_ISSUE:" + id, key, b, () -> clinical.issue(actor, id.toString(), b.version()));
  }

  @GetMapping("/patients/{id}/prescriptions")
  public Object prescriptions(
      @AuthenticationPrincipal Jwt j,
      @PathVariable UUID id,
      @RequestParam(defaultValue = "20") int limit,
      @RequestParam(defaultValue = "0") int offset) {
    return clinical.prescriptions(access.actor(j), id.toString(), limit, offset);
  }
}
