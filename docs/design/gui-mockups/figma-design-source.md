# Nguồn thiết kế Figma ClinicCare (Đồng bộ 1:1 FE & Đặc tả `SCR-01..SCR-23`)

Ngày đối chiếu: **22/11/2026** (đồng bộ nhánh `main` và trang đặc tả `https://clinic-spec.pages.dev`).

- **File Figma nguồn thiết kế & Prototype tương tác tập trung (1 trang duy nhất):** [Design_ClinicCare — `00 · NGUỒN THIẾT KẾ & PROTOTYPE · SCR-01..SCR-23 (22.11.2026)`](https://www.figma.com/design/6U3AYTHcZG2HMDvRcHuBSB/Design_ClinicCare?node-id=0-1)
- **Đặc tả chi tiết mã màn hình & hộp thoại:** [screen-specifications.md](screen-specifications.md)
- **File Figma lịch sử đợt trước (17/11/2026 — lưu tham khảo):** [Bản tham khảo 17/11/2026](https://www.figma.com/design/jT5Oqtd2kzmcT3jloN92Lk/Untitled?node-id=194-532)

---

## 1. Kiến trúc trang thiết kế tập trung & Prototype động

Toàn bộ hệ thống thiết kế (`Foundations`, `54 Variables`, `7 Text Styles`, `1 Effect Style`, `Components`), bảng **Ma trận truy vết `SCR-01..SCR-23` × 5 Vai trò × Route × FR/UC**, **23 màn hình chính (`SCR-01..SCR-23`)** (kèm 2 bước phụ đặt lịch `SCR-04A`, `SCR-04B`) và **6 hộp thoại tương tác (`DLG-01..DLG-06`)** được gom về **một trang Figma duy nhất** (`00 · NGUỒN THIẾT KẾ & PROTOTYPE · SCR-01..SCR-23 (22.11.2026)`) để:

1. **Chạy Prototype tương tác xuyên suốt tất cả 5 vai trò trên cùng một trang** (vượt qua giới hạn của Figma chỉ cho nối dây `NAVIGATE` / `OVERLAY` giữa các frame trong cùng một Page).
2. **Đầy đủ 6 điểm bắt đầu luồng (`Flow Starting Points`):**
   - `Flow 01 · Đăng nhập & Chọn vai trò (SCR-01)`
   - `Flow 02 · Cổng Bệnh nhân (SCR-03 → SCR-07)`
   - `Flow 03 · Cổng Bác sĩ (SCR-08 → SCR-13)`
   - `Flow 04 · Cổng Lễ tân & Vận hành (SCR-14 → SCR-17)`
   - `Flow 05 · Cổng Quản trị hệ thống (SCR-18 → SCR-22)`
   - `Flow 06 · Cổng Kiểm toán viên (SCR-23)`
3. **Tương tác động đến từng nút bấm & menu Sidebar (`ON_CLICK`):**
   - Bấm từng mục menu trên **Sidebar** chuyển trực tiếp sang màn hình `SCR-xx` tương ứng.
   - Bấm thông tin tài khoản ở góc dưới Sidebar mở `SCR-02 (/account)`; bấm nút đăng xuất mở overlay `DLG-06`.
   - Bấm các nút nghiệp vụ mở đúng luồng hoặc hộp thoại overlay (`DLG-01` OTP 6 số, `DLG-02` Đổi/Hủy lịch, `DLG-03` Báo chậm `FR-25`, `DLG-04` Vắng mặt `NO_SHOW` `FR-26`, `DLG-05` Khóa tài khoản `FR-27`, `DLG-06` Đăng xuất).

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
