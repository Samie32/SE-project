package com.clinic.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.clinic.audit.Audit;
import com.clinic.common.Crypto;
import com.clinic.common.Problem;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

class ContactOtpServiceTest {
  private static final Pattern SIX_DIGITS = Pattern.compile("\\b([0-9]{6})\\b");

  static class InMemoryOtpStore implements ContactOtpService.OtpStore {
    private final Map<String, ContactOtpService.PendingOtp> byActor = new ConcurrentHashMap<>();
    private final List<Map.Entry<String, Instant>> sendLog = new ArrayList<>();

    @Override
    public Optional<ContactOtpService.PendingOtp> find(String actorId) {
      return Optional.ofNullable(byActor.get(actorId));
    }

    @Override
    public void save(String actorId, ContactOtpService.PendingOtp otp) {
      byActor.put(actorId, otp);
    }

    @Override
    public void delete(String actorId) {
      byActor.remove(actorId);
    }

    @Override
    public Instant lastSentToEmail(String emailHash) {
      Instant latest = null;
      for (var entry : sendLog) {
        if (entry.getKey().equals(emailHash)
            && (latest == null || entry.getValue().isAfter(latest))) {
          latest = entry.getValue();
        }
      }
      return latest;
    }

    @Override
    public long countSentToEmailSince(String emailHash, Instant since) {
      return sendLog.stream()
          .filter(e -> e.getKey().equals(emailHash) && !e.getValue().isBefore(since))
          .count();
    }

    @Override
    public void recordSendToEmail(String emailHash, Instant sentAt) {
      sendLog.add(Map.entry(emailHash, sentAt));
    }
  }

  private Crypto crypto;
  private JavaMailSender mail;
  private Audit audit;
  private InMemoryOtpStore store;
  private Instant now;
  private Clock fixedClock;
  private ContactOtpService service;

  @BeforeEach
  void setup() {
    byte[] rawKey = new byte[32];
    for (int i = 0; i < rawKey.length; i++) rawKey[i] = (byte) (i + 1);
    crypto = new Crypto(Base64.getEncoder().encodeToString(rawKey));
    mail = mock(JavaMailSender.class);
    audit = mock(Audit.class);
    store = new InMemoryOtpStore();
    now = Instant.parse("2026-11-21T12:00:00Z");
    fixedClock =
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
    service =
        new ContactOtpService(
            crypto, mail, audit, fixedClock, store, "clinic@example.test", true);
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
        assertThrows(
            Problem.class, () -> service.verifyAndConsume("u1", "other@example.test", code));
    assertEquals(400, wrongEmail.status);

    // Correct email and OTP succeeds and consumes token.
    assertDoesNotThrow(() -> service.verifyAndConsume("u1", "new@example.test", code));

    // Reusing consumed OTP fails.
    Problem reused =
        assertThrows(
            Problem.class, () -> service.verifyAndConsume("u1", "new@example.test", code));
    assertEquals(400, reused.status);
  }

  @Test
  void enforcesCooldownExpiryAndMaxAttempts() {
    service.sendOtp("u2", "patient@example.test");
    String code = captureSentCode();

    // Cooldown within 30 seconds.
    Problem cooldown =
        assertThrows(Problem.class, () -> service.sendOtp("u2", "patient@example.test"));
    assertEquals(429, cooldown.status);

    // 5 wrong attempts invalidate the OTP.
    String wrong = code.equals("000000") ? "111111" : "000000";
    for (int i = 0; i < 5; i++) {
      Problem err =
          assertThrows(
              Problem.class, () -> service.verifyAndConsume("u2", "patient@example.test", wrong));
      assertEquals(400, err.status);
    }
    Problem afterLock =
        assertThrows(
            Problem.class, () -> service.verifyAndConsume("u2", "patient@example.test", code));
    assertEquals(400, afterLock.status);

    // Resend after cooldown and test expiry.
    now = now.plusSeconds(31);
    service.sendOtp("u2", "patient@example.test");
    String freshCode = captureSentCode();
    now = now.plusSeconds(301);
    Problem expired =
        assertThrows(
            Problem.class, () -> service.verifyAndConsume("u2", "patient@example.test", freshCode));
    assertEquals(400, expired.status);
  }

  @Test
  void enforcesTargetEmailCooldownAndHourlyRateLimitAcrossActors() {
    String target = "shared-target@example.test";
    service.sendOtp("actor-a", target);

    // A different actor targeting the same email within 30s is rate-limited.
    Problem crossActorCooldown =
        assertThrows(Problem.class, () -> service.sendOtp("actor-b", target));
    assertEquals(429, crossActorCooldown.status);

    // Send 4 more times spaced 31s apart (total 5 within 1 hour).
    for (int i = 1; i < ContactOtpService.MAX_SENDS_PER_EMAIL_PER_HOUR; i++) {
      now = now.plusSeconds(31);
      service.sendOtp("actor-" + i, target);
    }

    // 6th send within 1 hour is blocked even after 31s cooldown.
    now = now.plusSeconds(31);
    Problem hourlyLimit = assertThrows(Problem.class, () -> service.sendOtp("actor-6", target));
    assertEquals(429, hourlyLimit.status);

    // After the 1-hour window rolls past the oldest send, sending is allowed again.
    now = now.plusSeconds(3601);
    assertEquals(300, service.sendOtp("actor-7", target));
  }

  @Test
  void cryptoHashUsesDomainSeparatedKey() throws Exception {
    byte[] rawKey = new byte[32];
    for (int i = 0; i < rawKey.length; i++) rawKey[i] = (byte) (i + 1);
    Mac rawMac = Mac.getInstance("HmacSHA256");
    rawMac.init(new SecretKeySpec(rawKey, "HmacSHA256"));
    String rawHmac =
        HexFormat.of().formatHex(rawMac.doFinal("patient@example.test".getBytes(StandardCharsets.UTF_8)));

    String derivedHash = crypto.hash("patient@example.test");
    assertEquals(64, derivedHash.length());
    assertEquals(derivedHash, crypto.hash("patient@example.test"));
    assertNotEquals(rawHmac, derivedHash);

    byte[] cipher = crypto.encrypt("secret@example.test");
    assertEquals("secret@example.test", crypto.decryptOrNull(cipher));
    assertNull(crypto.decryptOrNull(new byte[] {1, 2, 3}));
  }

  @Test
  void otpDisabledFlagSkipsVerification() {
    ContactOtpService optionalOtp =
        new ContactOtpService(
            crypto, mail, audit, fixedClock, store, "clinic@example.test", false);
    assertFalse(optionalOtp.isOtpRequired());
    assertDoesNotThrow(() -> optionalOtp.verifyAndConsume("u9", "a@b.test", null));
    verifyNoInteractions(mail);
  }
}
