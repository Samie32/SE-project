package com.clinic.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class AuthController {
  private final Access access;
  private final StaffProvisioning provisioning;
  private final String issuer;

  public AuthController(Access access, StaffProvisioning provisioning,
      @org.springframework.beans.factory.annotation.Value("${clinic.issuer}") String issuer) {
    this.access = access;
    this.provisioning = provisioning;
    this.issuer = issuer;
  }

  @GetMapping("/me")
  public Access.Actor me(@AuthenticationPrincipal Jwt jwt) {
    return access.actor(jwt);
  }

  @GetMapping("/me/profile")
  public Object profile(@AuthenticationPrincipal Jwt jwt) {
    return access.profile(access.actor(jwt));
  }

  @GetMapping("/users")
  public Object users(
      @AuthenticationPrincipal Jwt jwt,
      @RequestParam(defaultValue = "20") int limit,
      @RequestParam(defaultValue = "0") int offset,
      @RequestParam(defaultValue = "") String q,
      @RequestParam(defaultValue = "") String role,
      @RequestParam(required = false) Boolean active) {
    return access.users(access.actor(jwt), limit, offset, q, role, active);
  }

  public record Staff(@NotNull UUID subject, @NotBlank @Size(max = 255) String username,
      @NotBlank @Size(max = 255) String displayName) {}

  public record StaffUpdate(@NotBlank @Size(max = 255) String displayName, @NotNull Boolean active) {}

  public record NewStaff(
      @NotBlank @Pattern(regexp = "[A-Za-z0-9][A-Za-z0-9._-]{2,63}") String username,
      @NotBlank @Size(max = 120) String displayName,
      @NotBlank @Email @Size(max = 254) String email,
      @NotBlank @Size(min = 12, max = 128) String temporaryPassword,
      @NotEmpty Set<@NotBlank String> roles,
      @NotNull List<@NotNull UUID> specialtyIds) {}

  @PostMapping("/staff/provision")
  @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
  public Object provisionStaff(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody NewStaff body) {
    return provisioning.create(access.actor(jwt), body);
  }

  @PostMapping("/staff")
  @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
  public Object createStaff(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody Staff body) {
    return access.createStaff(access.actor(jwt), issuer, body.subject().toString(), body.username(), body.displayName());
  }

  @PutMapping("/staff/{id}")
  public void updateStaff(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
      @Valid @RequestBody StaffUpdate body) {
    access.updateStaff(access.actor(jwt), id.toString(), body.displayName(), body.active());
  }

  public record Roles(@NotNull Set<@NotBlank String> roles) {}

  @PutMapping("/users/{id}/roles")
  public void roles(
      @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody Roles body) {
    access.roles(access.actor(jwt), id.toString(), body.roles());
  }

  public record Contact(@NotBlank @Email @Size(max = 254) String email) {}

  @PutMapping("/me/contact")
  public void contact(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody Contact body) {
    access.contact(access.actor(jwt), body.email());
  }
}
