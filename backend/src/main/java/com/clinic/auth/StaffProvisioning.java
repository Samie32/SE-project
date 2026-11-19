package com.clinic.auth;

import com.clinic.catalog.CatalogService;
import com.clinic.common.Db;
import com.clinic.common.Problem;
import java.net.URI;
import java.time.Duration;
import java.util.*;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Service
public class StaffProvisioning {
  private record Token(String access_token) {}

  private final Access access;
  private final CatalogService catalog;
  private final Db db;
  private final TransactionTemplate transaction;
  private final RestClient keycloak;
  private final String issuer;
  private final String secret;

  public StaffProvisioning(Access access, CatalogService catalog, Db db,
      TransactionTemplate transaction, @Value("${clinic.issuer}") String issuer,
      @Value("${clinic.staff-admin-base}") String keycloakBase,
      @Value("${clinic.staff-client-secret}") String secret) {
    this.access = access;
    this.catalog = catalog;
    this.db = db;
    this.transaction = transaction;
    this.issuer = issuer;
    this.secret = secret;
    var requests = new SimpleClientHttpRequestFactory();
    requests.setConnectTimeout(Duration.ofSeconds(5));
    requests.setReadTimeout(Duration.ofSeconds(10));
    this.keycloak = RestClient.builder().baseUrl(keycloakBase).requestFactory(requests).build();
  }

  public Map<String, Object> create(Access.Actor actor, AuthController.NewStaff body) {
    actor.require("ADMINISTRATOR");
    Problem.require(Access.STAFF_ROLES.containsAll(body.roles()), 422, "Invalid roles");
    boolean doctor = body.roles().contains("DOCTOR");
    Problem.require(doctor == !body.specialtyIds().isEmpty(), 422, "Doctor specialties required");

    String username = body.username().toLowerCase(Locale.ROOT);
    String name = body.displayName().strip();
    String token = token();
    UUID subject = createIdentity(body, username, name, token);
    try {
      return transaction.execute(status -> {
        var account = access.createStaff(actor, issuer, subject.toString(), username, name);
        String id = account.get("id").toString();
        if (doctor) catalog.doctor(actor, id, body.specialtyIds());
        access.roles(actor, id, body.roles());
        activateIdentity(subject, token);
        return account;
      });
    } catch (RuntimeException original) {
      try {
        if (db.count("SELECT COUNT(*) FROM user_account WHERE issuer=? AND subject=?", issuer, subject.toString()) == 0) {
          keycloak.delete().uri("/admin/realms/clinic/users/{id}", subject)
              .headers(headers -> headers.setBearerAuth(token)).retrieve().toBodilessEntity();
        }
      } catch (RuntimeException cleanupFailure) {
        LoggerFactory.getLogger(StaffProvisioning.class)
            .error("Could not reconcile newly provisioned Keycloak identity {}", subject);
        throw new Problem(503, "Staff identity needs reconciliation");
      }
      throw original;
    }
  }

  private void activateIdentity(UUID subject, String token) {
    try {
      keycloak.put().uri("/admin/realms/clinic/users/{id}", subject)
          .headers(headers -> headers.setBearerAuth(token))
          .contentType(MediaType.APPLICATION_JSON).body(Map.of("enabled", true))
          .retrieve().toBodilessEntity();
    } catch (RestClientException unavailable) {
      throw new Problem(503, "Staff identity provider unavailable");
    }
  }

  private String token() {
    Problem.require(!secret.isBlank(), 503, "Staff provisioning is not configured");
    var form = new LinkedMultiValueMap<String, String>();
    form.add("grant_type", "client_credentials");
    form.add("client_id", "clinic-staff-provisioner");
    form.add("client_secret", secret);
    try {
      var response = keycloak.post().uri("/realms/clinic/protocol/openid-connect/token")
          .contentType(MediaType.APPLICATION_FORM_URLENCODED).body(form).retrieve().body(Token.class);
      Problem.require(response != null && response.access_token() != null, 503, "Staff identity provider unavailable");
      return response.access_token();
    } catch (RestClientException unavailable) {
      throw new Problem(503, "Staff identity provider unavailable");
    }
  }

  private UUID createIdentity(AuthController.NewStaff body, String username, String name, String token) {
    int split = name.lastIndexOf(' ');
    String firstName = split < 0 ? name : name.substring(split + 1);
    String lastName = split < 0 ? "" : name.substring(0, split).strip();
    try {
      URI location = keycloak.post().uri("/admin/realms/clinic/users")
          .headers(headers -> headers.setBearerAuth(token))
          .contentType(MediaType.APPLICATION_JSON)
          .body(Map.of("username", username, "email", body.email().strip(),
              "firstName", firstName, "lastName", lastName.isEmpty() ? firstName : lastName,
              "enabled", false, "credentials", List.of(Map.of("type", "password",
                  "value", body.temporaryPassword(), "temporary", true))))
          .retrieve().toBodilessEntity().getHeaders().getLocation();
      if (location != null) {
        String path = location.getPath();
        return UUID.fromString(path.substring(path.lastIndexOf('/') + 1));
      }
    } catch (RestClientResponseException error) {
      if (error.getStatusCode().value() == 409) throw new Problem(409, "Staff username or email already exists");
      if (error.getStatusCode().value() == 400) throw new Problem(422, "Staff identity details rejected");
    } catch (RestClientException | IllegalArgumentException unavailable) {
      throw new Problem(503, "Staff identity provider unavailable");
    }
    throw new Problem(503, "Staff identity provider unavailable");
  }
}
