# Nguồn thiết kế Figma ClinicCare (Đồng bộ 1:1 FE & Đặc tả `SCR-01..SCR-23`)

Ngày đối chiếu: **22/11/2026** (đồng bộ nhánh `main` và trang đặc tả `https://clinic-spec.pages.dev`).

- **File Figma nguồn thiết kế & Prototype tương tác tập trung (1 trang duy nhất):** [Design_ClinicCare — `00 · NGUỒN THIẾT KẾ & PROTOTYPE · SCR-01..SCR-23 (22.11.2026)`](https://www.figma.com/design/6U3AYTHcZG2HMDvRcHuBSB/Design_ClinicCare?node-id=0-1)
- **Đặc tả chi tiết mã màn hình & hộp thoại:** [screen-specifications.md](screen-specifications.md)
- **File Figma lịch sử đợt trước (17/11/2026 — lưu tham khảo):** [Bản tham khảo 17/11/2026](https://www.figma.com/design/jT5Oqtd2kzmcT3jloN92Lk/Untitled?node-id=194-532)

---

## 1. Kiến trúc trang thiết kế tập trung, Quy tắc "Màn hình thật 100%" & Prototype động

Toàn bộ hệ thống thiết kế (`Foundations`, `54 Variables`, `7 Text Styles`, `1 Effect Style`, `Components`), bảng **Ma trận truy vết `SCR-01..SCR-23` × 5 Vai trò × Route × FR/UC**, **23 màn hình chính (`SCR-01..SCR-23`)** (kèm 2 bước phụ đặt lịch `SCR-04A`, `SCR-04B`) và **6 hộp thoại tương tác (`DLG-01..DLG-06`)** được gom về **một trang Figma duy nhất** (`00 · NGUỒN THIẾT KẾ & PROTOTYPE · SCR-01..SCR-23 (22.11.2026)`) theo đúng các nguyên tắc đối chiếu trực tiếp từ giao diện chạy thật (`https://cliniccare-demo.duckdns.org`) và mã nguồn `frontend/src/**`:

1. **Thiết kế chuẩn màn hình thật 100% — Không chèn mã màn hình vào trong giao diện (`Zero In-UI Codes`):**
   - Bên trong toàn bộ 31 khung giao diện (`SCR-01..SCR-23`, `SCR-04A`, `SCR-04B`, `DLG-01..DLG-06`), **tuyệt đối không hiển thị mã `SCR-xx` / `DLG-xx`, nhãn chú thích điều hướng `(→ SCR-xx)` hay nút giả lập `Đổi vai trò (SCR-01)`** trên Topbar, Sidebar, tiêu đề trang hay nhãn nút bấm.
   - Toàn bộ mã màn hình (`SCR-xx`, `DLG-xx`), route React, vai trò, mã `FR/UC/BR` và ghi chú luồng prototype được đặt **ở bên ngoài khung giao diện** (trên thanh `Note Header` nằm tách biệt phía trên mỗi frame và trong bảng `Ma trận truy vết` ở đầu trang).
2. **Đồng bộ chính xác từng thành phần DOM khi bấm thử trên Frontend thật:**
   - **Khung `AppShell.tsx` (`SCR-02..SCR-23`):**
     - **Sidebar (`248px`, nền `#10233F`):** Đầu Sidebar có logo `ClinicCare` + nút thu gọn `PanelLeftClose` (`30×30`); danh mục điều hướng chia đúng section theo `nav.ts` (`CỔNG BỆNH NHÂN`, `CỔNG BÁC SĨ`, `VẬN HÀNH`, `QUẢN TRỊ HỆ THỐNG`, `HỆ THỐNG`); chân Sidebar (`.profile`) có avatar viết tắt (`34×34`), họ tên người dùng (bấm mở `/account`) và nút icon `Đăng xuất` (`LogOut`, bấm mở hộp thoại `DLG-06`).
     - **Topbar (`54px`, nền `#FFFFFF`):** Bên trái chỉ hiển thị tiêu đề `<h1>` do `PageHead` portal vào `#top-page-title`; bên phải (`.topright`) chỉ gồm đồng hồ thời gian thực `.clock` (`HH:mm:ss DD/MM/YYYY`, chấm xanh `#18A77F`) và 1 `Pill` vai trò (`Bệnh nhân`, `Bác sĩ`, `Lễ tân`, `Quản trị viên`, `Kiểm toán viên` kèm icon `ShieldCheck`).
     - **Vùng `.head` trong `.content`:** Chỉ hiển thị khi `PageHead` có `eyebrow`, `text` (`sub`) hoặc `actions` (như `SCR-03`, `SCR-04`, `SCR-05`, `SCR-06`, `SCR-07`, `SCR-11`, `SCR-23`); các trang chỉ truyền `title` vào `PageHead` thì `title` nằm trên Topbar và nội dung bắt đầu ngay từ khối `.metrics` hoặc `.panel`.
   - **Màn hình đăng nhập Keycloak (`SCR-01` — `infra/keycloak/themes/cliniccare/login/login.ftl`):** Thiết kế 2 cột đúng giao diện thật gồm cột trái `.visual` nền gradient `#0D2748 → #174371` (`CHĂM SÓC SỨC KHỎE CHỦ ĐỘNG`, `Sức khỏe của bạn, luôn trong tầm tay.`) và cột phải `.form-panel` (`CHÀO MỪNG TRỞ LẠI`, `Đăng nhập tài khoản`, ô `Tài khoản hoặc email`, ô `Mật khẩu`, `☑ Ghi nhớ đăng nhập`, `Quên mật khẩu?`, nút `Đăng nhập →`, phân cách `hoặc`, nút `Tiếp tục với Google`, liên kết `Tạo tài khoản`).
3. **Chạy Prototype tương tác xuyên suốt tất cả 5 vai trò trên cùng một trang** với **6 điểm bắt đầu luồng (`Flow Starting Points`):**
   - `Flow 01 · Đăng nhập & Chọn vai trò (SCR-01)`
   - `Flow 02 · Cổng Bệnh nhân (SCR-03 → SCR-07)`
   - `Flow 03 · Cổng Bác sĩ (SCR-08 → SCR-13)`
   - `Flow 04 · Cổng Lễ tân & Vận hành (SCR-14 → SCR-17)`
   - `Flow 05 · Cổng Quản trị hệ thống (SCR-18 → SCR-22)`
   - `Flow 06 · Cổng Kiểm toán viên (SCR-23)`
4. **Tương tác động đến từng nút bấm, tab, popup & menu Sidebar (`ON_CLICK`) đúng 100% khi bấm thử trên FE:**
   - Bấm từng mục menu trên **Sidebar** chuyển trực tiếp sang màn hình tương ứng.
   - Bấm thông tin tài khoản ở góc dưới Sidebar mở `/account` (`SCR-02`, tự động hiển thị thêm 3 dòng `Mã bác sĩ`, `Chuyên khoa`, `Nhận lịch khám` khi đăng nhập vai trò `DOCTOR`); bấm nút icon đăng xuất mở overlay `DLG-06`.
   - Bấm các nút nghiệp vụ mở đúng luồng trạng thái hoặc hộp thoại/modal tương tác thực tế trên FE:
     - `DLG-01` (`SCR-02`): Khối `Cập nhật thông tin liên hệ` & xác thực OTP 6 chữ số khi đổi email.
     - `SCR-04` (`SCR-04A → SCR-04 → SCR-04B`): Chuyển qua 3 bước đặt lịch và trạng thái `Panel.success` (`Đặt lịch thành công` kèm nút `Về tổng quan` / `Xem lịch của tôi`).
     - `DLG-02` (`SCR-05`): Modal `Đổi lịch khám` (chọn `Ngày khám mới` & `.slots`) và `Hủy lịch khám?` (`Lý do hủy *`).
     - `SCR-09` & `SCR-20`: Chuyển đổi lịch `Tuần` ↔ `Tháng`; bấm ô ngày mở modal `Chi tiết [Thứ ..., DD tháng MM, YYYY]` (kèm thanh `DayTimeline` `08:00–17:00` và form `Đăng ký ca làm việc` với preset `Ca sáng 08:00–12:00` / `Ca chiều 13:00–17:00`); bấm thẻ ca mở modal `Chi tiết ca làm việc` (kèm form `Thêm thời gian nghỉ trong ca` và hộp thoại `Xóa ca làm việc?`).
     - `SCR-12`: Trạng thái `Chọn ca khám` (khi mở `/doctor/consultation` từ Sidebar chưa chọn mã lịch), 3 tab `Bệnh án` / `Đơn thuốc` / `Lịch sử (n)`, form `Chỉnh sửa bổ sung` (`Lý do chỉnh sửa *`) khi bệnh án đã `FINAL`, và hộp thoại `Hoàn tất ca khám?`.
     - `SCR-13`: Hộp thoại `Kết thúc phiên khám từ xa?` khi bác sĩ bấm nút đỏ `Kết thúc phiên`.
     - `DLG-03` (`SCR-15`): Modal `Báo chậm giờ hẹn` (`Giờ bắt đầu dự kiến (không bắt buộc)`).
     - `DLG-04` (`SCR-10`, `SCR-15`): Modal `Ghi nhận vắng mặt?` (`Lý do vắng mặt` + checkbox `Gửi email mời bệnh nhân đặt lịch lại`).
     - `SCR-16`: Hộp thoại `Bỏ qua lượt này?` (`Lý do *`, nút `Đưa về cuối hàng`) khi bấm `Bỏ qua lượt` trên phiếu `Đã gọi`.
     - `SCR-17`: Modal `Chi tiết thông báo` (`Mã job`, `Sự kiện`, `Lịch hẹn`, `Trạng thái gửi`, `Số lần thử`, `Đến hạn`, `Lỗi gần nhất`, `Giờ khám`, `Bác sĩ`, `Hình thức`, `Trạng thái lịch`) khi bấm `Chi tiết`.
     - `SCR-18`: Modal `Thêm chuyên khoa` (khi bấm nút `+`) và `Cập nhật chuyên khoa` (kèm công tắc `.clinic-switch` `Đang hoạt động` / `Ngừng hoạt động` khi bấm `Sửa`).
     - `SCR-19`: Modal `Thêm nhân sự` (`Username *`, `Email *`, `Họ tên *`, `Mật khẩu tạm thời *`, `Vai trò nhân sự`, `Chuyên khoa`) khi bấm `+` và `Cập nhật nhân sự` (`Họ tên *`, `Trạng thái tài khoản`, `Vai trò nhân sự`, công tắc `.clinic-switch` `Đang nhận lịch mới`, `Chuyên khoa`) khi bấm `Sửa`.
     - `SCR-21`: Trạng thái `Chưa lưu` + nút `Bỏ thay đổi` khi chỉnh giờ mở/đóng cửa; biểu mẫu mở rộng `Thiết lập ngày lễ` (`Từ ngày`, `Đến ngày`, `Tên dịp lễ`, chế độ `Nghỉ cả ngày` / `Giờ đặc biệt` kèm giờ mở/đóng).
     - `DLG-05` (`SCR-22`): Modal `Khóa tài khoản` / `Mở khóa tài khoản` (chọn `Lý do`: `Rà soát bảo mật` / `Rà soát theo quy định` / `Yêu cầu của bệnh nhân`).
     - `SCR-23`: Modal `Chi tiết sự kiện kiểm toán` (`Thời gian`, `Hành động`, `Kết quả`, `Tác nhân`, `Đối tượng`, `Correlation ID`) khi bấm `Chi tiết`.
     - `DLG-06` (`SCR-02..SCR-23`): Modal `Xác nhận đăng xuất` (kèm cảnh báo `Notice warn` khi đang ở `/patient/telehealth` hoặc `/doctor/telehealth`).

---

## 2. Ánh xạ 1:1 giữa Mã màn hình (`SCR` / `DLG`) ↔ Route ↔ Vai trò ↔ Mã nguồn FE

| Mã | Route / Phạm vi | Vai trò | File mã nguồn thực thi (`frontend/src/...`) | FR / UC ánh xạ |
|---|---|---|---|---|
| **`SCR-01`** | `/login`, `/callback` | OIDC / Mọi người dùng | `auth/LoginPage.tsx`, `auth/Guard.tsx` | `FR-01`, `FR-02` · `UC-01`, `UC-02` |
| **`SCR-02`** | `/account` | Đã đăng nhập (5 vai trò) | `features/account/Account.tsx` | `FR-01` · `UC-01` |
| **`SCR-03`** | `/patient` | `PATIENT` | `features/patient/Dashboard.tsx` | `FR-11`, `FR-12`, `FR-22` · `UC-11`, `UC-12`, `UC-22` |
| **`SCR-04`** | `/patient/booking` (`SCR-04A`, `SCR-04`, `SCR-04B`) | `PATIENT` | `features/patient/Booking.tsx` | `FR-07`, `FR-08` · `UC-07`, `UC-08` |
| **`SCR-05`** | `/patient/appointments` | `PATIENT` | `features/patient/Appointments.tsx` | `FR-09`, `FR-10`, `FR-11`, `FR-15` · `UC-09..11`, `UC-15` |
| **`SCR-06`** | `/patient/records` | `PATIENT` | `features/patient/Records.tsx`, `features/shared/RecordView.tsx` | `FR-12`, `FR-17` · `UC-12`, `UC-17` |
| **`SCR-07`** | `/patient/telehealth` | `PATIENT` | `features/patient/Telehealth.tsx`, `features/shared/TelehealthRoom.tsx` | `FR-22`, `FR-23`, `FR-24` · `UC-22..24` |
| **`SCR-08`** | `/doctor` | `DOCTOR` | `features/doctor/Home.tsx` | `FR-11`, `FR-20`, `FR-22` · `UC-11`, `UC-20`, `UC-22` |
| **`SCR-09`** | `/doctor/schedule` | `DOCTOR` | `features/doctor/Schedule.tsx` | `FR-05`, `FR-06`, `FR-07` · `UC-05..07` |
| **`SCR-10`** | `/doctor/appointments` | `DOCTOR` | `features/doctor/Appointments.tsx` | `FR-11`, `FR-26` · `UC-11`, `UC-26` |
| **`SCR-11`** | `/doctor/queue` | `DOCTOR` | `features/doctor/Queue.tsx` | `FR-20`, `FR-21` · `UC-20`, `UC-21` |
| **`SCR-12`** | `/doctor/consultation/:appointmentId?` | `DOCTOR` phụ trách | `features/doctor/Consultation.tsx`, `features/shared/RecordView.tsx` | `FR-11..14`, `FR-17` · `UC-11..14`, `UC-17` |
| **`SCR-13`** | `/doctor/telehealth/:appointmentId?` | `DOCTOR` phụ trách | `features/doctor/Telehealth.tsx`, `features/shared/TelehealthRoom.tsx` | `FR-22..24`, `FR-13` · `UC-22..24`, `UC-13` |
| **`SCR-14`** | `/staff` | `RECEPTIONIST`, `ADMINISTRATOR` | `features/staff/Dashboard.tsx` | `FR-11`, `FR-16`, `FR-19`, `FR-20` · `UC-11`, `UC-16`, `UC-19`, `UC-20` |
| **`SCR-15`** | `/staff/reception` | `RECEPTIONIST` | `features/staff/Reception.tsx` | `FR-19`, `FR-25`, `FR-26` · `UC-19`, `UC-25`, `UC-26` |
| **`SCR-16`** | `/staff/queue` | `RECEPTIONIST` | `features/staff/Queue.tsx` | `FR-20`, `FR-21` · `UC-20`, `UC-21` |
| **`SCR-17`** | `/staff/notifications` | `RECEPTIONIST`, `ADMINISTRATOR` | `features/staff/Notifications.tsx` | `FR-15`, `FR-16`, `FR-25`, `FR-26` · `UC-15`, `UC-16`, `UC-25`, `UC-26` |
| **`SCR-18`** | `/admin/specialties` | `ADMINISTRATOR` | `features/admin/Specialties.tsx` | `FR-03` · `UC-03` |
| **`SCR-19`** | `/admin/permissions` (`/admin/doctors` redirect) | `ADMINISTRATOR` | `features/admin/Permissions.tsx` | `FR-02`, `FR-03`, `FR-04` · `UC-02..04` |
| **`SCR-20`** | `/admin/schedules` | `ADMINISTRATOR` | `features/admin/Schedules.tsx` | `FR-05`, `FR-06` · `UC-05`, `UC-06` |
| **`SCR-21`** | `/admin/clinic-hours` | `ADMINISTRATOR` | `features/admin/ClinicHours.tsx` | `FR-05` · `UC-05` |
| **`SCR-22`** | `/admin/patient-accounts` | `ADMINISTRATOR` | `features/admin/PatientAccounts.tsx` | `FR-27`, `FR-17` · `UC-27`, `UC-17` |
| **`SCR-23`** | `/audit` | `AUDITOR` | `features/staff/Audit.tsx` | `FR-17`, `FR-18` · `UC-17`, `UC-18` |
| **`DLG-01`** | Overlay / State đổi email + OTP 6 số | Đã đăng nhập | `features/account/Account.tsx` | `FR-01`, `NFR-15` · `UC-01` |
| **`DLG-02`** | Modal Đổi lịch / Hủy lịch ($\ge 2\text{h}$) | `PATIENT` | `features/patient/Appointments.tsx` | `FR-09`, `FR-10` · `UC-09`, `UC-10` |
| **`DLG-03`** | Modal Báo chậm giờ hẹn (`DELAY_NOTICE`) | `RECEPTIONIST` | `features/staff/Reception.tsx` | `FR-25` · `UC-25` |
| **`DLG-04`** | Modal Ghi nhận vắng mặt (`NO_SHOW`) | `RECEPTIONIST`, `DOCTOR` | `features/shared/NoShowDialog.tsx` | `FR-26` · `UC-26` |
| **`DLG-05`** | Modal Khóa / Mở khóa tài khoản BN | `ADMINISTRATOR` | `features/admin/PatientAccounts.tsx` | `FR-27` · `UC-27` |
| **`DLG-06`** | Modal Xác nhận đăng xuất | Đã đăng nhập | `layouts/AppShell.tsx` | `FR-01`, `FR-24` · `UC-01`, `UC-24` |

---

## 3. Hệ thống Design Tokens & Components đồng bộ `app.css`

- **54 Figma Variables** chia làm 3 bộ sưu tập (`Primitives`, `Color`, `Spacing & Radius`) khai báo đầy đủ `scopes` và `WEB code syntax` (`var(--navy)`, `var(--blue)`, `var(--green)`, `var(--amber)`, `var(--red)`, `var(--purple)`, `var(--bg)`, `var(--radius)`, `var(--radius-card)`...).
- **7 Text Styles** chuẩn font `Inter` (`H1 22/30 Bold`, `H2 17/24 Semi Bold`, `H3 15/22 Semi Bold`, `Body/Default 14/21`, `Body/Medium 14/20`, `Body/Small 12/18`, `Label/Caps 11/16 Extra Bold`).
- **4 Component Sets / Components tái sử dụng:** `Button` (7 biến thể `Primary / Secondary / Danger / Soft × MD / SM`), `Pill` (6 biến thể trạng thái luôn có nhãn chữ), `Notice` (4 biến thể `Info / OK / Warn / Error` tự co giãn chiều cao), `StatCard` (thẻ KPI).
