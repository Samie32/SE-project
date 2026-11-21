package com.clinic;

import static org.junit.jupiter.api.Assertions.*;

import com.clinic.common.Crypto;
import com.clinic.common.Db;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Base64;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@Testcontainers
class BackupRestoreIntegrationTest {
  @Container
  static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4")
      .withUrlParam("sslMode", "DISABLED")
      .withUrlParam("allowPublicKeyRetrieval", "true")
      .withUrlParam("connectionTimeZone", "UTC")
      .withUrlParam("forceConnectionTimeZoneToSession", "true");

  @DynamicPropertySource
  static void properties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", mysql::getJdbcUrl);
    registry.add("spring.datasource.username", mysql::getUsername);
    registry.add("spring.datasource.password", mysql::getPassword);
    registry.add("spring.flyway.user", () -> "root");
    registry.add("spring.flyway.password", mysql::getPassword);
    registry.add("clinic.encryption-key", () -> Base64.getEncoder().encodeToString(new byte[32]));
    registry.add("clinic.notifications-enabled", () -> false);
    registry.add("clinic.mail-from", () -> "clinic@example.test");
    registry.add("management.health.mail.enabled", () -> false);
  }

  @Autowired Db db;
  @Autowired Crypto crypto;

  @Test
  void mysqldumpAndRestorePreservesRecordsEncryptedContactsAndForeignKeys() throws Exception {
    String userId = Db.id();
    String sampleEmail = "backup-verify@example.test";
    db.update(
        "INSERT INTO user_account(id,subject,display_name,email_encrypted,email_hash,staff,active)"
            + " VALUES(?,?,?,?,?,FALSE,TRUE)",
        userId,
        "backup-sub-" + userId,
        "Backup Verification Patient",
        crypto.encrypt(sampleEmail),
        crypto.hash(sampleEmail));
    db.update("INSERT INTO user_role(user_id,role) VALUES(?,'PATIENT')", userId);
    db.update("INSERT INTO patient_profile(id,user_id,full_name) VALUES(?,?,?)",
        Db.id(), userId, "Backup Verification Patient");

    String dbName = mysql.getDatabaseName();
    String rootPass = mysql.getPassword();
    var dump = mysql.execInContainer(
        "sh",
        "-c",
        "mysqldump -uroot -p'" + rootPass + "' --single-transaction --routines --triggers '"
            + dbName + "' > /tmp/clinic_backup.sql");
    assertEquals(0, dump.getExitCode(), "mysqldump failed: " + dump.getStderr());

    String restoredDb = "clinic_restore_verify";
    var restore = mysql.execInContainer(
        "sh",
        "-c",
        "mysql -uroot -p'" + rootPass + "' -e 'DROP DATABASE IF EXISTS " + restoredDb
            + "; CREATE DATABASE " + restoredDb + ";' && "
            + "mysql -uroot -p'" + rootPass + "' " + restoredDb + " < /tmp/clinic_backup.sql");
    assertEquals(0, restore.getExitCode(), "mysql restore failed: " + restore.getStderr());

    String restoreUrl = mysql.getJdbcUrl().replace("/" + dbName, "/" + restoredDb);
    try (Connection conn = DriverManager.getConnection(restoreUrl, "root", rootPass)) {
      for (String table : List.of("user_account", "user_role", "specialty", "doctor", "patient_profile", "audit_log")) {
        long srcCount = ((Number) db.one("SELECT COUNT(*) c FROM " + table).get("c")).longValue();
        long dstCount = count(conn, table);
        assertEquals(srcCount, dstCount, "Row count mismatch after restore for table " + table);
      }

      try (PreparedStatement ps = conn.prepareStatement(
          "SELECT email_encrypted, email_hash FROM user_account WHERE id=?")) {
        ps.setString(1, userId);
        try (ResultSet rs = ps.executeQuery()) {
          assertTrue(rs.next(), "Restored user_account row missing");
          assertEquals(sampleEmail, crypto.decrypt(rs.getBytes("email_encrypted")));
          assertEquals(crypto.hash(sampleEmail), rs.getString("email_hash"));
        }
      }

      try (PreparedStatement ps = conn.prepareStatement(
          "SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS"
              + " WHERE CONSTRAINT_SCHEMA=? AND CONSTRAINT_TYPE='FOREIGN KEY'")) {
        ps.setString(1, restoredDb);
        try (ResultSet rs = ps.executeQuery()) {
          assertTrue(rs.next());
          assertTrue(rs.getLong(1) >= 10, "Expected foreign key constraints to be restored");
        }
      }

      try (Statement st = conn.createStatement()) {
        assertThrows(
            Exception.class,
            () -> st.executeUpdate(
                "INSERT INTO patient_profile(id,user_id,full_name) VALUES('"
                    + Db.id() + "','00000000-0000-0000-0000-000000000999','Orphan')"),
            "Foreign key constraint must reject orphan patient_profile after restore");
      }
    }
  }

  private static long count(Connection conn, String table) throws Exception {
    try (Statement st = conn.createStatement();
        ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM " + table)) {
      assertTrue(rs.next());
      return rs.getLong(1);
    }
  }
}
