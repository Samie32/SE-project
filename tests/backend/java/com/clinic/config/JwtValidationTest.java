package com.clinic.config;

import static org.junit.jupiter.api.Assertions.*;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import org.junit.jupiter.api.*;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;

class JwtValidationTest {
  static final String ISSUER = "http://localhost:8180/realms/clinic";
  static RSAKey signingKey;
  static HttpServer server;
  static JwtDecoder decoder;

  @BeforeAll
  static void setup() throws Exception {
    signingKey = new RSAKeyGenerator(2048).keyID("test-key").generate();
    byte[] jwks = new JWKSet(signingKey.toPublicJWK()).toString().getBytes(StandardCharsets.UTF_8);
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext(
        "/jwks",
        exchange -> {
          exchange.getResponseHeaders().set("Content-Type", "application/json");
          exchange.sendResponseHeaders(200, jwks.length);
          try (var output = exchange.getResponseBody()) {
            output.write(jwks);
          }
        });
    server.start();
    decoder =
        new SecurityConfig()
            .jwtDecoder(
                ISSUER,
                "http://127.0.0.1:" + server.getAddress().getPort() + "/jwks",
                "clinic-api");
  }

  @AfterAll
  static void stop() {
    if (server != null) server.stop(0);
  }

  String token(String issuer, String audience, Instant expiry, RSAKey key) throws Exception {
    var claims =
        new JWTClaimsSet.Builder()
            .issuer(issuer)
            .subject("patient")
            .audience(audience)
            .issueTime(Date.from(Instant.now().minusSeconds(300)))
            .expirationTime(Date.from(expiry))
            .build();
    var jwt =
        new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("test-key").build(), claims);
    jwt.sign(new RSASSASigner(key));
    return jwt.serialize();
  }

  @Test
  void acceptsCorrectSignatureIssuerAudienceAndLifetime() throws Exception {
    assertEquals(
        "patient",
        decoder
            .decode(token(ISSUER, "clinic-api", Instant.now().plusSeconds(300), signingKey))
            .getSubject());
  }

  @Test
  void rejectsWrongIssuer() throws Exception {
    var value =
        token(
            "https://other.example.test", "clinic-api", Instant.now().plusSeconds(300), signingKey);
    assertThrows(JwtException.class, () -> decoder.decode(value));
  }

  @Test
  void rejectsWrongAudience() throws Exception {
    var value = token(ISSUER, "other-api", Instant.now().plusSeconds(300), signingKey);
    assertThrows(JwtException.class, () -> decoder.decode(value));
  }

  @Test
  void rejectsExpiredToken() throws Exception {
    var value = token(ISSUER, "clinic-api", Instant.now().minusSeconds(120), signingKey);
    assertThrows(JwtException.class, () -> decoder.decode(value));
  }

  @Test
  void rejectsSignatureFromAnotherKey() throws Exception {
    var value =
        token(
            ISSUER,
            "clinic-api",
            Instant.now().plusSeconds(300),
            new RSAKeyGenerator(2048).generate());
    assertThrows(JwtException.class, () -> decoder.decode(value));
  }
}
