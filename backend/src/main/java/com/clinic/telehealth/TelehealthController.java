package com.clinic.telehealth;

import com.clinic.auth.Access;
import com.clinic.clinical.ClinicalController.Version;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class TelehealthController {
  private final com.clinic.common.Commands commands;
  private final Access access;
  private final TelehealthService service;

  public TelehealthController(
      Access access, TelehealthService service, com.clinic.common.Commands commands) {
    this.commands = commands;
    this.access = access;
    this.service = service;
  }

  public record Join(@NotNull Boolean consent) {}

  public record Connection(
      @NotNull @Min(0) Integer version,
      @NotNull @Pattern(regexp = "ACTIVE|RECONNECTING") String state) {}

  public record Signal(
      @NotNull @Pattern(regexp = "OFFER|ANSWER|ICE") String kind,
      @NotBlank @Size(max = 65536) String payload) {}

  @PostMapping("/appointments/{id}/telehealth-session")
  public Object prepare(
      @AuthenticationPrincipal Jwt j,
      @PathVariable UUID id,
      @RequestHeader("Idempotency-Key") String key) {
    var actor = access.actor(j);
    return commands.run(
        actor,
        "ROOM_PREPARE:" + id,
        key,
        id.toString(),
        () -> service.prepare(actor, id.toString()));
  }

  @GetMapping("/telehealth-sessions/{id}")
  public Object read(@AuthenticationPrincipal Jwt j, @PathVariable UUID id) {
    return service.read(access.actor(j), id.toString());
  }

  @PostMapping("/telehealth-sessions/{id}/join")
  public Object join(
      @AuthenticationPrincipal Jwt j, @PathVariable UUID id, @Valid @RequestBody Join b) {
    return service.join(access.actor(j), id.toString(), b.consent());
  }

  @PostMapping("/telehealth-sessions/{id}/start")
  public Object start(
      @AuthenticationPrincipal Jwt j,
      @PathVariable UUID id,
      @Valid @RequestBody Version b,
      @RequestHeader("Idempotency-Key") String key) {
    var actor = access.actor(j);
    return commands.run(
        actor, "ROOM_START:" + id, key, b, () -> service.start(actor, id.toString(), b.version()));
  }

  @PostMapping("/telehealth-sessions/{id}/end")
  public Object end(
      @AuthenticationPrincipal Jwt j,
      @PathVariable UUID id,
      @Valid @RequestBody Version b,
      @RequestHeader("Idempotency-Key") String key) {
    var actor = access.actor(j);
    return commands.run(
        actor, "ROOM_END:" + id, key, b, () -> service.end(actor, id.toString(), b.version()));
  }

  @PostMapping("/telehealth-sessions/{id}/connection")
  public Object connection(
      @AuthenticationPrincipal Jwt j,
      @PathVariable UUID id,
      @RequestHeader("X-Room-Token") String token,
      @Valid @RequestBody Connection b) {
    return service.connection(access.actor(j), id.toString(), b.version(), b.state(), token);
  }

  @PostMapping("/telehealth-sessions/{id}/signals")
  public Object signal(
      @AuthenticationPrincipal Jwt j,
      @PathVariable UUID id,
      @RequestHeader("X-Room-Token") String token,
      @Valid @RequestBody Signal b) {
    return service.signal(access.actor(j), id.toString(), token, b.kind(), b.payload());
  }

  @GetMapping("/telehealth-sessions/{id}/signals")
  public Object signals(
      @AuthenticationPrincipal Jwt j,
      @PathVariable UUID id,
      @RequestHeader("X-Room-Token") String token,
      @RequestParam(defaultValue = "0") long after) {
    return service.signals(access.actor(j), id.toString(), token, after);
  }
}
