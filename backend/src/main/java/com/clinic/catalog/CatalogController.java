package com.clinic.catalog;

import com.clinic.auth.Access;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class CatalogController {
  private final Access access;
  private final CatalogService service;

  public CatalogController(Access a, CatalogService s) {
    access = a;
    service = s;
  }

  @GetMapping("/specialties")
  public Object specialties(@AuthenticationPrincipal Jwt j) {
    access.actor(j);
    return service.specialties();
  }

  @GetMapping("/doctors")
  public Object doctors(@AuthenticationPrincipal Jwt j) {
    access.actor(j);
    return service.doctors();
  }

  public record Specialty(@NotBlank @Size(max = 255) String name) {}

  public record Doctor(@NotNull UUID userId, @NotEmpty List<@NotNull UUID> specialtyIds) {}

  public record UpdateDoctor(
      boolean active,
      @NotBlank @Size(max = 255) String displayName,
      @NotEmpty List<@NotNull UUID> specialtyIds) {}

  @PostMapping("/specialties")
  public Object specialty(@AuthenticationPrincipal Jwt j, @Valid @RequestBody Specialty b) {
    return service.specialty(access.actor(j), b.name());
  }

  @PostMapping("/doctors")
  public Object doctor(@AuthenticationPrincipal Jwt j, @Valid @RequestBody Doctor b) {
    return service.doctor(access.actor(j), b.userId().toString(), b.specialtyIds());
  }

  @PutMapping("/doctors/{id}")
  public Object update(
      @AuthenticationPrincipal Jwt j, @PathVariable UUID id, @Valid @RequestBody UpdateDoctor b) {
    return service.updateDoctor(
        access.actor(j), id.toString(), b.active(), b.displayName(), b.specialtyIds());
  }
}
