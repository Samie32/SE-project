package com.clinic.audit;

import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;

public final class AuditActionCatalog {
  private AuditActionCatalog() {}

  public static final Set<String> VALID_RESULTS = Set.of("SUCCESS", "DENIED", "FAILURE");
  public static final Set<String> VALID_ACTOR_TYPES = Set.of("USER", "SYSTEM");

  public static final List<String> READ_NOISE_ACTIONS =
      List.of(
          "PROFILE_READ",
          "AUDIT_SEARCH",
          "APPOINTMENT_LIST_READ",
          "APPOINTMENT_READ",
          "QUEUE_READ",
          "USERS_READ",
          "TELEHEALTH_READ",
          "TELEHEALTH_SIGNALS_READ",
          "TELEHEALTH_SIGNAL_SENT");

  public static final String ACCESS_CONTROL_SQL =
      "(a.action IN ('ROLES_CHANGED','STAFF_CREATED','STAFF_UPDATED','PATIENT_ACCOUNT_LOOKUP')"
          + " OR a.action LIKE 'PATIENT_ACCOUNT_LOCKED_%'"
          + " OR a.action LIKE 'PATIENT_ACCOUNT_UNLOCKED_%')";

  public static final Map<String, String> CATEGORY_SQL =
      Map.of(
          "ACCESS_CONTROL",
          ACCESS_CONTROL_SQL,
          "CLINICAL",
          "(a.action LIKE 'RECORD_%' OR a.action LIKE 'PRESCRIPTION_%'"
              + " OR a.action IN ('PATIENT_RECORDS_READ','ENCOUNTER_PRESCRIPTIONS_READ',"
              + "'PATIENT_PRESCRIPTIONS_READ'))",
          "APPOINTMENT",
          "(a.action LIKE 'APPOINTMENT_%' OR a.action LIKE 'QUEUE_%')",
          "TELEHEALTH",
          "a.action LIKE 'TELEHEALTH_%'",
          "CATALOG",
          "(a.action LIKE 'DOCTOR_%' OR a.action LIKE 'SPECIALTY_%'"
              + " OR a.action LIKE 'CLINIC_%' OR a.action LIKE 'AVAILABILITY_%'"
              + " OR a.action LIKE 'TIME_OFF_%')",
          "NOTIFICATION",
          "a.action LIKE 'NOTIFICATION_%'",
          "AUDIT",
          "a.action LIKE 'AUDIT_%'");

