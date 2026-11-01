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

  public AuthController(Access access) {
    this.access = access;
  }

  @GetMapping("/me")
  public Access.Actor me(@AuthenticationPrincipal Jwt jwt) {
    return access.actor(jwt);
  }

  public record Roles(@NotEmpty Set<String> roles) {}

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
