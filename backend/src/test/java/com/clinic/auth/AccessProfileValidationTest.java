package com.clinic.auth;

import static org.junit.jupiter.api.Assertions.*;

import java.time.LocalDate;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

class AccessProfileValidationTest {

  @Test
  void normalizePhoneOrNullAcceptsOnlyValidVietnamMobileNumbers() {
    assertEquals("0901234567", Access.normalizePhoneOrNull("0901234567"));
    assertEquals("0901234567", Access.normalizePhoneOrNull("+84 901 234 567"));
    assertEquals("0988776655", Access.normalizePhoneOrNull("84988776655"));
    assertEquals("0321234567", Access.normalizePhoneOrNull("032-123-4567"));
    assertEquals("0561234567", Access.normalizePhoneOrNull("056.123.4567"));
    assertEquals("0701234567", Access.normalizePhoneOrNull("(070) 123 4567"));
    assertEquals("0811234567", Access.normalizePhoneOrNull("0811234567"));

    assertNull(Access.normalizePhoneOrNull(null));
    assertNull(Access.normalizePhoneOrNull(""));
    assertNull(Access.normalizePhoneOrNull("+14155551234"));
    assertNull(Access.normalizePhoneOrNull("0123456789"));
    assertNull(Access.normalizePhoneOrNull("02838221111"));
    assertNull(Access.normalizePhoneOrNull("090123456"));
    assertNull(Access.normalizePhoneOrNull("09012345678"));
    assertNull(Access.normalizePhoneOrNull("1234567"));
    assertNull(Access.normalizePhoneOrNull("090123456a"));
  }

  @Test
  void normalizeBirthDateOrNullValidatesRangeAndFormat() {
    assertEquals(LocalDate.of(1999, 5, 15), Access.normalizeBirthDateOrNull("1999-05-15"));
    LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    assertEquals(today, Access.normalizeBirthDateOrNull(today.toString()));

    assertNull(Access.normalizeBirthDateOrNull(null));
    assertNull(Access.normalizeBirthDateOrNull("  "));
    assertNull(Access.normalizeBirthDateOrNull("15/05/1999"));
    assertNull(Access.normalizeBirthDateOrNull("1899-12-31"));
    assertNull(Access.normalizeBirthDateOrNull(today.plusDays(1).toString()));
  }

  @Test
  void normalizeTextOrNullTrimsAndEnforcesMaxLength() {
    assertEquals("Hà Nội", Access.normalizeTextOrNull("  Hà Nội  ", 255));
    assertNull(Access.normalizeTextOrNull("   ", 255));
    assertNull(Access.normalizeTextOrNull("a".repeat(256), 255));
  }
}
