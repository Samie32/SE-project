package com.clinic.appointment;

import com.clinic.auth.Access;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {
  private final Access access;
  private final AppointmentService service;

  public AppointmentController(Access a, AppointmentService s) {
    access = a;
    service = s;
  }

  public record Booking(@NotNull UUID slotId) {}

  public record Reschedule(@NotNull UUID slotId, @NotNull @Min(0) Integer version) {}

  public record Cancel(
      @NotBlank @Size(max = 1000) String reason, @NotNull @Min(0) Integer version) {}

  @PostMapping
  public Object book(
      @AuthenticationPrincipal Jwt j,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody Booking b) {
    return service.book(access.actor(j), b.slotId().toString(), key);
  }

  @PostMapping("/{id}/reschedule")
  public Object reschedule(
      @AuthenticationPrincipal Jwt j,
      @PathVariable UUID id,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody Reschedule b) {
    return service.reschedule(
        access.actor(j), id.toString(), b.slotId().toString(), b.version(), key);
  }

  @PostMapping("/{id}/cancel")
  public Object cancel(
      @AuthenticationPrincipal Jwt j,
      @PathVariable UUID id,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody Cancel b) {
    return service.cancel(access.actor(j), id.toString(), b.reason(), b.version(), key);
  }

  @GetMapping
  public Object list(
      @AuthenticationPrincipal Jwt j,
      @RequestParam(defaultValue = "20") int limit,
      @RequestParam(defaultValue = "0") int offset) {
    return service.list(access.actor(j), limit, offset);
  }
}
