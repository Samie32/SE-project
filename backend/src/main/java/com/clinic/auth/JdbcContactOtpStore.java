package com.clinic.auth;

import com.clinic.common.Db;
import java.time.Instant;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
class JdbcContactOtpStore implements ContactOtpService.OtpStore {
  private final Db db;

  JdbcContactOtpStore(Db db) {
    this.db = db;
  }

  @Override
  public Optional<ContactOtpService.PendingOtp> find(String actorId) {
    var rows =
        db.list(
            "SELECT email_hash,otp_hash,expires_at,sent_at,attempts FROM contact_otp WHERE actor_id=?",
            actorId);
    if (rows.isEmpty()) return Optional.empty();
    var row = rows.getFirst();
    return Optional.of(
        new ContactOtpService.PendingOtp(
            row.get("emailHash").toString(),
            row.get("otpHash").toString(),
            Db.instant(row, "expiresAt"),
            Db.instant(row, "sentAt"),
            ((Number) row.get("attempts")).intValue()));
  }

  @Override
  public void save(String actorId, ContactOtpService.PendingOtp otp) {
    db.update(
        """
        INSERT INTO contact_otp(actor_id,email_hash,otp_hash,expires_at,sent_at,attempts)
        VALUES(?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
          email_hash=VALUES(email_hash),
          otp_hash=VALUES(otp_hash),
          expires_at=VALUES(expires_at),
          sent_at=VALUES(sent_at),
          attempts=VALUES(attempts)
        """,
        actorId,
        otp.emailHash(),
        otp.otpHash(),
        otp.expiresAt(),
        otp.sentAt(),
        otp.attempts());
  }

  @Override
  public void delete(String actorId) {
    db.update("DELETE FROM contact_otp WHERE actor_id=?", actorId);
  }

  @Override
  public Instant lastSentToEmail(String emailHash) {
    var rows =
        db.list(
            "SELECT sent_at FROM contact_otp_send_log WHERE email_hash=? ORDER BY sent_at DESC LIMIT 1",
            emailHash);
    return rows.isEmpty() ? null : Db.instant(rows.getFirst(), "sentAt");
  }

  @Override
  public long countSentToEmailSince(String emailHash, Instant since) {
    return db.count(
        "SELECT COUNT(*) FROM contact_otp_send_log WHERE email_hash=? AND sent_at>=?",
        emailHash,
        since);
  }

  @Override
  public void recordSendToEmail(String emailHash, Instant sentAt) {
    db.update(
        "INSERT INTO contact_otp_send_log(id,email_hash,sent_at) VALUES(?,?,?)",
        Db.id(),
        emailHash,
        sentAt);
  }
}
