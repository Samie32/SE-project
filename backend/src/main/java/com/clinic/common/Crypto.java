package com.clinic.common;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.*;
import javax.crypto.*;
import javax.crypto.spec.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class Crypto {
  private static final byte[] BLIND_INDEX_CONTEXT =
      "cliniccare:blind-index:v1".getBytes(StandardCharsets.UTF_8);
  private static final byte[] AUDIT_CHAIN_CONTEXT =
      "cliniccare:audit-chain:v1".getBytes(StandardCharsets.UTF_8);

  private final SecretKeySpec key;
  private final SecretKeySpec hmacKey;
  private final SecretKeySpec auditMacKey;

  public Crypto(@Value("${clinic.encryption-key}") String encoded) {
    byte[] bytes = Base64.getDecoder().decode(encoded);
    if (bytes.length != 32)
      throw new IllegalArgumentException("DATA_ENCRYPTION_KEY must encode 32 bytes");
    key = new SecretKeySpec(bytes, "AES");
    hmacKey = new SecretKeySpec(deriveHmacKey(bytes, BLIND_INDEX_CONTEXT), "HmacSHA256");
    auditMacKey = new SecretKeySpec(deriveHmacKey(bytes, AUDIT_CHAIN_CONTEXT), "HmacSHA256");
  }

  private static byte[] deriveHmacKey(byte[] masterKey, byte[] context) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(masterKey, "HmacSHA256"));
      return mac.doFinal(context);
    } catch (Exception e) {
      throw new IllegalStateException("Key derivation failed", e);
    }
  }

  public byte[] encrypt(String value) {
    try {
      byte[] iv = new byte[12];
      new SecureRandom().nextBytes(iv);
      Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
      c.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv));
      byte[] data = c.doFinal(value.getBytes(StandardCharsets.UTF_8));
      byte[] result = Arrays.copyOf(iv, iv.length + data.length);
      System.arraycopy(data, 0, result, iv.length, data.length);
      return result;
    } catch (Exception e) {
      throw new IllegalStateException("Encryption failed", e);
    }
  }

  public String decrypt(byte[] value) {
    try {
      Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
      c.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, Arrays.copyOf(value, 12)));
      return new String(
          c.doFinal(Arrays.copyOfRange(value, 12, value.length)), StandardCharsets.UTF_8);
    } catch (Exception e) {
      throw new IllegalStateException("Decryption failed", e);
    }
  }

  public String decryptOrNull(Object raw) {
    if (!(raw instanceof byte[] bytes) || bytes.length <= 12) return null;
    try {
      return decrypt(bytes);
    } catch (RuntimeException ignored) {
      return null;
    }
  }

  public String hash(String value) {
    return mac(hmacKey, value);
  }

  public String auditMac(String value) {
    return mac(auditMacKey, value);
  }

  private static String mac(SecretKeySpec macKey, String value) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(macKey);
      byte[] digest = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digest);
    } catch (Exception e) {
      throw new IllegalStateException("Hashing failed", e);
    }
  }
}