  private static final Map<String, String> ACTION_LABELS_VI =
      Map.ofEntries(
          Map.entry("ACCOUNT_REGISTERED", "Đăng ký tài khoản bệnh nhân"),
          Map.entry("PROFILE_READ", "Xem hồ sơ cá nhân"),
          Map.entry("CONTACT_OTP_SENT", "Gửi mã OTP xác thực email"),
          Map.entry("CONTACT_UPDATED", "Cập nhật thông tin liên hệ"),
          Map.entry("PROFILE_UPDATED", "Cập nhật thông tin cá nhân"),
          Map.entry("USERS_READ", "Xem danh sách nhân sự"),
          Map.entry("STAFF_CREATED", "Tạo tài khoản nhân sự"),
          Map.entry("STAFF_UPDATED", "Cập nhật tài khoản nhân sự"),
          Map.entry("ROLES_CHANGED", "Thay đổi phân quyền nhân sự"),
          Map.entry("PATIENT_ACCOUNT_LOOKUP", "Tra cứu tài khoản bệnh nhân"),
          Map.entry(
              "PATIENT_ACCOUNT_LOCKED_SECURITY_REVIEW",
              "Khóa tài khoản bệnh nhân (Rà soát bảo mật)"),
          Map.entry(
              "PATIENT_ACCOUNT_LOCKED_POLICY_REVIEW",
              "Khóa tài khoản bệnh nhân (Rà soát quy định)"),
          Map.entry(
              "PATIENT_ACCOUNT_LOCKED_PATIENT_REQUEST",
              "Khóa tài khoản bệnh nhân (Yêu cầu bệnh nhân)"),
          Map.entry(
              "PATIENT_ACCOUNT_UNLOCKED_SECURITY_REVIEW",
              "Mở khóa tài khoản bệnh nhân (Rà soát bảo mật)"),
          Map.entry(
              "PATIENT_ACCOUNT_UNLOCKED_POLICY_REVIEW",
              "Mở khóa tài khoản bệnh nhân (Rà soát quy định)"),
          Map.entry(
              "PATIENT_ACCOUNT_UNLOCKED_PATIENT_REQUEST",
              "Mở khóa tài khoản bệnh nhân (Yêu cầu bệnh nhân)"),
          Map.entry("SPECIALTY_CREATED", "Tạo chuyên khoa"),
          Map.entry("SPECIALTY_UPDATED", "Cập nhật chuyên khoa"),
          Map.entry("DOCTOR_CREATED", "Tạo hồ sơ bác sĩ"),
          Map.entry("DOCTOR_UPDATED", "Cập nhật hồ sơ bác sĩ"),
          Map.entry("CLINIC_HOURS_UPDATED", "Cập nhật giờ hoạt động phòng khám"),
          Map.entry("CLINIC_HOLIDAY_CREATED", "Thêm lịch nghỉ lễ"),
          Map.entry("CLINIC_HOLIDAY_REMOVED", "Xóa lịch nghỉ lễ"),
          Map.entry("AVAILABILITY_CREATED", "Tạo ca làm việc bác sĩ"),
          Map.entry("AVAILABILITY_REMOVED", "Xóa ca làm việc bác sĩ"),
          Map.entry("TIME_OFF_CREATED", "Đăng ký thời gian nghỉ bác sĩ"),
          Map.entry("TIME_OFF_REMOVED", "Xóa thời gian nghỉ bác sĩ"),
          Map.entry("APPOINTMENT_BOOKED", "Đặt lịch khám"),
          Map.entry("APPOINTMENT_RESCHEDULED", "Đổi lịch khám"),
          Map.entry("APPOINTMENT_CANCELLED", "Hủy lịch khám"),
          Map.entry("APPOINTMENT_CHECKED_IN", "Check-in tiếp đón"),
          Map.entry("APPOINTMENT_IN_PROGRESS", "Bắt đầu ca khám"),
          Map.entry("APPOINTMENT_COMPLETED", "Hoàn tất ca khám"),
          Map.entry("APPOINTMENT_NO_SHOW", "Ghi nhận vắng mặt"),
          Map.entry("APPOINTMENT_DELAY_NOTICE_QUEUED", "Tạo thông báo chậm giờ hẹn"),
          Map.entry("APPOINTMENT_READ", "Xem chi tiết lịch hẹn"),
          Map.entry("APPOINTMENT_LIST_READ", "Xem danh sách lịch hẹn"),
          Map.entry("QUEUE_READ", "Xem hàng đợi khám"),
          Map.entry("QUEUE_CALLED", "Gọi bệnh nhân vào khám"),
          Map.entry("QUEUE_SKIPPED", "Bỏ lượt, đưa về cuối hàng"),
          Map.entry("RECORD_DRAFT", "Lưu bản nháp bệnh án"),
          Map.entry("RECORD_FINAL", "Hoàn tất hồ sơ bệnh án"),
          Map.entry("RECORD_AMENDED", "Chỉnh sửa bổ sung bệnh án"),
          Map.entry("RECORD_READ", "Xem hồ sơ bệnh án"),
          Map.entry("PATIENT_RECORDS_READ", "Xem lịch sử bệnh án bệnh nhân"),
          Map.entry("PRESCRIPTION_CREATED", "Tạo đơn thuốc nháp"),
          Map.entry("PRESCRIPTION_UPDATED", "Cập nhật đơn thuốc nháp"),
          Map.entry("PRESCRIPTION_ISSUED", "Phát hành đơn thuốc"),
          Map.entry("ENCOUNTER_PRESCRIPTIONS_READ", "Xem đơn thuốc của ca khám"),
          Map.entry("PATIENT_PRESCRIPTIONS_READ", "Xem lịch sử đơn thuốc bệnh nhân"),
          Map.entry("TELEHEALTH_CREATED", "Khởi tạo phòng khám từ xa"),
          Map.entry("TELEHEALTH_READ", "Xem trạng thái phòng khám từ xa"),
          Map.entry("TELEHEALTH_JOINED", "Tham gia phòng khám từ xa"),
          Map.entry("TELEHEALTH_STARTED", "Bắt đầu phiên khám từ xa"),
          Map.entry("TELEHEALTH_ENDED", "Kết thúc phiên khám từ xa"),
          Map.entry("TELEHEALTH_ACTIVE", "Kết nối lại phiên khám từ xa"),
          Map.entry("TELEHEALTH_RECONNECTING", "Tạm gián đoạn phiên khám từ xa"),
          Map.entry("TELEHEALTH_SIGNAL_SENT", "Gửi tín hiệu WebRTC"),
          Map.entry("TELEHEALTH_SIGNALS_READ", "Đọc tín hiệu WebRTC"),
          Map.entry("NOTIFICATION_SENT", "Gửi email thông báo thành công"),
          Map.entry("NOTIFICATION_SKIPPED", "Bỏ qua thông báo lỗi thời"),
          Map.entry("NOTIFICATION_RETRY", "Xếp lịch thử lại email thông báo"),
          Map.entry("NOTIFICATION_FAILED", "Gửi email thông báo thất bại"),
          Map.entry("COMMAND_REPLAYED", "Phát lại yêu cầu trùng khóa"),
          Map.entry("AUDIT_SEARCH", "Tra cứu nhật ký kiểm toán"),
          Map.entry("AUDIT_EXPORT", "Xuất biên bản kiểm toán CSV"),
          Map.entry("AUDIT_INTEGRITY_VERIFIED", "Kiểm chứng toàn vẹn chuỗi kiểm toán"),
          Map.entry("AUDIT_ARCHIVE_CREATED", "Niêm phong lô lưu trữ kiểm toán"));

