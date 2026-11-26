// Quy tắc dịch chuỗi động (số đếm, mốc ngày giờ, prefix bác sĩ, kiểm toán, lịch làm việc).
export type PatternRule = readonly [RegExp, string | ((...args: string[]) => string)];

const PROFILE_FIELD_EN: Record<string, string> = {
  "số điện thoại": "phone number",
  "ngày sinh": "date of birth",
  "quê quán": "hometown",
  "địa chỉ thường trú": "permanent address",
  "giới tính": "gender",
  "địa chỉ": "address",
  "số BHYT": "insurance number",
  "liên hệ khẩn cấp": "emergency contact",
  "nhóm máu": "blood type",
  "dị ứng": "allergies",
};

function translateFieldList(listStr: string): string {
  return listStr
    .split(/,\s*/)
    .map((p) => PROFILE_FIELD_EN[p.trim()] ?? p.trim())
    .join(", ");
}

function translateViDateChunk(s: string): string {
  return s
    .replace(/\bThứ Hai\b/g, "Mon")
    .replace(/\bThứ Ba\b/g, "Tue")
    .replace(/\bThứ Tư\b/g, "Wed")
    .replace(/\bThứ Năm\b/g, "Thu")
    .replace(/\bThứ Sáu\b/g, "Fri")
    .replace(/\bThứ Bảy\b/g, "Sat")
    .replace(/\bChủ Nhật\b/g, "Sun")
    .replace(/\bChủ nhật\b/g, "Sun")
    .replace(/(\d{1,2})\s+tháng\s+(\d{1,2}),\s*(\d{4})/g, (_m, d: string, m: string, y: string) => {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${months[Number(m) - 1] ?? m} ${d}, ${y}`;
    })
    .replace(/·\s*Giờ Việt Nam$/, "· Vietnam time");
}

export const VI_TO_EN_PATTERNS: PatternRule[] = [
  // Danh sách trường hồ sơ còn thiếu (Account & Patient Dashboard)
  [
    /^(?:số điện thoại|ngày sinh|quê quán|địa chỉ thường trú|giới tính|địa chỉ|số BHYT|liên hệ khẩn cấp|nhóm máu|dị ứng)(?:,\s*(?:số điện thoại|ngày sinh|quê quán|địa chỉ thường trú|giới tính|địa chỉ|số BHYT|liên hệ khẩn cấp|nhóm máu|dị ứng))*$/,
    (full: string) => translateFieldList(full),
  ],
  [/^Còn thiếu:\s*(.+)$/, (_m: string, list: string) => `Missing: ${translateFieldList(list)}`],
  [/^Còn thiếu (\d+) mục$/, "Missing $1 field(s)"],
  [/^Còn thiếu\s+(.+)$/, (_m: string, list: string) => `Missing ${translateFieldList(list)}`],

  // Ngày & khoảng ngày tiếng Việt đầy đủ (Lịch bác sĩ, Tổng quan)
  [/^(?:Thứ (?:Hai|Ba|Tư|Năm|Sáu|Bảy)|Chủ [Nn]hật),\s*\d{1,2}\s+tháng\s+\d{1,2},\s*\d{4}.*$/, (full: string) => translateViDateChunk(full)],

  // Prefix / tên viết tắt
  [/^BS\.\s+(.+)$/, "Dr. $1"],
  [/^Bác sĩ\s+(.+)$/, "Dr. $1"],
  [/^Bệnh nhân\s+([A-Z0-9-]+)$/, "Patient $1"],
  [/^Tất cả\s*\((\d+)\)$/, "All ($1)"],
  [/^Đang theo dõi\s*\((\d+)\)$/, "Active ($1)"],
  [/^Đã hoàn tất\s*\((\d+)\)$/, "Completed ($1)"],
  [/^Đã hủy\s*\/\s*vắng\s*\((\d+)\)$/, "Cancelled / No-show ($1)"],
  [/^Hôm nay\s*\((\d+)\)$/, "Today ($1)"],
  [/^Sắp tới\s*\((\d+)\)$/, "Upcoming ($1)"],
  [/^Đã qua\s*\((\d+)\)$/, "Past ($1)"],
  [/^Lịch sử\s*\((\d+)\)$/, "History ($1)"],
  [/^Đang chờ\s*\((\d+)\)$/, "Waiting ($1)"],
  [/^Các lô đã niêm phong gần đây\s*\((\d+)\)$/, "Recently sealed batches ($1)"],
  [/^Ca làm việc\s*\((.+)\)$/, "Work shifts ($1)"],
  [/^Thời gian nghỉ\s*\((.+)\)$/, "Time off ($1)"],
  [/^Thời gian nghỉ trong ca\s*\((.+)\)$/, "In-shift time off ($1)"],
  [/^Thêm thời gian nghỉ trong ca\s*\((.+)\)$/, "Add in-shift time off ($1)"],
  [/^Khớp ranh giới\s*\((.+)\)$/, "Boundary-aligned ($1)"],

  // Account & Profile
  [/^Đã sao chép (.+)\.$/, "Copied $1."],
  [/^Gửi lại sau (\d+)s$/, "Resend in $1s"],
  [/^Có thể chỉnh sửa lại từ (.+)$/, "Editable again from $1"],
  [/^Các mục đã có thông tin tạm khóa đến (.+)\. Bạn chỉ có thể bổ sung các mục đang trống\.$/, "Existing fields are locked until $1. You can only fill in blank fields."],

  // Clinic Hours
  [
    /^Mở (\d+)\/7 ngày · Tổng (.+)\/tuần$/,
    (_m: string, days: string, dur: string) => `Open ${days}/7 days · Total ${dur.replace(/\s*giờ/g, "h").replace(/\s*phút/g, "m")}/week`,
  ],
  [/^Mở cửa (.+)$/, "Open $1"],
  [/^Giờ mở cửa (.+)$/, "Opening time $1"],
  [/^Giờ đóng cửa (.+)$/, "Closing time $1"],
  [/^Xóa (.+)$/, "Delete $1"],
  [/^(\d+) giờ (\d+) phút$/, "$1h $2m"],
  [/^(\d+) giờ$/, "$1h"],
  [/^(\d+) phút$/, "$1 min"],

  // Schedule & Slot rules
  [/^Phòng khám nghỉ lễ \((.+)\)\.$/, "Clinic holiday ($1)."],
  [/^Giờ phòng khám từ (.+) đến (.+) \(giờ Việt Nam\)\.$/, "Clinic hours: $1 to $2 (Vietnam time)."],
  [/^Thời lượng ca phải chia hết cho (\d+) phút\/lượt\. Hãy đổi giờ hoặc độ dài lượt khám\.$/, "Shift duration must be divisible by $1 min/slot. Adjust shift times or slot length."],
  [/^Dòng thời gian trong ngày (.+) đến (.+)$/, "Daily timeline $1 to $2"],
  [/^Nghỉ (\d{2}:\d{2})–(\d{2}:\d{2})(.*)$/, "Break $1–$2$3"],
  [/^Hiện tại (.+)$/, "Now $1"],
  [/^(.+) · Giờ Việt Nam$/, "$1 · Vietnam time"],
  [/^Xem chi tiết ngày (.+)$/, "View details for $1"],
  [/^Nghỉ lễ:\s*(.+)$/, "Holiday: $1"],
  [/^Xem lịch nghỉ (.+) (.+)–(.+)$/, "View break $1 $2–$3"],
  [/^Chi tiết (.+)$/, "Details: $1"],
  [/^(\d{2}:\d{2})–(\d{2}:\d{2}) · (\d+) phút · (\d+) lượt khám dự kiến$/, "$1–$2 · $3 min · $4 est. slots"],
  [/^(\d{2}:\d{2})–(\d{2}:\d{2}) · (\d+) phút(.*)$/, "$1–$2 · $3 min$4"],
  [/^· Khóa (\d+) lượt khám trong (\d+) ca$/, "· Blocks $1 slot(s) in $2 shift(s)"],
  [/^1 lượt \((\d+)p\)$/, "1 slot ($1m)"],
  [/^Nghỉ (\d+) phút · Khóa (\d+)\/(\d+) lượt khám \((\d+) phút\)$/, "Break $1 min · Blocks $2/$3 slot(s) ($4 min)"],
  [/^(\d+) phút\/lượt · Chi tiết$/, "$1 min/slot · Details"],
  [/^(\d+) phút\/lượt · Bấm để xóa ca hoặc thêm lịch nghỉ$/, "$1 min/slot · Click to delete shift or add time off"],

  // Patient Appointments, Booking, Dashboard, Records
  [/^(.+) - Khung giờ mới$/, "$1 - New time slot"],
  [/^Trùng lịch với (.+) lúc (.+)$/, "Conflicts with $1 at $2"],
  [/^Sắp diễn ra trong (\d+) phút$/, "Starts in $1 min"],
  [/^Còn (\d+) giờ (\d+) phút$/, "$1h $2m left"],
  [/^Còn (\d+) giờ$/, "$1h left"],
  [/^Còn (\d+) ngày$/, "$1 day(s) left"],
  [/^(\d+) lần khám đã hoàn tất — xem bệnh án & đơn thuốc$/, "$1 completed encounter(s) — view records & Rx"],
  [/^(\d+) lần khám đã hoàn tất$/, "$1 completed encounter(s)"],
  [/^(\d+)\/(\d+) lần khám phù hợp$/, "$1/$2 matching encounter(s)"],
  [/^(\d+) lần khám$/, "$1 encounter(s)"],
  [/^Tháng (\d+)\/(\d+)$/, "Month $1/$2"],
  [
    /^Lần khám ngày (.+)$/,
    (_m: string, rest: string) =>
      `Encounter on ${rest.replace("Khám trực tiếp", "In-person").replace("Khám từ xa", "Telehealth")}`,
  ],
  [/^Bản mới nhất \(v(\d+)\)$/, "Latest (v$1)"],
  [/^Bản gốc \(v(\d+)\)$/, "Original (v$1)"],
  [/^Đã bổ sung \(v(\d+)\)$/, "Amended (v$1)"],
  [/^Bạn đang xem phiên bản cũ hơn \(v(\d+)$/, "You are viewing an older version (v$1"],
  [/^Phiên bản v(\d+)$/, "Version v$1"],
  [/^Bệnh án v(\d+)$/, "Record v$1"],
  [/^Phát hành lúc (.+)$/, "Issued at $1"],
  [/^Bước (\d+) \/ (\d+)$/, "Step $1 / $2"],

  // Doctor & Staff Dashboard / Queue / Telehealth
  [/^Xin chào, (.+)$/, "Hello, $1"],
  [/^Đã gọi số #(\d+)\.$/, "Called ticket #$1."],
  [/^(\d+) trực tiếp · (\d+) từ xa$/, "$1 in-person · $2 remote"],
  [/^(\d+) đã hoàn tất$/, "$1 completed"],
  [/^(\d+) ca từ ngày trước$/, "$1 prior-day encounter(s)"],
  [/^(\d+) chờ check-in$/, "$1 awaiting check-in"],
  [/^(\d+) chờ gọi · (\d+) đang khám$/, "$1 waiting · $2 in progress"],
  [/^(\d+) vắng · (\d+) đã hủy$/, "$1 no-show · $2 cancelled"],
  [/^(\d+) bác sĩ đang nhận lịch · Lịch hôm nay \(trừ đã hủy\)$/, "$1 active doctor(s) · Today's schedule (excl. cancelled)"],
  [/^(\d+) lịch$/, "$1 appt(s)"],
  [/^Phòng chờ mở lúc (.+)\.$/, "Waiting room opens at $1."],
  [/^Phòng chờ mở từ (.+) đến (.+)\.$/, "Waiting room open from $1 to $2."],
  [/^Chỉ bắt đầu trong khoảng (.+)–(.+)\.$/, "Can only start between $1–$2."],
  [/^Khung hình đã mã hóa: (.+) · Gói video đã nhận: (.+) · Khung hình đã giải mã: (.+) · Video hiển thị: (.+)px · RTT: (.+)$/, "Encrypted frames: $1 · Video packets: $2 · Decoded frames: $3 · Rendered video: $4px · RTT: $5"],

  // Audit
  [/^Khóa tài khoản bệnh nhân \((.+)\)$/, "Lock patient account ($1)"],
  [/^Mở khóa tài khoản bệnh nhân \((.+)\)$/, "Unlock patient account ($1)"],
  [/^Đang truy vết tác nhân (.+)\.$/, "Tracing actor $1."],
  [/^Đang truy vết đối tượng (.+)\.$/, "Tracing resource $1."],
  [/^Đang truy vết Correlation (.+)\.$/, "Tracing correlation $1."],
  [/^Đã xuất (\d+) dòng \(đạt giới hạn an toàn (\d+) dòng\)\. SHA-256: (.+)…$/, "Exported $1 rows (safety cap $2 rows). SHA-256: $3…"],
  [/^Đã xuất (\d+) sự kiện kiểm toán \(SHA-256: (.+)…\)\.$/, "Exported $1 audit events (SHA-256: $2…)."],
  [/^Đã xác minh (\d+)\/(\d+) sự kiện đầu chuỗi \(chưa tới đỉnh #(\d+)\)\.$/, "Verified $1/$2 leading events (chain head #$3 not reached)."],
  [/^Chuỗi kiểm toán nguyên vẹn: đã xác minh (\d+) sự kiện nối chuỗi\.$/, "Audit chain intact: verified $1 chained events."],
  [/^Phát hiện bất thường chuỗi băm tại #(\d+): (.+)$/, "Hash chain anomaly detected at #$1: $2"],
  [/^Tác nhân:\s*(.+)$/, "Actor: $1"],
  [/^Loại:\s*(.+)$/, "Type: $1"],
  [/^Đối tượng:\s*(.+)$/, "Resource: $1"],
  [/^Nhóm:\s*(.+)$/, "Category: $1"],
  [/^Hành động:\s*(.+)$/, "Action: $1"],
  [/^Kết quả:\s*(.+)$/, "Result: $1"],
  [/^(\d+) đã nối chuỗi băm$/, "$1 hash-chained"],
  [/^Chuỗi băm #(\d+)$/, "Hash chain #$1"],
  [/^Xem chi tiết sự kiện (.+)$/, "View event details $1"],
  [/^Bấm để lọc tác nhân Hệ thống \((.+)\)$/, "Click to filter System actor ($1)"],
  [/^Bấm để truy vết tác nhân · UUID: (.+)$/, "Click to trace actor · UUID: $1"],
  [/^Truy vết tác nhân (.+)$/, "Trace actor $1"],
  [/^Bấm để truy vết đối tượng · Mã đầy đủ: (.+)$/, "Click to trace resource · Full ID: $1"],
  [/^Truy vết đối tượng (.+)$/, "Trace resource $1"],
  [/^Bấm để truy vết Correlation ID đầy đủ: (.+)$/, "Click to trace full Correlation ID: $1"],
  [/^Truy vết Correlation ID (.+)$/, "Trace Correlation ID $1"],
  [/^· Tổng (\d+) sự kiện$/, "· Total $1 events"],
  [/^Đã niêm phong lô (\d+) sự kiện \(batch_hash: (.+)…\)\.$/, "Sealed archive batch of $1 events (batch_hash: $2…)."],
  [/^Sao chép mã băm lô (.+)$/, "Copy batch hash $1"],
  [/^Backend chưa triển khai API cho “(.+)”\. Giao diện đã sẵn sàng và sẽ hoạt động khi API được bổ sung\.$/, "Backend API for “$1” is not enabled yet. UI is ready once backend endpoint is deployed."],
];
