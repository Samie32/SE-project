package com.clinic.notification;

import com.clinic.appointment.AppointmentDelayPolicy;
import com.clinic.common.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.*;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class NotificationWorker {
  private static final DateTimeFormatter CLINIC_TIME =
      DateTimeFormatter.ofPattern("HH:mm 'ngày' dd/MM/yyyy")
          .withZone(AppointmentDelayPolicy.CLINIC_ZONE);
  private final NotificationStore store;
  private final JavaMailSender mail;
  private final Crypto crypto;
  private final boolean enabled;
  private final String mailFrom;
  private final Clock clock;

  public NotificationWorker(
      NotificationStore s,
      JavaMailSender m,
      Crypto c,
      Clock clock,
      @Value("${clinic.notifications-enabled}") boolean enabled,
      @Value("${clinic.mail-from}") String mailFrom) {
    store = s;
    mail = m;
    crypto = c;
    this.clock = clock;
    this.enabled = enabled;
    this.mailFrom = mailFrom;
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
    // Read the latest appointment immediately before delivery. SMTP is outside database locks.
    var data = store.delivery(job);
    String event = job.get("eventType").toString();
    Instant estimatedStart =
        job.get("estimatedStartAt") == null ? null : Db.instant(job, "estimatedStartAt");
    if (!data.get("version").equals(job.get("appointmentVersion"))) {
      store.complete(job, "SKIPPED", "OBSOLETE_VERSION");
      return;
    }
    if ("REMINDER".equals(event)
        && (!"CONFIRMED".equals(data.get("status"))
            || !clock.instant().isBefore(Db.instant(data, "startAt")))) {
      store.complete(job, "SKIPPED", "APPOINTMENT_NOT_REMINDABLE");
      return;
    }
    if ("DELAY_NOTICE".equals(event)) {
      Instant now = clock.instant();
      boolean estimateExpired = estimatedStart != null && !estimatedStart.isAfter(now);
      if (!AppointmentDelayPolicy.canNotify(data, now) || estimateExpired) {
        store.complete(job, "SKIPPED", "DELAY_NOTICE_NO_LONGER_APPLICABLE");
        return;
      }
    }
    if ("NO_SHOW_REBOOKING".equals(event) && !"NO_SHOW".equals(data.get("status"))) {
      store.complete(job, "SKIPPED", "APPOINTMENT_NOT_NO_SHOW");
      return;
    }
    if (data.get("emailEncrypted") == null) {
      store.complete(job, "FAILED", "EMAIL_MISSING");
      return;
    }
    try {
      var message = new SimpleMailMessage();
      message.setFrom(mailFrom);
      message.setTo(crypto.decrypt((byte[]) data.get("emailEncrypted")));
      Instant start = Db.instant(data, "startAt");
      switch (event) {
        case "DELAY_NOTICE" -> {
          String estimate =
              estimatedStart == null
                  ? ""
                  : "\nGiờ bắt đầu dự kiến: " + CLINIC_TIME.format(estimatedStart) + ".";
          message.setSubject("ClinicCare - Thông báo chậm giờ hẹn");
          message.setText(
              "Phòng khám dự kiến bắt đầu muộn hơn giờ hẹn "
                  + CLINIC_TIME.format(start) + "." + estimate
                  + "\nVui lòng đăng nhập ClinicCare để xem lịch hẹn.");
        }
        case "NO_SHOW_REBOOKING" -> {
          message.setSubject("ClinicCare - Mời đặt lịch mới");
          message.setText(
              "Lịch hẹn lúc " + CLINIC_TIME.format(start)
                  + " đã được ghi nhận vắng mặt."
                  + "\nNếu vẫn cần khám, vui lòng đăng nhập ClinicCare để đặt lịch mới.");
        }
        default -> {
          message.setSubject("Clinic appointment " + event);
          message.setText(
              "Appointment: "
                  + job.get("appointmentId")
                  + "\nStatus: "
                  + data.get("status")
                  + "\nTime: "
                  + start.atZone(AppointmentDelayPolicy.CLINIC_ZONE)
                  + "\nPlease sign in to view details.");
        }
      }
      mail.send(message);
    } catch (MailException e) {
      store.failed(job);
      return;
    }
    // If persistence fails after SMTP accepted, lease recovery can redeliver.
    store.complete(job, "SENT", null);
  }
}
