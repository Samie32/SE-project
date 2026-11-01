package com.clinic.availability;

import com.clinic.auth.Access;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.*;
import java.util.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ScheduleController {
  private final Access access;
  private final ScheduleService service;

  public ScheduleController(Access a, ScheduleService s) {
    access = a;
    service = s;
  }

  public record Availability(
      @NotNull Instant startAt,
      @NotNull Instant endAt,
      @Min(1) @Max(540) int slotMinutes,
      @Pattern(regexp = "IN_PERSON|REMOTE") @NotNull String mode) {}

  public record TimeOff(@NotNull Instant startAt, @NotNull Instant endAt) {}

  @PostMapping("/doctors/{id}/availability")
  public Object availability(
      @AuthenticationPrincipal Jwt j, @PathVariable UUID id, @Valid @RequestBody Availability b) {
    return service.availability(
        access.actor(j), id.toString(), b.startAt(), b.endAt(), b.slotMinutes(), b.mode());
  }

  @PostMapping("/doctors/{id}/time-off")
  public Object timeOff(
      @AuthenticationPrincipal Jwt j, @PathVariable UUID id, @Valid @RequestBody TimeOff b) {
    return service.timeOff(access.actor(j), id.toString(), b.startAt(), b.endAt());
  }

  @GetMapping("/doctors/{id}/availability")
  public Object availability(@AuthenticationPrincipal Jwt j, @PathVariable UUID id) {
    return service.schedules(access.actor(j), id.toString(), false);
  }

  @GetMapping("/doctors/{id}/time-off")
  public Object timeOff(@AuthenticationPrincipal Jwt j, @PathVariable UUID id) {
    return service.schedules(access.actor(j), id.toString(), true);
  }

  @GetMapping("/slots")
  public Object slots(
      @AuthenticationPrincipal Jwt j,
      @RequestParam LocalDate date,
      @RequestParam(required = false) UUID doctorId,
      @RequestParam(required = false) UUID specialtyId,
      @RequestParam(required = false) String mode) {
    access.actor(j);
    return service.slots(
        doctorId == null ? null : doctorId.toString(),
        date,
        mode,
        specialtyId == null ? null : specialtyId.toString());
  }
}
