package com.clinic.appointment;

import com.clinic.common.Db;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Map;

public final class AppointmentDelayPolicy {
  public static final ZoneId CLINIC_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

  private AppointmentDelayPolicy() {}

  public static boolean canNotify(Map<String, Object> appointment, Instant now) {
    Instant start = Db.instant(appointment, "startAt");
    return sameClinicDay(start, now)
        && (("CONFIRMED".equals(appointment.get("status")) && now.isBefore(start.plusSeconds(900)))
            || ("CHECKED_IN".equals(appointment.get("status"))
                && "IN_PERSON".equals(appointment.get("mode"))));
  }

  public static boolean sameClinicDay(Instant first, Instant second) {
    return first.atZone(CLINIC_ZONE).toLocalDate().equals(second.atZone(CLINIC_ZONE).toLocalDate());
  }
}
