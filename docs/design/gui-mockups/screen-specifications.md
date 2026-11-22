# Đặc tả màn hình (`SCR-01..SCR-23`), hộp thoại (`DLG-01..DLG-06`) và wireframe

Tài liệu chuẩn hóa hệ thống mã định danh màn hình (**`SCR-01` → `SCR-23`**) và hộp thoại/trạng thái tương tác (**`DLG-01` → `DLG-06`**) đồng bộ 1:1 giữa mã nguồn Frontend (`frontend/src/App.tsx`, `frontend/src/layouts/nav.ts`), đặc tả yêu cầu (`FR-01..FR-27`, `UC-01..UC-27`, `BR-01..BR-19`) và trang nguồn thiết kế tương tác tập trung trên Figma ([Design_ClinicCare](https://www.figma.com/design/6U3AYTHcZG2HMDvRcHuBSB/Design_ClinicCare?node-id=0-1)).

## 1. Ma trận phân quyền truy cập 23 màn hình (`SCR-01..SCR-23`)

Ký hiệu: `●` Toàn quyền theo vai trò · `○` Theo quyền sở hữu / ca phân công · `—` Không có quyền truy cập (`Guard.tsx` / Backend trả `403` hoặc `404` kèm audit `DENIED`).

| Mã màn | Route React (`App.tsx`) | Tên màn hình chuẩn | BN (`PATIENT`) | BS (`DOCTOR`) | LT (`RECEPTIONIST`) | QT (`ADMINISTRATOR`) | KT (`AUDITOR`) | Phân hệ · FR · UC |
|---|---|---|---:|---:|---:|---:|---:|---|
| **`SCR-01`** | `/login`, `/callback` | Đăng nhập OIDC PKCE, Google OAuth2 & Quên mật khẩu | ● | ● | ● | ● | ● | `M01` · `FR-01`, `FR-02` · `UC-01`, `UC-02` |
| **`SCR-02`** | `/account` | Tài khoản của tôi & Xác thực OTP 6 số đổi email | ● | ● | ● | ● | ● | `M01` · `FR-01` · `UC-01` |
| **`SCR-03`** | `/patient` | Tổng quan Cổng Bệnh nhân | ● | — | — | — | — | `M04`, `M05`, `M09` · `FR-11`, `FR-12`, `FR-22` · `UC-11`, `UC-12`, `UC-22` |
| **`SCR-04`** | `/patient/booking` | Đặt lịch khám 3 bước (Chuyên khoa/BS → Khung giờ → Xác nhận) | ● | — | — | — | — | `M03`, `M04` · `FR-07`, `FR-08` · `UC-07`, `UC-08` |
| **`SCR-05`** | `/patient/appointments` | Lịch khám của tôi (Theo dõi, Đổi lịch & Hủy lịch $\ge 2\text{h}$) | ● | — | — | — | — | `M04`, `M06` · `FR-09`, `FR-10`, `FR-11`, `FR-15` · `UC-09`, `UC-10`, `UC-11`, `UC-15` |
| **`SCR-06`** | `/patient/records` | Hồ sơ bệnh án (`FINAL`) & Đơn thuốc (`ISSUED`) của tôi | ● | — | — | — | — | `M05`, `M07` · `FR-12`, `FR-17` · `UC-12`, `UC-17` |
| **`SCR-07`** | `/patient/telehealth` | Phòng khám từ xa WebRTC (Bệnh nhân · Kiểm tra thiết bị & Gọi P2P) | ● | — | — | — | — | `M09` · `FR-22`, `FR-23`, `FR-24` · `UC-22`, `UC-23`, `UC-24` |
| **`SCR-08`** | `/doctor` | Tổng quan hôm nay (Cổng Bác sĩ) | — | ● | — | — | — | `M04`, `M08`, `M09` · `FR-11`, `FR-20`, `FR-22` · `UC-11`, `UC-20`, `UC-22` |
| **`SCR-09`** | `/doctor/schedule` | Lịch làm việc (Ca 20p trong $H_{\text{eff}}(D)$) & Đăng ký lịch nghỉ | — | ● | — | — | — | `M03` · `FR-05`, `FR-06`, `FR-07` · `UC-05`, `UC-06`, `UC-07` |
| **`SCR-10`** | `/doctor/appointments` | Lịch hẹn của tôi (Bác sĩ · Tiếp nhận & Ghi nhận `NO_SHOW` từ xa) | — | ○ | — | — | — | `M04`, `M06` · `FR-11`, `FR-26` · `UC-11`, `UC-26` |
| **`SCR-11`** | `/doctor/queue` | Hàng đợi khám FIFO (Bác sĩ · Gọi lượt `204` / Bỏ lượt `MAX+1`) | — | ○ | — | — | — | `M08` · `FR-20`, `FR-21` · `UC-20`, `UC-21` |
| **`SCR-12`** | `/doctor/consultation/:appointmentId?` | Khám bệnh, Chốt/Bổ sung bệnh án (`DRAFT→FINAL`) & Kê đơn (`ISSUED`) | — | ○ | — | — | — | `M04`, `M05`, `M07` · `FR-11..14`, `FR-17` · `UC-11..14`, `UC-17` |
| **`SCR-13`** | `/doctor/telehealth/:appointmentId?` | Phòng khám từ xa WebRTC (Bác sĩ · `DoctorCallLayout` giữ cuộc gọi) | — | ○ | — | — | — | `M09`, `M05` · `FR-22..24`, `FR-13` · `UC-22..24`, `UC-13` |
| **`SCR-14`** | `/staff` | Dashboard Vận hành (Lễ tân & Quản trị) | — | — | ● | ● | — | `M04`, `M06`, `M08` · `FR-11`, `FR-16`, `FR-19`, `FR-20` · `UC-11`, `UC-16`, `UC-19`, `UC-20` |
| **`SCR-15`** | `/staff/reception` | Tiếp đón / Check-in `[-15p,+15p)`, Báo chậm (`DELAY_NOTICE`) & `NO_SHOW` | — | — | ● | — | — | `M08`, `M06`, `M04` · `FR-19`, `FR-25`, `FR-26` · `UC-19`, `UC-25`, `UC-26` |
| **`SCR-16`** | `/staff/queue` | Hàng đợi khám theo bác sĩ (Lễ tân · Gọi lượt & Bỏ lượt) | — | — | ● | — | — | `M08` · `FR-20`, `FR-21` · `UC-20`, `UC-21` |
| **`SCR-17`** | `/staff/notifications` | Trung tâm thông báo Outbox (`PENDING/SENT/SKIPPED/FAILED`) | — | — | ● | ● | — | `M06` · `FR-15`, `FR-16`, `FR-25`, `FR-26` · `UC-15`, `UC-16`, `UC-25`, `UC-26` |
| **`SCR-18`** | `/admin/specialties` | Quản lý danh mục chuyên khoa | — | — | — | ● | — | `M02` · `FR-03` · `UC-03` |
| **`SCR-19`** | `/admin/permissions` (`/admin/doctors` redirect) | Quản lý Nhân sự & Bác sĩ (Cấp nhân sự Keycloak, Phân quyền, Ngừng nhận lịch) | — | — | — | ● | — | `M01`, `M02` · `FR-02`, `FR-03`, `FR-04` · `UC-02`, `UC-03`, `UC-04` |
| **`SCR-20`** | `/admin/schedules` | Điều phối lịch làm việc & lịch nghỉ bác sĩ toàn phòng khám | — | — | — | ● | — | `M03` · `FR-05`, `FR-06` · `UC-05`, `UC-06` |
| **`SCR-21`** | `/admin/clinic-hours` | Cấu hình Giờ hoạt động 7 ngày & Ngày nghỉ lễ ưu tiên $H_{\text{eff}}(D)$ | — | — | — | ● | — | `M03` · `FR-05` · `UC-05` |
| **`SCR-22`** | `/admin/patient-accounts` | Tra cứu chính xác tài khoản bệnh nhân (Blind Index HMAC) & Khóa/Mở khóa | — | — | — | ● | — | `M01`, `M07` · `FR-27`, `FR-17` · `UC-27`, `UC-17` |
| **`SCR-23`** | `/audit` | Nhật ký kiểm toán hệ thống (Append-only, lọc phân trang, `X-Request-Id`) | — | — | — | — | ● | `M07` · `FR-17`, `FR-18` · `UC-17`, `UC-18` |

---

## 2. Đặc tả chi tiết 23 màn hình (`SCR-01..SCR-23`) và 6 hộp thoại (`DLG-01..DLG-06`)

### 2.1. Bảng đặc tả màn hình chính (`SCR-01..SCR-23`)

| Mã màn | Màn hình & Thành phần FE | Nội dung & Hành động tương tác chính | Trạng thái lỗi / Rỗng / Ràng buộc biên |
|---|---|---|---|
| **`SCR-01`** | Đăng nhập (`LoginPage.tsx`, `Guard.tsx`) | Chuyển hướng Keycloak 26.4 (OIDC Authorization Code + PKCE S256), đăng nhập mật khẩu ($\ge 8$ ký tự), **Tiếp tục với Google OAuth2** (tự cấp `PATIENT`), **Quên mật khẩu** qua SMTP. | Sai mật khẩu 5 lần trong 900s → khóa tạm 60–900s (`NFR-15`); đổi tài khoản khác quyền sau đăng nhập (`fromSignin=true`) tự về trang chủ vai trò mới (`FR-02`). |
| **`SCR-02`** | Tài khoản của tôi (`Account.tsx`) | Xem tên hiển thị, vai trò, mã `UUIDv3(issuer\|subject)` (có nút sao chép), email/SĐT hiện tại, nút **Đổi mật khẩu (Keycloak)** và **Chỉnh sửa liên hệ** (mở `DLG-01`). | Chỉ đổi SĐT (7–15 chữ số, chuẩn hóa `+84 → 0`) không cần OTP; đổi sang email mới bắt buộc xác thực OTP 6 chữ số (`DLG-01`). |
| **`SCR-03`** | Tổng quan Bệnh nhân (`patient/Dashboard.tsx`) | Thẻ KPI lịch hẹn sắp tới, hồ sơ `FINAL`, đơn thuốc `ISSUED`, phiên từ xa sẵn sàng; bảng lịch sắp tới kèm nút **+ Đặt lịch khám mới** (`→ SCR-04`), **Vào phòng chờ** (`→ SCR-07`), **Đổi/Hủy lịch** (`→ DLG-02`). | Chưa có lịch hẹn: hiển thị trạng thái rỗng kèm nút dẫn sang `SCR-04`. |
| **`SCR-04`** | Đặt lịch khám 3 bước (`patient/Booking.tsx`) | **Bước 1 (`SCR-04A`):** Chọn chuyên khoa & bác sĩ active. **Bước 2 (`SCR-04`):** Chọn hình thức (`IN_PERSON` / `REMOTE`), ngày khám và slot trống 20 phút (`GET /api/slots`, `p95 = 7,81 ms`). **Bước 3 (`SCR-04B`):** Xác nhận đặt lịch kèm `Idempotency-Key` 24h. | Slot vừa bị đặt trùng trả `409 Conflict` → quay về Bước 2 tải lại slot và giữ bộ lọc; mất mạng (`status 0`) báo lỗi `< 10 s`, giữ lựa chọn và dùng lại cùng `Idempotency-Key` (`NFR-09`). |
| **`SCR-05`** | Lịch khám của tôi (`patient/Appointments.tsx`) | Danh sách toàn bộ lịch hẹn của bệnh nhân theo trạng thái (`CONFIRMED`, `CHECKED_IN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW`); nút **Đổi lịch** / **Hủy lịch** mở `DLG-02`, nút **Xem hồ sơ** chuyển sang `SCR-06`. | Chỉ cho phép đổi/hủy khi `CONFIRMED` và còn $\ge 2\text{ giờ}$ (`7.200 s`) trước giờ bắt đầu (`BR-08`); quá hạn khóa nút và nêu rõ lý do. |
| **`SCR-06`** | Hồ sơ & đơn thuốc của tôi (`patient/Records.tsx`) | Hiển thị các bản bệnh án đã chốt (`FINAL`, giải mã AES-256-GCM) và đơn thuốc đã phát hành (`ISSUED`, đủ 5 trường) của chính bệnh nhân; ghi audit `READ` fail-closed trước khi trả dữ liệu. | Không hiển thị bản `DRAFT`; nếu ghi audit lỗi → hoàn tác trả `503` không tiết lộ bệnh án (`BR-16`). |
| **`SCR-07`** | Phòng khám từ xa Bệnh nhân (`patient/Telehealth.tsx`) | Mở phòng chờ trong `[start - 10p, start + 15p)`, kiểm tra camera/mic, tích xác nhận đồng ý (`consent=true`), nhận room token TTL `300 s`, kết nối WebRTC P2P (`coturn` 3478), nút **Chỉ âm thanh (Audio-only)** và **Nối lại (ICE Restart)**. | Ngoài cửa sổ hoặc chưa `consent=true` → từ chối `409/422`; phiên bị hủy do `NO_SHOW` báo rõ lý do không thể tham gia. |
| **`SCR-08`** | Tổng quan Bác sĩ (`doctor/Home.tsx`) | Thẻ KPI lịch hôm nay, số phiếu đang chờ FIFO, ca đang khám, ca hoàn tất; danh sách ca ưu tiên kèm nút **Mở bệnh án** (`→ SCR-12`), **Gọi lượt** (`→ SCR-11`), **Vào phòng từ xa** (`→ SCR-13`). | Tự động đồng bộ theo bác sĩ đang đăng nhập (`DoctorContext`). |
| **`SCR-09`** | Lịch làm việc & nghỉ (`doctor/Schedule.tsx`) | Tạo ca làm việc mới (chia hết cho `20 phút`, nằm trong giờ hoạt động hiệu lực $H_{\text{eff}}(D)$) để sinh $N = (e-s)/(60d)$ slot; đăng ký lịch nghỉ (`time_off`) và xóa ca/lịch nghỉ chưa vướng lịch hẹn. | Ngoài giờ mở cửa/ngày lễ hoặc sai bội số slot → `422`; trùng ca khác hoặc lịch nghỉ đè lên lịch hẹn hiệu lực → chặn `409` (`RG-06`, `RG-07`). |
| **`SCR-10`** | Lịch hẹn của Bác sĩ (`doctor/Appointments.tsx`) | Lọc lịch phân công theo ngày, trạng thái, hình thức; thao tác **Khám & kê đơn** (`→ SCR-12`), **Vào phòng từ xa** (`→ SCR-13`), và **Vắng mặt (`NO_SHOW`)** (mở `DLG-04`) cho lịch từ xa từ mốc `start + 15 phút`. | Bác sĩ chỉ ghi `NO_SHOW` cho lịch `REMOTE` từ mốc `+15p` khi vẫn ở trạng thái `CONFIRMED` (`BR-18`). |
| **`SCR-11`** | Hàng đợi khám Bác sĩ (`doctor/Queue.tsx`) | Hiển thị hàng đợi ngày hiện tại theo vị trí FIFO (`WAITING`, `CALLED`, `IN_SERVICE`, `DONE`); nút **Gọi bệnh nhân tiếp theo** (`POST /doctors/{id}/queue/next`), **Bắt đầu khám** (`→ SCR-12`) và **Bỏ lượt** (đưa phiếu `CALLED` về cuối hàng `MAX+1` giữ nguyên ID). | Hàng đợi rỗng trả `204 No Content` (`RG-04`); đã có phiếu đang `CALLED/IN_SERVICE` mà gọi tiếp trả `409` (`RG-12`). |
| **`SCR-12`** | Khám bệnh & kê đơn (`doctor/Consultation.tsx`) | 3 tab: **Bệnh án** (`DRAFT → FINAL` bất biến theo khóa lạc quan `version`, bản bổ sung tạo bản `FINAL` mới có lý do), **Đơn thuốc** (sửa nháp bằng `PUT`, phát hành `ISSUED` yêu cầu $\ge 1$ dòng đủ 5 trường), **Lịch sử**; kèm thanh gọi WebRTC thu gọn của `DoctorCallLayout`. | Sai `version` trả `409`; phát hành đơn rỗng/thiếu trường trả `422`; chỉ cho bấm **Hoàn tất ca khám (`COMPLETED`)** khi hồ sơ đã `FINAL` và phiên từ xa (nếu có) đã `ENDED` (`BR-15`). |
| **`SCR-13`** | Phòng khám từ xa Bác sĩ (`doctor/Telehealth.tsx`) | Bác sĩ bấm **Bắt đầu phiên (`start`)** trong `[start, start+15p)` tạo `Encounter` nguyên tử, kết nối video/audio P2P, nút **Mở Khám bệnh & kê đơn (giữ cuộc gọi)** (`→ SCR-12`) và **Kết thúc phiên (`ENDED`)** thu hồi toàn bộ token/tín hiệu. | Người ngoài biết ID phiên bị chặn `404` kèm audit `DENIED` (`RG-01`); kết thúc cuộc gọi tách biệt với chốt hồ sơ `FINAL` (`BR-15`). |
| **`SCR-14`** | Dashboard Vận hành (`staff/Dashboard.tsx`) | Thống kê tổng lịch trong ngày, số lượt đã check-in, số ca `NO_SHOW`, trạng thái hàng đợi Email Outbox; lối tắt mở `SCR-15`, `SCR-16`, `SCR-17`. | Hiển thị menu theo quyền của `RECEPTIONIST` hoặc `ADMINISTRATOR`. |
| **`SCR-15`** | Tiếp đón / Check-in (`staff/Reception.tsx`) | Tìm & lọc lịch theo ngày, bác sĩ, trạng thái, hình thức; nút **Check-in** (cấp 1 phiếu `WAITING` ở `MAX+1` trong `[T-15p, T+15p)`), nút **Báo chậm** (mở `DLG-03`) và nút **Vắng mặt** (mở `DLG-04` cho lịch trực tiếp từ `+15p`). | Ngoài cửa sổ check-in hoặc lịch `REMOTE` → khóa nút Check-in kèm chú thích lý do; check-in lặp tái sử dụng chính phiếu đã cấp (`RG-10`). |
| **`SCR-16`** | Hàng đợi khám Lễ tân (`staff/Queue.tsx`) | Chọn bác sĩ và ngày để theo dõi danh sách phiếu chờ, hỗ trợ **Gọi lượt tiếp theo (FIFO)** và **Bỏ lượt** kèm lý do (đưa về cuối hàng `MAX+1`). | Lễ tân điều phối hàng đợi nhưng không bắt đầu khám lâm sàng hay mở bệnh án (`BR-01`, `BR-09`). |
| **`SCR-17`** | Trung tâm thông báo Outbox (`staff/Notifications.tsx`) | Bảng 100 tác vụ `notification_job` gần nhất (`CONFIRMATION`, `REMINDER_30M`, `DELAY_NOTICE`, `NO_SHOW_REBOOKING`) với số lần thử (`0..3`), lịch backoff `[1, 5, 15 phút]` và trạng thái `PENDING / SENT / SKIPPED / FAILED`. | Không chứa chẩn đoán, đơn thuốc hay token (`BR-12`); lỗi SMTP không hoàn tác giao dịch lịch hẹn (`BR-11`). |
| **`SCR-18`** | Danh mục chuyên khoa (`admin/Specialties.tsx`) | Danh sách chuyên khoa, thêm mới và chỉnh sửa tên/mã/trạng thái hoạt động của chuyên khoa. | Chuyên khoa không tồn tại hoặc ngừng hoạt động không được gán cho bác sĩ mới (`FR-03`). |
| **`SCR-19`** | Nhân sự & bác sĩ (`admin/Permissions.tsx`) | Gộp `/admin/doctors` (`/admin/doctors → /admin/permissions?role=DOCTOR`), tìm/lọc nhân sự, cấp tài khoản nhân sự mới qua Keycloak Admin API (`POST /api/staff/provision`), phân quyền `user_role`, kích hoạt hoặc ngừng nhận lịch bác sĩ (`PUT /api/doctors/{id}`). | Ngừng hoạt động bác sĩ khi còn lịch tương lai hiệu lực (`CONFIRMED/CHECKED_IN/IN_PROGRESS`) bị chặn `409` (`RG-08`); kích hoạt bác sĩ khi chưa có role `DOCTOR` bị chặn `409` (`RG-09`). |
| **`SCR-20`** | Lịch làm việc bác sĩ (`admin/Schedules.tsx`) | Quản trị viên xem, thêm ca làm việc và lịch nghỉ cho từng bác sĩ trong toàn phòng khám. | Áp dụng cùng quy tắc kiểm tra chồng lấp và bảo vệ lịch hẹn đang có (`BR-05`). |
| **`SCR-21`** | Giờ hoạt động & Ngày nghỉ lễ (`admin/ClinicHours.tsx`) | 7 thẻ ngày trong tuần (`Thứ 2` → `Chủ nhật`) bật/tắt hoạt động và chỉnh giờ mở/đóng cửa; bảng quản lý **Ngày nghỉ lễ** (`GET/POST/DELETE /api/clinic/holidays`) ưu tiên trên giờ hằng tuần theo công thức $H_{\text{eff}}(D)$. | Giờ đóng cửa $\le$ giờ mở cửa báo lỗi tại chỗ; sửa giờ hoặc thêm ngày lễ làm ảnh hưởng lịch hẹn đang có bị chặn `409` (`BR-05`). |
| **`SCR-22`** | Tài khoản bệnh nhân (`admin/PatientAccounts.tsx`) | Mặc định trống; ô nhập tra cứu chính xác theo **UUID, email hoặc SĐT** (chuẩn hóa `+84 → 0`) qua blind index tách khóa `K_hmac`; chỉ hiển thị 3 trường tối thiểu `{id, displayName, active}` kèm nút **Khóa / Mở khóa tài khoản** (mở `DLG-05`). | Nhập tên người hoặc sai định dạng → `400`; tài khoản nhân sự → `404`; trùng SĐT gia đình ($\ge 2$ tài khoản) → `409` yêu cầu nhập UUID (`BR-19`). |
| **`SCR-23`** | Nhật ký kiểm toán (`staff/Audit.tsx`) | Chỉ dành cho `AUDITOR`; lọc theo `actorId` (UUID), `resourceId`, khoảng ngày `Từ – Đến`, kết quả (`SUCCESS`, `DENIED`, `FAILURE`), phân trangTrước/Sau (20 dòng/trang, tối đa 100), xem chi tiết sự kiện kèm `X-Request-Id`. | Chỉ đọc (`append-only`, CSDL chặn `UPDATE/DELETE`); `AUDITOR` thuần bị chặn `403` khi gọi danh mục khám (`RG-03`). |

---

### 2.2. Bảng đặc tả 6 hộp thoại và trạng thái tương tác (`DLG-01..DLG-06`)

| Mã hộp thoại | Tên hộp thoại / Trạng thái | Mở từ màn hình | Trường dữ liệu & Hành vi xử lý |
|---|---|---|---|
| **`DLG-01`** | Xác thực OTP 6 chữ số khi đổi email (`Account.tsx`) | `SCR-02` (`/account`) | Nhập email mới → bấm **Gửi mã OTP** (`POST /api/me/contact/otp`, TTL `300 s`, cooldown `30 s`, tối đa 5 lượt/giờ/email, Nginx `10r/m/IP` trả `429`) → nhập **OTP 6 chữ số** (tối đa 5 lần sai) → **Lưu thay đổi** (`PUT /api/me/contact`). |
| **`DLG-02`** | Đổi lịch / Hủy lịch hẹn (`Appointments.tsx`) | `SCR-03`, `SCR-05` | Kiểm tra `status = CONFIRMED` và còn $\ge 2\text{ giờ}$ trước giờ hẹn; chọn slot mới (khi đổi) hoặc nhập lý do bắt buộc `1–1000` ký tự (khi hủy) kèm khóa lạc quan `version` và `Idempotency-Key`. |
| **`DLG-03`** | Báo chậm giờ hẹn (`DELAY_NOTICE` · `Reception.tsx`) | `SCR-15` (`/staff/reception`) | Giữ nguyên giờ hẹn và trạng thái chính thức; cho phép nhập **Giờ bắt đầu dự kiến** (tùy chọn, phải $> \max(\text{start}, \text{now})$ trong cùng ngày VN); xếp tối đa 1 tác vụ `DELAY_NOTICE` trên mỗi `version` lịch (`FR-25`, `BR-17`). |
| **`DLG-04`** | Ghi nhận vắng mặt (`NO_SHOW` · `NoShowDialog.tsx`) | `SCR-15` (trực tiếp), `SCR-10` (từ xa) | Chỉ mở từ mốc `start + 15 phút` trên lịch `CONFIRMED`; chọn mã lý do (`PATIENT_ABSENT`, `COULD_NOT_CONTACT`, `TECHNICAL_ISSUE`, `OTHER`) và checkbox **Gửi email mời bệnh nhân đặt lịch lại** (`NO_SHOW_REBOOKING`, không lộ lý do nội bộ · `FR-26`, `BR-18`). |
| **`DLG-05`** | Khóa / Mở khóa tài khoản bệnh nhân (`PatientAccounts.tsx`) | `SCR-22` (`/admin/patient-accounts`) | Bắt buộc chọn lý do (`SECURITY_REVIEW` — Rà soát bảo mật, `POLICY_REVIEW` — Rà soát theo quy định, `PATIENT_REQUEST` — Yêu cầu của bệnh nhân); ghi audit và thu hồi hiệu lực truy cập tức thì kể cả khi JWT còn hạn (`FR-27`, `BR-19`). |
| **`DLG-06`** | Xác nhận đăng xuất (`AppShell.tsx`) | Mọi màn hình có Sidebar (`SCR-02..SCR-23`) | Hiển thị tên, vai trò, cảnh báo mất thay đổi chưa lưu; nếu đang ở `/doctor/telehealth` hoặc `/patient/telehealth` hiện thêm cảnh báo `Notice` màu vàng: đăng xuất chỉ rời cuộc gọi trên thiết bị này, bác sĩ cần bấm **Kết thúc phiên** để đóng phiên cho cả hai bên. |

---

## 3. Wireframe mức thấp các luồng cốt lõi

### 3.1. Wireframe Đặt lịch 3 bước (`SCR-04`)
```text
[SCR-04] Đặt lịch khám                               Giờ phòng khám: Asia/Ho_Chi_Minh
Bước: (✓ 1. Chuyên khoa & bác sĩ) ──> (● 2. Thời gian khám) ──> (○ 3. Xác nhận)
Hình thức: [● Trực tiếp (IN_PERSON)] [○ Từ xa (REMOTE)]     Ngày khám: [23/11/2026]
Khung giờ còn trống (20 phút/slot · p95 = 7,81 ms · loại trừ lịch nghỉ & ngày lễ H_eff(D)):
  [08:00] [08:20] [08:40] [09:00] [09:20] [09:40] [● 10:00] [10:20] [14:00] [14:20]
[← Quay lại Bước 1]                                         [Tiếp tục xác nhận →]
```

### 3.2. Wireframe Khám bệnh, Bệnh án & Phòng từ xa (`SCR-12` & `SCR-13`)
```text
[SCR-12] Khám bệnh & kê đơn · LH-9C4D22 · BN-33F11A (version=1 · AES-256-GCM)
┌─ Thanh cuộc gọi duy trì song song (DoctorCallLayout) ──────────────────────────┐
│ [● ĐANG GỌI TỪ XA · 06:42] Phiên WebRTC đang kết nối P2P    [Mở rộng phòng gọi]│
└────────────────────────────────────────────────────────────────────────────────┘
Tab: [● Bệnh án (DRAFT v1)] [○ Đơn thuốc (5 trường)] [○ Lịch sử (3)]
[Triệu chứng / Sinh hiệu / Chẩn đoán / Kế hoạch điều trị .......................]
[Lưu nháp (DRAFT)]   [Chốt bệnh án (FINAL · Bất biến)]   [Hoàn tất ca khám]
```

### 3.3. Wireframe Tiếp đón, Báo chậm (`DLG-03`) & Vắng mặt (`DLG-04`) (`SCR-15`)
```text
[SCR-15] Tiếp đón / Check-in · Ngày 22/11/2026
Giờ   | Mã lịch   | Bệnh nhân | Bác sĩ            | Hình thức | Trạng thái  | Thao tác
09:20 | LH-8F2A10 | BN-91D02C | BS. Trần Văn Hùng | Trực tiếp | Đã xác nhận | [Check-in] [Báo chậm → DLG-03]
08:40 | LH-6D2F01 | BN-55A81B | BS. Lê Thị Mai    | Trực tiếp | Đã xác nhận | [Vắng mặt → DLG-04]
```

### 3.4. Wireframe Giờ hoạt động & Ngày nghỉ lễ (`SCR-21`) và Tài khoản bệnh nhân HMAC (`SCR-22`)
```text
[SCR-21] Giờ hoạt động hằng tuần (Mở 6/7 ngày · 54 giờ/tuần) & Ngày nghỉ lễ H_eff(D)
[T2: 08:00-17:00 ●] [T3: 08:00-17:00 ●] ... [T7: 08:00-12:00 ●] [CN: Nghỉ ○]  [Lưu giờ hoạt động]
Ngày nghỉ lễ ưu tiên: Tết Dương lịch (01/01/2027) [Xóa] | [+ Thêm ngày nghỉ lễ]

[SCR-22] Tài khoản bệnh nhân (Tra cứu chính xác UUID / Email / SĐT qua Blind Index K_hmac)
Ô tìm kiếm: [benhnhan.an@example.com                  ] [Tra cứu chính xác]
Kết quả (3 trường tối thiểu): Nguyễn Minh An | 4a8c9e21-... | [● Đang hoạt động] [Khóa tài khoản → DLG-05]
```
