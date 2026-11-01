package com.clinic.notification;

import com.clinic.audit.Audit;
import com.clinic.common.*;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationStore {
  private final Db db;
  private final Clock clock;
  private final Audit audit;

  public NotificationStore(Db db, Clock clock, Audit audit) {
    this.db = db;
    this.clock = clock;
    this.audit = audit;
  }

  @Transactional
  public Map<String, Object> claim() {
    var rows =
        db.list(
            """
            SELECT * FROM notification_job WHERE
            (status='PENDING' AND due_at<=?) OR (status='PROCESSING' AND lease_until<?)
            ORDER BY due_at LIMIT 1 FOR UPDATE SKIP LOCKED
            """,
            clock.instant(),
            clock.instant());
    if (rows.isEmpty()) return null;
    var job = rows.getFirst();
    String token = Db.id();
    db.update(
        "UPDATE notification_job SET status='PROCESSING',lease_until=?,lease_token=? WHERE id=?",
        clock.instant().plusSeconds(60),
        token,
        job.get("id"));
    job.put("leaseToken", token);
    return job;
  }

  public Map<String, Object> delivery(Map<String, Object> job) {
    return db.one(
        """
        SELECT a.version,a.status,a.start_at,a.mode,u.email_encrypted FROM appointment a
        JOIN patient p ON p.id=a.patient_id JOIN user_account u ON u.id=p.user_id WHERE a.id=?
        """,
        job.get("appointmentId"));
  }

  @Transactional
  public void complete(Map<String, Object> job, String status, String code) {
    if (db.update(
            "UPDATE notification_job SET status=?,lease_until=NULL,last_error=? WHERE id=? AND"
                + " lease_token=? AND status='PROCESSING'",
            status,
            code,
            job.get("id"),
            job.get("leaseToken"))
        == 1) audit.record(null, "NOTIFICATION_" + status, job.get("id").toString());
  }

  @Transactional
  public void failed(Map<String, Object> job) {
    int attempts = ((Number) job.get("attempts")).intValue() + 1;
    int[] delays = {60, 300, 900};
    boolean terminal = attempts > delays.length;
    db.update(
        "UPDATE notification_job SET"
            + " status=?,attempts=?,due_at=?,lease_until=NULL,last_error='SMTP_UNAVAILABLE' WHERE"
            + " id=? AND lease_token=? AND status='PROCESSING'",
        terminal ? "FAILED" : "PENDING",
        attempts,
        clock.instant().plusSeconds(terminal ? 0 : delays[attempts - 1]),
        job.get("id"),
        job.get("leaseToken"));
  }
}
