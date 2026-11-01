package com.clinic.common;

import java.security.SecureRandom;
import java.util.*;
import javax.crypto.*;
import javax.crypto.spec.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class Crypto {
  private final SecretKeySpec key;

  public Crypto(@Value("${clinic.encryption-key}") String encoded) {
    byte[] bytes = Base64.getDecoder().decode(encoded);
    if (bytes.length != 32)
      throw new IllegalArgumentException("DATA_ENCRYPTION_KEY must encode 32 bytes");
    key = new SecretKeySpec(bytes, "AES");
  }

  public byte[] encrypt(String value) {
    try {
      byte[] iv = new byte[12];
      new SecureRandom().nextBytes(iv);
      Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
      c.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv));
      byte[] data = c.doFinal(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));
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
          c.doFinal(Arrays.copyOfRange(value, 12, value.length)),
          java.nio.charset.StandardCharsets.UTF_8);
    } catch (Exception e) {
      throw new IllegalStateException("Decryption failed", e);
    }
  }
}