  private static final Map<String, String> REASON_LABELS_VI =
      Map.of(
          "SECURITY_REVIEW", "Rà soát bảo mật",
          "POLICY_REVIEW", "Rà soát quy định",
          "PATIENT_REQUEST", "Yêu cầu bệnh nhân");

  private static final Map<String, String> RESULT_LABELS_VI =
      Map.of("SUCCESS", "Thành công", "DENIED", "Bị từ chối", "FAILURE", "Thất bại");

  private static final Pattern PHONE_LIKE = Pattern.compile("^[0-9]{7,15}$");
  private static final Pattern COMBINING_MARKS = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");

  public static boolean isKnownExactAction(String upperAction) {
    return ACTION_LABELS_VI.containsKey(upperAction)
        || upperAction.startsWith("PATIENT_ACCOUNT_LOCKED_")
        || upperAction.startsWith("PATIENT_ACCOUNT_UNLOCKED_");
  }

  public static String labelVi(String action) {
    return labelVi(action, null);
  }

  public static String labelVi(String action, String result) {
    if (action == null || action.isBlank()) return "";
    if ("TELEHEALTH_JOINED".equals(action) && "DENIED".equals(result)) {
      return "Từ chối tham gia phòng khám từ xa";
    }
    String exact = ACTION_LABELS_VI.get(action);
    if (exact != null) return exact;
    if (action.startsWith("PATIENT_ACCOUNT_LOCKED_")) {
      String reason = action.substring("PATIENT_ACCOUNT_LOCKED_".length());
      return "Khóa tài khoản bệnh nhân (" + REASON_LABELS_VI.getOrDefault(reason, reason) + ")";
    }
    if (action.startsWith("PATIENT_ACCOUNT_UNLOCKED_")) {
      String reason = action.substring("PATIENT_ACCOUNT_UNLOCKED_".length());
      return "Mở khóa tài khoản bệnh nhân (" + REASON_LABELS_VI.getOrDefault(reason, reason) + ")";
    }
    return action;
  }

