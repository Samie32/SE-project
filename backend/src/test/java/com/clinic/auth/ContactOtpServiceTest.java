package com.clinic.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.clinic.audit.Audit;
import com.clinic.common.Crypto;
import com.clinic.common.Problem;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

class ContactOtpServiceTest {
  private static final Pattern SIX_DIGITS = Pattern.compile("\\b([0-9]{6})\\b");

  private Crypto crypto;
  private JavaMailSender mail;
  private Audit audit;
  private Instant now;
  private ContactOtpService service;

  @BeforeEach
  void setup() {
    crypto = new Crypto(Base64.getEncoder().encodeToString(new byte[32]));
    mail = mock(JavaMailSender.class);
    audit = mock(Audit.class);
    now = Instant.parse("2026-11-21T12:00:00Z");
    Clock clock =
        new Clock() {
          @Override
          public java.time.ZoneId getZone() {
            return ZoneOffset.UTC;
          }

          @Override
          public Clock withZone(java.time.ZoneId zone) {
            return this;
          }

          @Override
          public Instant instant() {
            return now;
          }
        };
    service = new ContactOtpService(crypto, mail, audit, clock, "clinic@example.test", true);
  }

  private String captureSentCode() {
    ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
    verify(mail, atLeastOnce()).send(captor.capture());
    String text = captor.getValue().getText();
    Matcher m = SIX_DIGITS.matcher(text == null ? "" : text);
    assertTrue(m.find(), "Expected 6-digit OTP in email body");
    return m.group(1);
  }

  @Test
  void sendsOtpAndVerifiesOnceForMatchingEmail() {
    int ttl = service.sendOtp("u1", "new@example.test");
    assertEquals(300, ttl);
    String code = captureSentCode();
    verify(audit).record("u1", "CONTACT_OTP_SENT", "u1");

    // Wrong email fails.
    Problem wrongEmail =
        assertThrows(Problem.class, () -> service.verifyAndConsume("u1", "other@example.test", code));
    assertEquals(400, wrongEmail.status);

    // Correct email and OTP succeeds and consumes token.
    assertDoesNotThrow(() -> service.verifyAndConsume("u1", "new@example.test", code));

    // Reusing consumed OTP fails.
    Problem reused =
        assertThrows(Problem.class, () -> service.verifyAndConsume("u1", "new@example.test", code));
    assertEquals(400, reused.status);
  }

  @Test
  void enforcesCooldownExpiryAndMaxAttempts() {
    service.sendOtp("u2", "patient@example.test");
    String code = captureSentCode();

    // Cooldown within 30 seconds.
    Problem cooldown = assertThrows(Problem.class, () -> service.sendOtp("u2", "patient@example.test"));
    assertEquals(429, cooldown.status);

    // 5 wrong attempts invalidate the OTP.
    String wrong = code.equals("000000") ? "111111" : "000000";
    for (int i = 0; i < 5; i++) {
      Problem err =
          assertThrows(Problem.class, () -> service.verifyAndConsume("u2", "patient@example.test", wrong));
      assertEquals(400, err.status);
    }
    Problem afterLock =
        assertThrows(Problem.class, () -> service.verifyAndConsume("u2", "patient@example.test", code));
    assertEquals(400, afterLock.status);

    // Resend after cooldown and test expiry.
    now = now.plusSeconds(31);
    service.sendOtp("u2", "patient@example.test");
    String freshCode = captureSentCode();
    now = now.plusSeconds(301);
    Problem expired =
        assertThrows(Problem.class, () -> service.verifyAndConsume("u2", "patient@example.test", freshCode));
    assertEquals(400, expired.status);
  }
}
