package com.clinic.notification;

import com.clinic.common.*;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.*;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class NotificationWorker {
  private final NotificationStore store;
  private final JavaMailSender mail;
  private final Crypto crypto;
  private final boolean enabled;

  public NotificationWorker(
      NotificationStore s,
      JavaMailSender m,
      Crypto c,
      @Value("${clinic.notifications-enabled}") boolean enabled) {
    store = s;
    mail = m;
    crypto = c;
    this.enabled = enabled;
  }

  @Scheduled(fixedDelayString = "${clinic.notification-poll-ms:2000}")
  public void poll() {
    if (!enabled) return;
    for (int i = 0; i < 20; i++) {
      var job = store.claim();
      if (job == null) return;
      deliver(job);
    }
  }

  public void deliver(Map<String, Object> job) {
    var data = store.delivery(job);
    if (!data.get("version").equals(job.get("appointmentVersion"))) {
      store.complete(job, "SKIPPED", "OBSOLETE_VERSION");
      return;
    }
    if (data.get("emailEncrypted") == null) {
      store.complete(job, "FAILED", "EMAIL_MISSING");
      return;
    }
    try {
      var message = new SimpleMailMessage();
      message.setFrom("clinic@example.test");
      message.setTo(crypto.decrypt((byte[]) data.get("emailEncrypted")));
      message.setSubject("Clinic appointment " + job.get("eventType"));
      message.setText(
          "Appointment: "
              + job.get("appointmentId")
              + "\nStatus: "
              + data.get("status")
              + "\nTime: "
              + Db.instant(data, "startAt").atZone(ZoneId.of("Asia/Ho_Chi_Minh"))
              + "\nPlease sign in to view details.");
      mail.send(message);
    } catch (MailException e) {
      store.failed(job);
      return;
    }
    // If persistence fails after SMTP accepted, lease recovery can redeliver.
    store.complete(job, "SENT", null);
  }
}