  public static String normalizeSearch(String raw) {
    if (raw == null || raw.isBlank()) return "";
    String nfd = Normalizer.normalize(raw.strip(), Normalizer.Form.NFD);
    return COMBINING_MARKS
        .matcher(nfd)
        .replaceAll("")
        .replace('đ', 'd')
        .replace('Đ', 'd')
        .toLowerCase(Locale.ROOT);
  }

  /**
   * Resolves a Vietnamese or English action search keyword into matching canonical action codes.
   */
  public static List<String> matchActions(String rawQuery) {
    String needle = normalizeSearch(rawQuery);
    if (needle.isEmpty()) return List.of();
    List<String> matched = new ArrayList<>();
    for (var entry : ACTION_LABELS_VI.entrySet()) {
      String code = entry.getKey();
      String viNorm = normalizeSearch(entry.getValue());
      if (viNorm.contains(needle) || code.toLowerCase(Locale.ROOT).contains(needle)) {
        matched.add(code);
      } else if ("TELEHEALTH_JOINED".equals(code)
          && normalizeSearch("Từ chối tham gia phòng khám từ xa").contains(needle)) {
        matched.add(code);
      }
    }
    Collections.sort(matched);
    return matched;
  }

  public static String resultVi(String result) {
    return result == null ? "" : RESULT_LABELS_VI.getOrDefault(result, result);
  }

  public static boolean isSafeLabel(Object raw) {
    if (raw == null) return false;
    String s = raw.toString().strip();
    if (s.isEmpty() || s.length() > 64 || s.contains("@")) return false;
    String compact = s.replaceAll("[\\s.\\-+()]", "");
    return !PHONE_LIKE.matcher(compact).matches();
  }

  public static String sanitizeActorLabel(
      String actorType,
      Object storedLabel,
      Object accountUsername,
      Object accountStaff,
      String actorId) {
    if ("SYSTEM".equals(actorType)) {
      return isSafeLabel(storedLabel)
          ? storedLabel.toString().strip()
          : "clinic-background-worker";
    }
    if (isSafeLabel(storedLabel)) return storedLabel.toString().strip();
    if (isSafeLabel(accountUsername)) return accountUsername.toString().strip();
    if (actorId != null && actorId.length() >= 8) {
      boolean staff =
          Boolean.TRUE.equals(accountStaff) || "1".equals(String.valueOf(accountStaff));
      return (staff ? "staff-" : "user-") + actorId.substring(actorId.length() - 8);
    }
    return "user";
  }

  /** RFC-4180 CSV cell with strict spreadsheet formula injection neutralization. */
  public static String csvCell(Object raw) {
    String text = raw == null ? "" : raw.toString();
    String trimmed = text.stripLeading();
    boolean dangerous =
        (!text.isEmpty() && isFormulaPrefix(text.charAt(0)))
            || (!trimmed.isEmpty() && isFormulaPrefix(trimmed.charAt(0)));
    if (dangerous) text = "'" + text;
    if (text.indexOf(',') >= 0
        || text.indexOf('"') >= 0
        || text.indexOf('\n') >= 0
        || text.indexOf('\r') >= 0) {
      return "\"" + text.replace("\"", "\"\"") + "\"";
    }
    return text;
  }

  private static boolean isFormulaPrefix(char c) {
    return c == '=' || c == '+' || c == '-' || c == '@' || c == '\t' || c == '\r';
  }
}
