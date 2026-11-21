package com.clinic.auth;

import com.clinic.audit.Audit;
import com.clinic.common.Crypto;
import com.clinic.common.Problem;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
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

  private record PendingOtp(
      String emailHash, String otpHash, Instant expiresAt, Instant sentAt, int attempts) {}

  private final Crypto crypto;
  private final JavaMailSender mail;
  private final Audit audit;
  private final Clock clock;
  private final String mailFrom;
  private final boolean otpRequired;
  private final SecureRandom random = new SecureRandom();
  private final Map<String, PendingOtp> pending = new ConcurrentHashMap<>();

  public ContactOtpService(
      Crypto crypto,
      JavaMailSender mail,
      Audit audit,
      Clock clock,
      @Value("${clinic.mail-from}") String mailFrom,
      @Value("${clinic.notifications-enabled:true}") boolean otpRequired) {
    this.crypto = crypto;
    this.mail = mail;
    this.audit = audit;
    this.clock = clock;
    this.mailFrom = mailFrom;
    this.otpRequired = otpRequired;
  }

  public boolean isOtpRequired() {
    return otpRequired;
  }

  public int sendOtp(String actorId, String normalizedEmail) {
    Instant now = Instant.now(clock);
    PendingOtp existing = pending.get(actorId);
    if (existing != null && existing.sentAt().plusSeconds(COOLDOWN_SECONDS).isAfter(now)) {
      throw new Problem(429, "Vui lòng chờ 30 giây trước khi gửi lại mã OTP.");
    }
    String code = String.format("%06d", random.nextInt(1_000_000));
    String emailHash = crypto.hash(normalizedEmail);
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

    pending.put(
        actorId, new PendingOtp(emailHash, otpHash, now.plusSeconds(TTL_SECONDS), now, 0));
    audit.record(actorId, "CONTACT_OTP_SENT", actorId);
    return TTL_SECONDS;
  }

  public void verifyAndConsume(String actorId, String normalizedEmail, String otp) {
    if (!otpRequired) return;
    Problem.require(otp != null && otp.matches("^[0-9]{6}$"), 400, "Vui lòng nhập mã OTP gồm 6 chữ số.");
    PendingOtp entry = pending.get(actorId);
    Instant now = Instant.now(clock);
    if (entry == null || entry.expiresAt().isBefore(now)) {
      pending.remove(actorId);
      throw new Problem(400, "Mã OTP đã hết hạn hoặc chưa được gửi. Vui lòng gửi lại mã.");
    }
    String emailHash = crypto.hash(normalizedEmail);
    String expectedOtpHash = crypto.hash(actorId + "|" + normalizedEmail + "|" + otp);
    if (!entry.emailHash().equals(emailHash) || !entry.otpHash().equals(expectedOtpHash)) {
      int nextAttempts = entry.attempts() + 1;
      if (nextAttempts >= MAX_ATTEMPTS) {
        pending.remove(actorId);
        throw new Problem(400, "Bạn đã nhập sai mã OTP quá nhiều lần. Vui lòng gửi lại mã mới.");
      }
      pending.put(
          actorId,
          new PendingOtp(
              entry.emailHash(), entry.otpHash(), entry.expiresAt(), entry.sentAt(), nextAttempts));
      throw new Problem(400, "Mã OTP không chính xác.");
    }
    pending.remove(actorId);
  }
}
