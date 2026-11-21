package com.clinic.config;

import com.clinic.auth.Access;
import com.clinic.availability.ClinicHours;
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
      ClinicHours hours,
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
              String username = names[i];
              String email = username + "@example.test";
              String emailHash = crypto.hash(email);
              int inserted =
                  db.update(
                      "INSERT IGNORE INTO"
                          + " user_account(id,issuer,subject,display_name,username,email_encrypted,email_hash,staff)"
                          + " VALUES(?,?,?,?,?,?,?,?)",
                      id,
                      issuer,
                      id,
                      username,
                      username,
                      crypto.encrypt(email),
                      emailHash,
                      !roles[i].equals("PATIENT"));
              if (inserted == 0) {
                db.update("UPDATE user_account SET username=? WHERE issuer=? AND subject=? AND username IS NULL",
                    username, issuer, id);
                db.update("UPDATE user_account SET email_hash=? WHERE issuer=? AND subject=? AND (email_hash IS NULL OR email_hash<>?)",
                    emailHash, issuer, id, emailHash);
              }
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
      var week = hours.read().days();
      LocalDate day = LocalDate.now(ScheduleService.ZONE).plusDays(1);
      for (int n = 0; n < 7; n++, day = day.plusDays(1)) {
        var operatingHours = week.get(day.getDayOfWeek().getValue() - 1);
        if (operatingHours.opensAt() == null) continue;
        seedShift(db, schedules, day, operatingHours, LocalTime.of(8, 0), LocalTime.NOON, "IN_PERSON");
        seedShift(db, schedules, day, operatingHours, LocalTime.of(13, 0), LocalTime.of(17, 0), "REMOTE");
      }
    };
  }

  private static void seedShift(Db db, ScheduleService schedules, LocalDate day,
      ClinicHours.DayHours operatingHours, LocalTime shiftStart, LocalTime shiftEnd, String mode) {
    var opening = LocalTime.parse(operatingHours.opensAt());
    var closing = LocalTime.parse(operatingHours.closesAt());
    var zone = ScheduleService.ZONE;
    Instant start = day.atTime(opening.isAfter(shiftStart) ? opening : shiftStart).atZone(zone).toInstant();
    Instant end = day.atTime(closing.isBefore(shiftEnd) ? closing : shiftEnd).atZone(zone).toInstant();
    long minutes = Duration.between(start, end).toMinutes();
    if (minutes < 20) return;

    Instant alignedEnd = start.plusSeconds(minutes / 20 * 20 * 60);
    String doctor = "20000000-0000-0000-0000-000000000001";
    if (db.count("SELECT COUNT(*) FROM availability WHERE doctor_id=? AND start_at<? AND end_at>?",
        doctor, alignedEnd, start) == 0) {
      schedules.availability(
          new Access.Actor("00000000-0000-0000-0000-000000000001", Set.of("ADMINISTRATOR")),
          doctor, start, alignedEnd, 20, mode);
    }
  }
}
