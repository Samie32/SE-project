package com.clinic.auth;

import com.clinic.common.Crypto;
import com.clinic.common.Db;
import java.util.Locale;
import java.util.Objects;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Re-computes contact blind indexes on startup when the HMAC key derivation changes
 * so existing encrypted email/phone rows remain searchable without re-entering data.
 */
@Component
class ContactHashSync {
  private final Db db;
  private final Crypto crypto;

  ContactHashSync(Db db, Crypto crypto) {
    this.db = db;
    this.crypto = crypto;
  }

  @EventListener(ApplicationReadyEvent.class)
  @Transactional
  public void sync() {
    var rows =
        db.list(
            "SELECT id,email_encrypted,email_hash,phone_encrypted,phone_hash FROM user_account"
                + " WHERE email_encrypted IS NOT NULL OR phone_encrypted IS NOT NULL");
    for (var row : rows) {
      String id = row.get("id").toString();
      String email = crypto.decryptOrNull(row.get("emailEncrypted"));
      if (email != null) {
        String expected = crypto.hash(email.strip().toLowerCase(Locale.ROOT));
        if (!Objects.equals(expected, row.get("emailHash"))) {
          db.update("UPDATE user_account SET email_hash=? WHERE id=?", expected, id);
        }
      }
      String phone = crypto.decryptOrNull(row.get("phoneEncrypted"));
      if (phone != null) {
        String expected = crypto.hash(phone.strip());
        if (!Objects.equals(expected, row.get("phoneHash"))) {
          db.update("UPDATE user_account SET phone_hash=? WHERE id=?", expected, id);
        }
      }
    }
  }
}
