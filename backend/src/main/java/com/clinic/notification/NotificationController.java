package com.clinic.notification;

import com.clinic.auth.Access;
import com.clinic.common.Db;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notification-jobs")
public class NotificationController {
  private final Access access;
  private final Db db;

  public NotificationController(Access a, Db db) {
    access = a;
    this.db = db;
  }

  @GetMapping
  public Object list(@AuthenticationPrincipal Jwt j) {
    access.actor(j).require("RECEPTIONIST", "ADMINISTRATOR");
    return db.list(
        "SELECT id,appointment_id,event_type,status,attempts,last_error,due_at FROM"
            + " notification_job ORDER BY due_at DESC LIMIT 100");
  }
}
