package com.clinic.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.clinic.catalog.CatalogService;
import com.clinic.common.Db;
import com.clinic.common.Problem;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.*;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

class StaffProvisioningTest {
  private static final String ISSUER = "http://clinic.example.test/realms/clinic";
  private static final String SUBJECT = "f6227d1b-4eb2-47e2-b488-98bb1d166d3d";
  private static final String USERS = "/admin/realms/clinic/users";
  private static final Access.Actor ADMIN = new Access.Actor("admin", Set.of("ADMINISTRATOR"));
  private final Access access = mock(Access.class);
  private final CatalogService catalog = mock(CatalogService.class);
  private final Db db = mock(Db.class);
  private final TransactionTemplate transaction = mock(TransactionTemplate.class);
  private final List<String> calls = new CopyOnWriteArrayList<>();
  private HttpServer server;
  private StaffProvisioning service;

  @BeforeEach
  void setup() throws IOException {
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext("/", request -> {
      String path = request.getRequestURI().getPath();
      String method = request.getRequestMethod();
      calls.add(method + " " + path);
      if (path.endsWith("/token")) {
        byte[] body = "{\"access_token\":\"test-token\"}".getBytes(StandardCharsets.UTF_8);
        request.getResponseHeaders().set("Content-Type", "application/json");
        request.sendResponseHeaders(200, body.length);
        request.getResponseBody().write(body);
      } else if (method.equals("POST") && path.equals(USERS)) {
        request.getResponseHeaders().set("Location", USERS + "/" + SUBJECT);
        request.sendResponseHeaders(201, -1);
      } else {
        request.sendResponseHeaders(204, -1);
      }
      request.close();
    });
    server.start();
    service = new StaffProvisioning(access, catalog, db, transaction, ISSUER,
        "http://127.0.0.1:" + server.getAddress().getPort(), "test-secret");
    when(transaction.execute(any())).thenAnswer(call ->
        call.<TransactionCallback<?>>getArgument(0).doInTransaction(mock(TransactionStatus.class)));
    when(access.createStaff(ADMIN, ISSUER, SUBJECT, "staff-test", "Clinic Staff"))
        .thenReturn(Map.of("id", "internal-id"));
  }

  @AfterEach
  void stopServer() {
    server.stop(0);
  }

  @Test
  void createsIdentityProfileAndRolesBeforeActivating() {
    var specialties = List.of(UUID.randomUUID());
    var body = new AuthController.NewStaff("staff-test", "Clinic Staff", "staff@example.test",
        "Temporary!Demo42", Set.of("DOCTOR"), specialties);

    assertEquals("internal-id", service.create(ADMIN, body).get("id"));
    var writes = inOrder(access, catalog);
    writes.verify(access).createStaff(ADMIN, ISSUER, SUBJECT, "staff-test", "Clinic Staff");
    writes.verify(catalog).doctor(ADMIN, "internal-id", specialties);
    writes.verify(access).roles(ADMIN, "internal-id", Set.of("DOCTOR"));
    assertEquals(List.of("POST /realms/clinic/protocol/openid-connect/token",
        "POST " + USERS, "PUT " + USERS + "/" + SUBJECT), calls);
  }

  @Test
  void cleansUpOnlyTheNewIdentityIfSavingRolesFails() {
    var body = new AuthController.NewStaff("staff-test", "Clinic Staff", "staff@example.test",
        "Temporary!Demo42", Set.of("AUDITOR"), List.of());
    doThrow(Problem.conflict("Database rejected roles")).when(access)
        .roles(ADMIN, "internal-id", Set.of("AUDITOR"));
    when(db.count("SELECT COUNT(*) FROM user_account WHERE issuer=? AND subject=?", ISSUER, SUBJECT))
        .thenReturn(0L);

    assertEquals(409, assertThrows(Problem.class, () -> service.create(ADMIN, body)).status);
    assertEquals(List.of("POST /realms/clinic/protocol/openid-connect/token",
        "POST " + USERS, "DELETE " + USERS + "/" + SUBJECT), calls);
  }
}
