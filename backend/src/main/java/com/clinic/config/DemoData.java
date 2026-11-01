package com.clinic.config;

import com.clinic.auth.Access;
import com.clinic.availability.ScheduleService;
import com.clinic.common.*;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.*;
import org.springframework.transaction.support.TransactionTemplate;

@Configuration
@Profile("demo")
public class DemoData {
  @Bean
  ApplicationRunner demo(
      Db db,
      Crypto crypto,
      TransactionTemplate tx,
      ScheduleService schedules,
      @Value("${clinic.issuer}") String issuer) {
    return args -> {
      tx.executeWithoutResult(
          status -> {
            String[] names = {"admin", "doctor", "patient", "patient2", "receptionist", "auditor"};
            String[] roles = {
              "ADMINISTRATOR", "DOCTOR", "PATIENT", "PATIENT", "RECEPTIONIST", "AUDITOR"
            };
            for (int i = 0; i < names.length; i++) {
              String id = String.format("00000000-0000-0000-0000-%012d", i + 1);
              int inserted =
                  db.update(
                      "INSERT IGNORE INTO"
                          + " user_account(id,issuer,subject,display_name,email_encrypted)"
                          + " VALUES(?,?,?,?,?)",
                      id,
                      issuer,
                      id,
                      names[i],
                      crypto.encrypt(names[i] + "@example.test"));
              if (inserted == 1) db.update("INSERT INTO user_role VALUES(?,?)", id, roles[i]);
              if (roles[i].equals("PATIENT"))
                db.update("INSERT IGNORE INTO patient VALUES(?,?)", id, id);
            }
            db.update(
                "INSERT IGNORE INTO specialty(id,name)"
                    + " VALUES('10000000-0000-0000-0000-000000000001','General practice')");
            db.update(
                "INSERT IGNORE INTO doctor(id,user_id)"
                    + " VALUES('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002')");
            db.update(
                "INSERT IGNORE INTO doctor_specialty"
                    + " VALUES('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001')");
          });
      LocalDate day = LocalDate.now(ScheduleService.ZONE).plusDays(1);
      for (int n = 0; n < 7; n++, day = day.plusDays(1)) {
        if (day.getDayOfWeek() == DayOfWeek.SUNDAY) continue;
        Instant start = day.atTime(8, 0).atZone(ScheduleService.ZONE).toInstant();
        String doctor = "20000000-0000-0000-0000-000000000001";
        if (db.count(
                "SELECT COUNT(*) FROM availability WHERE doctor_id=? AND start_at=?", doctor, start)
            == 0)
          schedules.availability(
              new Access.Actor("00000000-0000-0000-0000-000000000001", Set.of("ADMINISTRATOR")),
              doctor,
              start,
              start.plusSeconds(3600 * 4),
              20,
              "IN_PERSON");
      }
    };
  }
}
