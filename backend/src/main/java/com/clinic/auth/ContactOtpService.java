package com.clinic.auth;

import com.clinic.audit.Audit;
import com.clinic.common.Crypto;
import com.clinic.common.Problem;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class ContactOtpService {
  static final int TTL_SECONDS = 300;
  static final int COOLDOWN_SECONDS = 30;
  static final int MAX_ATTEMPTS = 5;
  static final int MAX_SENDS_PER_EMAIL_PER_HOUR = 5;
  static final int EMAIL_RATE_WINDOW_SECONDS = 3600;

  record PendingOtp(
      String emailHash, String otpHash, Instant expiresAt, Instant sentAt, int attempts) {}

  interface OtpStore {
    Optional<PendingOtp> find(String actorId);

    void save(String actorId, PendingOtp otp);

    void delete(String actorId);

    Instant lastSentToEmail(String emailHash);

    long countSentToEmailSince(String emailHash, Instant since);

    void recordSendToEmail(String emailHash, Instant sentAt);
  }

  private final Crypto crypto;
  private final JavaMailSender mail;
  private final Audit audit;
  private final Clock clock;
  private final OtpStore store;
  private final String mailFrom;
  private final boolean otpRequired;
  private final SecureRandom random = new SecureRandom();

  public ContactOtpService(
      Crypto crypto,
      JavaMailSender mail,
      Audit audit,
      Clock clock,
      OtpStore store,
      @Value("${clinic.mail-from}") String mailFrom,
      @Value("${clinic.contact-otp-required:true}") boolean otpRequired) {
    this.crypto = crypto;
    this.mail = mail;
    this.audit = audit;
    this.clock = clock;
    this.store = store;
    this.mailFrom = mailFrom;
    this.otpRequired = otpRequired;
  }

  public boolean isOtpRequired() {
    return otpRequired;
  }

  public int sendOtp(String actorId, String normalizedEmail) {
    Instant now = Instant.now(clock);
    PendingOtp existing = store.find(actorId).orElse(null);
    if (existing != null && existing.sentAt().plusSeconds(COOLDOWN_SECONDS).isAfter(now)) {
      throw new Problem(429, "Vui lòng chờ 30 giây trước khi gửi lại mã OTP.");
    }

    String emailHash = crypto.hash(normalizedEmail);
    Instant lastToEmail = store.lastSentToEmail(emailHash);
    if (lastToEmail != null && lastToEmail.plusSeconds(COOLDOWN_SECONDS).isAfter(now)) {
      throw new Problem(429, "Vui lòng chờ 30 giây trước khi gửi lại mã OTP.");
    }
    if (store.countSentToEmailSince(emailHash, now.minusSeconds(EMAIL_RATE_WINDOW_SECONDS))
        >= MAX_SENDS_PER_EMAIL_PER_HOUR) {
      throw new Problem(429, "Địa chỉ email này đã nhận quá nhiều mã OTP. Vui lòng thử lại sau.");
    }

    String code = String.format("%06d", random.nextInt(1_000_000));
    String otpHash = crypto.hash(actorId + "|" + normalizedEmail + "|" + code);

    if (otpRequired) {
      SimpleMailMessage message = new SimpleMailMessage();
      message.setFrom(mailFrom);
      message.setTo(normalizedEmail);
      message.setSubject("ClinicCare - Mã xác nhận đổi email");
      message.setText(
          "Mã OTP xác nhận đổi email nhận thông báo trên ClinicCare của bạn là: "
              + code
              + "\n\nMã có hiệu lực trong 5 phút. Nếu bạn không yêu cầu thay đổi này, vui lòng bỏ qua email này.");
      try {
        mail.send(message);
      } catch (MailException ex) {
        throw new Problem(503, "Không thể gửi email mã OTP lúc này. Vui lòng thử lại sau.");
      }
    }

    store.save(actorId, new PendingOtp(emailHash, otpHash, now.plusSeconds(TTL_SECONDS), now, 0));
    store.recordSendToEmail(emailHash, now);
    audit.record(actorId, "CONTACT_OTP_SENT", actorId);
    return TTL_SECONDS;
  }

  public void verifyAndConsume(String actorId, String normalizedEmail, String otp) {
    if (!otpRequired) return;
    Problem.require(
        otp != null && otp.matches("^[0-9]{6}$"), 400, "Vui lòng nhập mã OTP gồm 6 chữ số.");
    PendingOtp entry = store.find(actorId).orElse(null);
    Instant now = Instant.now(clock);
    if (entry == null || entry.expiresAt().isBefore(now)) {
      store.delete(actorId);
      throw new Problem(400, "Mã OTP đã hết hạn hoặc chưa được gửi. Vui lòng gửi lại mã.");
    }
    String emailHash = crypto.hash(normalizedEmail);
    String expectedOtpHash = crypto.hash(actorId + "|" + normalizedEmail + "|" + otp);
    if (!entry.emailHash().equals(emailHash) || !entry.otpHash().equals(expectedOtpHash)) {
      int nextAttempts = entry.attempts() + 1;
      if (nextAttempts >= MAX_ATTEMPTS) {
        store.delete(actorId);
        throw new Problem(400, "Bạn đã nhập sai mã OTP quá nhiều lần. Vui lòng gửi lại mã mới.");
      }
      store.save(
          actorId,
          new PendingOtp(
              entry.emailHash(), entry.otpHash(), entry.expiresAt(), entry.sentAt(), nextAttempts));
      throw new Problem(400, "Mã OTP không chính xác.");
    }
    store.delete(actorId);
  }
}
