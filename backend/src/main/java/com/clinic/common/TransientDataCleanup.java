package com.clinic.common;

import java.time.Clock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class TransientDataCleanup {
  private final Db db;
  private final Clock clock;

  public TransientDataCleanup(Db db, Clock clock) {
    this.db = db;
    this.clock = clock;
  }

  @Scheduled(
      fixedDelayString = "${clinic.cleanup-ms:60000}",
      initialDelayString = "${clinic.cleanup-ms:60000}")
  @Transactional
  public void clean() {
    db.update("DELETE FROM telehealth_token WHERE expires_at<=? LIMIT 1000", clock.instant());
    db.update(
        "DELETE FROM telehealth_signal WHERE created_at<? LIMIT 1000",
        clock.instant().minusSeconds(300));
    db.update("DELETE FROM idempotency_record WHERE expires_at<=? LIMIT 1000", clock.instant());
    db.update("DELETE FROM contact_otp WHERE expires_at<? LIMIT 1000", clock.instant());
    db.update(
        "DELETE FROM contact_otp_send_log WHERE sent_at<? LIMIT 1000",
        clock.instant().minusSeconds(3600));
  }
}
