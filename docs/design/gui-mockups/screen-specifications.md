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
| **`SCR-23`** | `/audit` | Nhật ký kiểm toán hệ thống (Append-only, chuỗi băm HMAC-SHA256, lọc server-side, xuất CSV & lưu trữ) | — | — | — | — | ● | `M07` · `FR-17`, `FR-18` · `UC-17`, `UC-18` |

---

## 2. Đặc tả chi tiết 23 màn hình (`SCR-01..SCR-23`) và 6 hộp thoại (`DLG-01..DLG-06`)

### 2.1. Bảng đặc tả màn hình chính (`SCR-01..SCR-23`)

| Mã màn | Màn hình & Thành phần FE | Nội dung & Hành động tương tác chính | Trạng thái lỗi / Rỗng / Ràng buộc biên |
|---|---|---|---|
| **`SCR-01`** | Đăng nhập (`LoginPage.tsx`, `Guard.tsx`) | Chuyển hướng Keycloak 26.4 (OIDC Authorization Code + PKCE S256) dùng chung cho cả 5 vai trò (thông điệp trung tính), đăng nhập mật khẩu ($\ge 8$ ký tự, có nút hiện/ẩn), **Tiếp tục với Google OAuth2** (tự cấp `PATIENT`), **Đăng ký bệnh nhân** (đồng bộ họ tên, email, SĐT VN 10 số, ngày sinh, quê quán, địa chỉ thường trú), **Đổi / Đặt lại mật khẩu** theo ngữ cảnh, **Quên mật khẩu** qua SMTP và trang đã đăng xuất. | Sai mật khẩu 5 lần trong 900s → khóa tạm 60–900s (`NFR-15`); khi lỗi `403 Account disabled` hiển thị đủ nút **Thử lại** và **Đăng xuất / Đổi tài khoản** tránh kẹt phiên; đổi tài khoản khác quyền sau đăng nhập (`fromSignin=true`) tự về trang chủ vai trò mới (`FR-02`). |
| **`SCR-02`** | Tài khoản của tôi (`Account.tsx`) | Xem tên hiển thị, vai trò (`Pill info`), `Tên đăng nhập`, `Mã tài khoản` `UUIDv3(issuer\|subject)` (nút **Sao chép** → **Đã chép**), `Mã bệnh nhân`; hai khối thông tin rõ ràng gồm **Thông tin liên hệ** (`Email nhận thông báo`, `Số điện thoại` chuẩn VN 10 số — sửa tự do, đổi email cần OTP 6 số) và **Thông tin cá nhân** (`Ngày sinh`, `Quê quán`, `Địa chỉ thường trú` đồng bộ từ đăng ký cùng các trường mở rộng); với vai trò `DOCTOR` hiển thị thêm **`Mã bác sĩ`**, **`Chuyên khoa`** (`.chips` `Pill info`) và **`Nhận lịch khám`** (`Pill ok` / `Pill wait`); nút **Chỉnh sửa thông tin** (mở khối `DLG-01`), **Cập nhật hồ sơ** và **Đổi mật khẩu** (Keycloak AIA `UPDATE_PASSWORD` quay thẳng về `/account` kèm toast xác nhận). | Chỉ đổi SĐT Việt Nam (`03/05/07/08/09` đủ 10 số, chuẩn hóa `+84`/`84` $\to$ `0`) không cần OTP (nút **Lưu thông tin**); đổi sang email mới bắt buộc xác thực OTP 6 chữ số (`DLG-01`). Bổ sung trường cá nhân còn trống không bị khóa; thay đổi thông tin nhân thân đã có bị giới hạn tối đa **1 lần mỗi 90 ngày** (`409 Conflict` nếu chưa đến hạn, UI hiển thị ngày mở khóa). |
| **`SCR-03`** | Tổng quan Bệnh nhân (`patient/Dashboard.tsx`) | Topbar `Xin chào, {displayName}`; `.head` có eyebrow ngày, mô tả và nút **Đặt lịch khám** (`→ SCR-04`); 3 thẻ KPI (`Lịch sắp tới`, `Khám từ xa sắp tới`, `Lần khám hoàn tất`); bảng `Lịch khám sắp tới` (`Xem tất cả` `→ SCR-05`); thẻ `Lần khám tiếp theo` (nút **Phòng chờ trực tuyến** `→ SCR-07`), thẻ `Lối tắt` (**Hồ sơ & đơn thuốc** `→ SCR-06`, **Cập nhật email nhận thông báo** `→ SCR-02`) và `Notice info` quy tắc 2 giờ. | Chưa có lịch hẹn: hiển thị trạng thái rỗng `Bạn chưa có lịch khám sắp tới` kèm liên kết `Đặt lịch khám ngay` dẫn sang `SCR-04`. |
| **`SCR-04`** | Đặt lịch khám 3 bước (`patient/Booking.tsx`) | **Bước 1 (`SCR-04A`):** `Chọn chuyên khoa` & `Chọn bác sĩ` (thẻ `.choice`). **Bước 2 (`SCR-04`):** `Chọn thời gian khám` (`Segmented` `Trực tiếp \| Từ xa`, `Ngày khám`, lưới `.slots` `Khung giờ còn trống`). **Bước 3 (`SCR-04B`):** `Kiểm tra thông tin lịch khám` + nút **Xác nhận đặt lịch** kèm `Idempotency-Key` 24h. **Sau khi xác nhận:** hiển thị `Panel.success` **`Đặt lịch thành công`** (`Mã lịch hẹn`, `Thời gian`, `Bác sĩ`, `Hình thức`, nút **Về tổng quan** & **Xem lịch của tôi**). | Slot vừa bị đặt trùng trả `409 Conflict` → quay về Bước 2 tải lại slot và giữ bộ lọc; mất mạng (`status 0`) hiện `Notice warn` giữ nguyên lựa chọn và dùng lại cùng `Idempotency-Key` (`NFR-09`). |
| **`SCR-05`** | Lịch khám của tôi (`patient/Appointments.tsx`) | 4 tab (`Đang theo dõi`, `Đã hoàn tất`, `Đã hủy / vắng`, `Tất cả`), thanh lọc (`Tìm theo mã lịch, bác sĩ, chuyên khoa…`, `Tất cả hình thức`, **Làm mới**); nút **Chi tiết từ xa** / **Vào phòng chờ** (`→ SCR-07`), **Đổi lịch** / **Hủy** (mở `DLG-02`), hoặc **Xem hồ sơ** (`→ SCR-06` ở tab `Đã hoàn tất`). | Chỉ cho phép đổi/hủy khi `CONFIRMED` và còn $\ge 2\text{ giờ}$ (`7.200 s`) trước giờ bắt đầu (`BR-08`); còn $< 2\text{ giờ}$ hiển thị `Đã khóa đổi/hủy (còn dưới 2 giờ)`; đã hủy hiển thị `Lý do: …`. |
| **`SCR-06`** | Hồ sơ & đơn thuốc của tôi (`patient/Records.tsx`) | Bố cục `.split` (`320px : 1fr`): cột trái `Lịch sử khám` (`.listbtn` chọn lần khám); cột phải hiển thị `Panel` bệnh án (`Pill ok` `Đã hoàn tất`, `TRIỆU CHỨNG`, 5 thẻ `.vitals` `CHỈ SỐ SINH TỒN`, `CHẨN ĐOÁN`, `HƯỚNG ĐIỀU TRỊ / LỜI DẶN`, `GHI CHÚ`) và `Panel` `Đơn thuốc điện tử` (`Chỉ hiển thị đơn đã phát hành`, `.rx-item` 4 cột `Liều dùng`, `Đường dùng`, `Tần suất`, `Thời gian`). | Không hiển thị bản `DRAFT`; nếu bản `FINAL` là bản đính chính (`supersedesId`) hiện `Notice warn` **`Bản chỉnh sửa bổ sung. Lý do: …`**; lỗi ghi audit hoàn tác trả `503` (`BR-16`). |
| **`SCR-07`** | Phòng khám từ xa Bệnh nhân (`patient/Telehealth.tsx`) | Bố cục `.video-layout` (`1.6fr : 1fr`): sân khấu `.stage` 2 ô video (`BS. …` và `Bạn`) + thanh `.controls` (**Mic**, **Camera**, **Kiểm tra camera & micro**, **Kết nối lại**, **Rời cuộc gọi**); cột phải `Phiên khám từ xa` (`Trạng thái: [Pill]`, checkbox `Chỉ âm thanh`, checkbox `Tôi đồng ý tham gia buổi khám từ xa này.`, nút **Tham gia phòng chờ**). | Ngoài cửa sổ `[start - 10p, start + 15p)` hoặc chưa tích `consent=true` → khóa nút **Tham gia phòng chờ** kèm `Notice` thông báo giờ mở phòng chờ. |
| **`SCR-08`** | Tổng quan Bác sĩ (`doctor/Home.tsx`) | Topbar `Xin chào, {displayName}`; 4 thẻ KPI (`Lịch hôm nay`, `Đang chờ`, `Đang khám`, `Hoàn tất`); bảng `Lịch hôm nay` (`GIỜ \| MÃ LỊCH \| BỆNH NHÂN \| HÌNH THỨC \| TRẠNG THÁI`, nút **Tất cả lịch hẹn** `→ SCR-10`); thẻ `Ca tiếp theo` (nút **Mở hồ sơ khám** `→ SCR-12` hoặc **Vào phòng khám từ xa** `→ SCR-13`). | Tự động đồng bộ theo bác sĩ đang đăng nhập (`DoctorContext`). |
| **`SCR-09`** | Lịch làm việc & nghỉ (`doctor/Schedule.tsx`) | Panel `Lịch làm việc theo tuần` / `Lịch làm việc theo tháng` (nút `<`, **Tuần** ↔ **Tháng**, `>`), thanh `.schedule-legend` (`Trực tiếp`, `Từ xa`, `Nghỉ`, `Đang diễn ra`, `Đã qua`), lưới 7 cột `.weekgrid` (hoặc 42 ô `.monthgrid`). **Bấm ô ngày** mở modal **`Chi tiết {ngày}`** (thanh `DayTimeline` `08:00–17:00`, nút **+ Thêm ca làm việc** mở form `Đăng ký ca làm việc` với preset `Ca sáng 08:00–12:00` / `Ca chiều 13:00–17:00`). **Bấm thẻ ca** mở modal **`Chi tiết ca làm việc`** (nút **Xóa ca** mở `Xóa ca làm việc?` và **Thêm thời gian nghỉ** mở form nghỉ trong ca). | Ngoài giờ mở cửa/ngày lễ hoặc sai bội số slot → báo lỗi kèm nút **Tự động chỉnh giờ hợp lệ**; trùng ca khác hoặc lịch nghỉ đè lên lịch hẹn hiệu lực → chặn `409` (`RG-06`, `RG-07`). |
| **`SCR-10`** | Lịch hẹn của Bác sĩ (`doctor/Appointments.tsx`) | Thanh `.filters` gồm 3 tab (`Hôm nay`, `Sắp tới`, `Đã qua`), select `Trạng thái`, select `Hình thức`; danh sách `.appt` (`subject="patient"`) kèm nút **Khám bệnh** / **Xem hồ sơ** / **Hồ sơ** (`→ SCR-12`), **Phòng từ xa** (`→ SCR-13`), và **Vắng mặt** (mở `DLG-04`). | Bác sĩ chỉ ghi `NO_SHOW` cho lịch `REMOTE` từ mốc `+15p` khi vẫn ở trạng thái `CONFIRMED` (`BR-18`). |
| **`SCR-11`** | Hàng đợi khám Bác sĩ (`doctor/Queue.tsx`) | `.head` có nút **Làm mới** và **Gọi bệnh nhân tiếp theo** (`POST /doctors/{id}/queue/next`); khi gọi hiện `Notice ok` `Đang gọi số #1 (LH-…). Mở hồ sơ khám`; bảng `Đang chờ (n)` (`SỐ \| LỊCH HẸN \| BỆNH NHÂN \| CHECK-IN \| TRẠNG THÁI \| [Khám]`). | Hàng đợi rỗng trả `204 No Content` (`RG-04`); đã có phiếu đang `CALLED/IN_SERVICE` thì khóa nút gọi tiếp (`RG-12`). |
| **`SCR-12`** | Khám bệnh & kê đơn (`doctor/Consultation.tsx`) | Khi chưa chọn mã lịch (`/doctor/consultation`), hiện `Panel` **`Chọn ca khám`** (bảng ca khám có nút **Mở**). Khi mở ca khám: Panel thông tin (`Lịch hẹn`, `Bệnh nhân`, `Giờ hẹn`, `Hình thức`, `Trạng thái`, nút **Bắt đầu khám** / **Phòng khám từ xa** / **Hoàn tất ca khám** mở `Hoàn tất ca khám?`); 3 tab: **Bệnh án** (`Bản nháp · v1` → `Đã hoàn tất · v1`, nút **Lưu nháp**, **Hoàn tất hồ sơ**, hoặc **Chỉnh sửa bổ sung** mở ô `Lý do chỉnh sửa *`), **Đơn thuốc** (`Kê đơn thuốc`, `Thuốc 1` đủ 5 trường bắt buộc, **+ Thêm thuốc**, **Lưu nháp**, **Phát hành đơn**), **Lịch sử (n)**. | Sai `version` trả `409`; phát hành đơn rỗng/thiếu trường trả `422`; chỉ cho bấm **Hoàn tất ca khám (`COMPLETED`)** khi hồ sơ đã `FINAL` và phiên từ xa (nếu có) đã `ENDED` (`BR-15`). |
| **`SCR-13`** | Phòng khám từ xa Bác sĩ (`doctor/Telehealth.tsx`) | Thanh chọn lịch từ xa (`.filters`), sân khấu `.stage` 2 ô video (`Bệnh nhân BN-…`, `Bạn`) + `.controls` (**Mic**, **Camera**, **Kiểm tra camera & micro**, **Kết nối lại**, **Rời cuộc gọi**, nút đỏ **Kết thúc phiên** mở hộp thoại **`Kết thúc phiên khám từ xa?`**); cột phải `Phiên khám từ xa` (nút **Bắt đầu phiên khám** / **Vào lại phòng**); nút **Mở hồ sơ khám** (`→ SCR-12` giữ cuộc gọi qua `DoctorCallLayout`). | Người ngoài biết ID phiên bị chặn `404` kèm audit `DENIED` (`RG-01`); kết thúc cuộc gọi tách biệt với chốt hồ sơ `FINAL` (`BR-15`). |
| **`SCR-14`** | Dashboard Vận hành (`staff/Dashboard.tsx`) | 4 thẻ KPI (`Lịch hôm nay`, `Đang xử lý`, `Hoàn tất`, `Vắng / hủy`); cột trái `Lịch khám hôm nay` (select `Tất cả (n)`, nút **Làm mới**, nút **Mở tiếp đón** `→ SCR-15`, bảng 6 cột); cột phải `Tải theo bác sĩ` (`8 bác sĩ đang nhận lịch · Lịch hôm nay (trừ đã hủy)` kèm thanh tiến độ `.bar`). | Hiển thị menu và nút **Mở tiếp đón** theo quyền của `RECEPTIONIST` hoặc `ADMINISTRATOR`. |
| **`SCR-15`** | Tiếp đón / Check-in (`staff/Reception.tsx`) | Thanh `.filters` (`Mã lịch, mã bệnh nhân, bác sĩ…`, ô ngày, select `Bác sĩ`, `Trạng thái`, `Hình thức`, nút **Làm mới**); khi check-in xong hiện `Notice ok` `Đã check-in LH-… — số thứ tự #1 (BS. …).`; bảng 7 cột với nút **Check-in**, **Báo chậm** (mở `DLG-03`) và **Vắng mặt** (mở `DLG-04`). | Ngoài cửa sổ check-in `[-15p, +15p)` hoặc lịch `REMOTE` → khóa nút **Check-in** kèm chú thích `Ngoài khung giờ check-in (−15’ … +15’)` hoặc `Chỉ check-in lịch khám trực tiếp` (`RG-10`). |
| **`SCR-16`** | Hàng đợi khám Lễ tân (`staff/Queue.tsx`) | Thanh `.filters` (select bác sĩ, nút **Làm mới**, chú thích `Tự làm mới mỗi 15 giây.`); lưới 3 cột `.queuecards` (`Đang chờ (n)`, `Đã gọi / đang khám (n)`, `Đã xong (n)`); trên thẻ `.qcard` trạng thái `Đã gọi` có nút đỏ **Bỏ qua lượt** mở hộp thoại **`Bỏ qua lượt này?`** (nhập `Lý do *`, nút **Đưa về cuối hàng**). | Lễ tân điều phối hàng đợi nhưng không bắt đầu khám lâm sàng hay mở bệnh án (`BR-01`, `BR-09`). |
| **`SCR-17`** | Trung tâm thông báo Outbox (`staff/Notifications.tsx`) | 4 thẻ KPI (`Đang chờ gửi`, `Đã gửi`, `Thất bại`, `Bỏ qua`); Panel `Danh sách thông báo` (nút **Làm mới**, tìm `Mã lịch hẹn hoặc lỗi…`, select `Sự kiện`, `Trạng thái`), bảng 7 cột (`SỰ KIỆN \| LỊCH HẸN \| TRẠNG THÁI \| SỐ LẦN THỬ \| ĐẾN HẠN \| LỖI \| [Chi tiết]`). Bấm **Chi tiết** mở modal **`Chi tiết thông báo`** (`Mã job`, `Sự kiện`, `Lịch hẹn`, `Trạng thái gửi`, `Số lần thử`, `Đến hạn`, `Lỗi gần nhất`, `Giờ khám`, `Bác sĩ`, `Hình thức`, `Trạng thái lịch`). | Không chứa chẩn đoán, đơn thuốc hay token (`BR-12`); lỗi SMTP không hoàn tác giao dịch lịch hẹn (`BR-11`). |
| **`SCR-18`** | Danh mục chuyên khoa (`admin/Specialties.tsx`) | Thanh `.filters` (`Tên chuyên khoa…`, select `Tất cả (n)`, nút icon **`+`** `Thêm chuyên khoa`); bảng `TÊN CHUYÊN KHOA \| BÁC SĨ PHỤ TRÁCH \| TRẠNG THÁI \| [Sửa]`. Bấm **`+`** mở modal **`Thêm chuyên khoa`** (`Tên chuyên khoa *`, `Hủy`, `Lưu`); bấm **Sửa** mở modal **`Cập nhật chuyên khoa`** (`Tên chuyên khoa *`, công tắc `.clinic-switch` `Đang hoạt động` / `Ngừng hoạt động`, `Hủy`, `Lưu`). | Chuyên khoa trùng tên hoặc ngừng hoạt động bị kiểm tra ràng buộc (`FR-03`). |
| **`SCR-19`** | Nhân sự & bác sĩ (`admin/Permissions.tsx`) | Gộp `/admin/doctors` (`/admin/doctors → /admin/permissions?role=DOCTOR`), thanh `.filters` (`Username hoặc họ tên…`, select `Mọi vai trò`, `Mọi trạng thái`, nút icon **`+`** `Thêm nhân sự`), bảng `HỌ TÊN \| USERNAME \| VAI TRÒ \| TRẠNG THÁI \| THAO TÁC`. Bấm **`+`** mở modal **`Thêm nhân sự`** (`Username *`, `Email *`, `Họ tên *`, `Mật khẩu tạm thời *` $\ge 12$ ký tự, `Vai trò nhân sự`, `Chuyên khoa`); bấm **Sửa** mở modal **`Cập nhật nhân sự`** (`Họ tên *`, `Trạng thái tài khoản`, `Vai trò nhân sự`, công tắc `.clinic-switch` `Đang nhận lịch mới`, `Chuyên khoa`). | Ngừng hoạt động bác sĩ khi còn lịch tương lai hiệu lực bị chặn `409` (`RG-08`); kích hoạt bác sĩ khi chưa có role `DOCTOR` bị chặn `409` (`RG-09`). |
| **`SCR-20`** | Lịch làm việc bác sĩ (`admin/Schedules.tsx`) | Panel bộ lọc 2 hàng (`.schedules-filters`: hàng 1 select `Chuyên khoa` + select `BS. … — Chuyên khoa`; hàng 2 select `Ca` + select `Hình thức`), phía dưới nhúng nguyên khối `ScheduleManager` (`Lịch làm việc theo tuần` / `Tháng` cùng các modal `Chi tiết {ngày}`, `Đăng ký ca làm việc`, `Chi tiết ca làm việc`, `Thêm thời gian nghỉ`, `Xóa ca làm việc?` giống `SCR-09`). | Áp dụng cùng quy tắc kiểm tra chồng lấp và bảo vệ lịch hẹn đang có (`BR-05`). |
| **`SCR-21`** | Giờ hoạt động & Ngày nghỉ lễ (`admin/ClinicHours.tsx`) | Panel 1 `Lịch hoạt động hằng tuần` (`Mở 6/7 ngày · Tổng 54 giờ/tuần`, `Pill ok` `Đang áp dụng` hoặc `Pill wait` `Chưa lưu` khi chỉnh sửa, 7 thẻ `.clinic-day-card` `Thứ Hai..Chủ nhật` với công tắc `.clinic-switch` `Hoạt động`/`Nghỉ` + `Mở cửa`/`Đóng cửa`, nút **Lưu giờ hoạt động** và **Bỏ thay đổi**). Panel 2 `Ngày nghỉ lễ & lịch đặc biệt` (`Pill` `0 ngày`, nút **Thiết lập ngày lễ** ↔ **Thu gọn** mở `.clinic-holiday-form`: `Từ ngày`, `Đến ngày`, `Tên dịp lễ`, select `Nghỉ cả ngày` / `Giờ đặc biệt`, nút **+ Thêm**). | Giờ đóng cửa $\le$ giờ mở cửa báo lỗi tại chỗ (`Giờ đóng cửa phải sau giờ mở cửa.`); sửa giờ hoặc thêm ngày lễ làm ảnh hưởng lịch hẹn đang có bị chặn `409` (`BR-05`). |
| **`SCR-22`** | Tài khoản bệnh nhân (`admin/PatientAccounts.tsx`) | Panel 1 `Tra cứu tài khoản` (ô `Mã tài khoản, email hoặc số điện thoại` + nút **Tra cứu** qua blind index tách khóa `K_hmac`); khi khớp chính xác hiện Panel 2 `Kết quả tra cứu` (`Tên hiển thị`, `Mã tài khoản`, `Trạng thái: [Pill ok: Đang hoạt động]` / `[Pill wait: Đã khóa]`, nút **Khóa tài khoản** / **Mở khóa tài khoản** mở `DLG-05`). | Nhập tên người hoặc sai định dạng → báo lỗi tại chỗ; không tìm thấy → `404`; trùng SĐT gia đình ($\ge 2$ tài khoản) → `409` yêu cầu nhập UUID (`BR-19`). |
| **`SCR-23`** | Nhật ký kiểm toán (`staff/Audit.tsx`) | Chỉ dành cho `AUDITOR`; `.head` có nút **Kiểm chứng toàn vẹn** (`POST /audit-events/verify`), **Chính sách lưu trữ** (mở modal niêm phong lô `audit_archive_batch`), **Xuất CSV** (`GET /audit-events/export` UTF-8 BOM chống formula injection) và **Làm mới**; 4 thẻ KPI bấm lọc nhanh (`Tổng sự kiện`, `Bị từ chối (DENIED)`, `Phân quyền & Tài khoản`, `Sửa đổi bệnh án`); thanh chọn nhanh mốc thời gian (`Tất cả \| Hôm nay \| 24 giờ \| 7 ngày \| 30 ngày`) + hộp chọn `Ẩn sự kiện đọc thông thường`; bộ lọc server-side (hành động tiếng Việt/mã chuẩn, nhóm hành động, kết quả, loại tác nhân, ngày Từ–Đến, UUID tác nhân/đối tượng/Correlation ID) + chip lọc đang áp dụng; bảng 7 cột chuẩn hóa hành động tiếng Việt kèm mã chuẩn, rút gọn UUID theo **Cách 1** (`xxxx…xxxxxxxx`, giữ đủ 2 cột Tác nhân kèm nhãn an toàn & Đối tượng kèm ngữ cảnh/`Chính mình`), bấm truy vết nhanh 1 chạm (pivot) và phân trang bằng con trỏ (`cursorCreatedAt`/`cursorId`). | Chỉ đọc (`append-only`, CSDL chặn `UPDATE/DELETE` trên `audit_event` và `audit_archive_batch`); `AUDITOR` thuần bị chặn `403` khi gọi danh mục khám (`RG-03`); phát hiện bất thường chuỗi băm (`TAMPERED`) hiển thị cảnh báo đỏ nêu rõ số thứ tự & lý do. |

---

### 2.2. Bảng đặc tả 6 hộp thoại định danh (`DLG-01..DLG-06`) và các modal tương tác trong màn hình

| Mã hộp thoại / Modal | Tên hộp thoại / Trạng thái trên FE | Mở từ màn hình & Nút kích hoạt | Trường dữ liệu & Hành vi xử lý thực tế khi bấm trên FE |
|---|---|---|---|
| **`DLG-01`** | Khối `Cập nhật thông tin liên hệ` & OTP 6 chữ số (`Account.tsx`) | `SCR-02` (`/account` · nút **Chỉnh sửa thông tin**) | Mở khối `.stack` (`#F8FAFF`, `maxWidth: 520`) ngay dưới `DetailList`: `Notice info` (yêu cầu OTP 6 chữ số & mã hóa AES-GCM), ô `Email nhận thông báo`, nút **Gửi mã OTP xác nhận** (`POST /api/me/contact/otp`, TTL `300 s`, cooldown `30 s`), ô `Mã xác nhận OTP (6 chữ số)`, ô `Số điện thoại (tùy chọn)`, nút **Xác nhận OTP & Lưu** / **Lưu thông tin** và **Hủy**. |
| **`DLG-02`** | Modal `Đổi lịch khám` / `Hủy lịch khám?` (`Appointments.tsx`) | `SCR-05` (`/patient/appointments` · nút **Đổi lịch** hoặc **Hủy**) | Kiểm tra `status = CONFIRMED` và còn $\ge 2\text{ giờ}$ trước giờ hẹn; khi đổi lịch hiện ô `Ngày khám mới` + lưới `.slots` `Khung giờ mới` + nút **Quay lại** / **Xác nhận đổi**; khi hủy hiện textarea `Lý do hủy *` (`1–1000` ký tự) + nút **Quay lại** / **Xác nhận hủy**. |
| **`DLG-03`** | Modal `Báo chậm giờ hẹn` (`DELAY_NOTICE` · `Reception.tsx`) | `SCR-15` (`/staff/reception` · nút **Báo chậm**) | Thông điệp `Gửi email cho bệnh nhân có lịch LH-… lúc HH:mm. Giờ hẹn đã đặt vẫn giữ nguyên.`; ô `Giờ bắt đầu dự kiến (không bắt buộc)` (type `time`, hint `Giờ địa phương của phòng khám, trong cùng ngày hẹn.`); nút **Quay lại** + **Gửi thông báo** (`FR-25`, `BR-17`). |
| **`DLG-04`** | Modal `Ghi nhận vắng mặt?` (`NO_SHOW` · `NoShowDialog.tsx`) | `SCR-15` (trực tiếp), `SCR-10` (từ xa) · nút **Vắng mặt** | Thông điệp `Lịch LH-… sẽ chuyển sang “Vắng mặt”.`; select `Lý do vắng mặt` (`Chưa rõ lý do` / `Bệnh nhân không có mặt` / `Không liên lạc được` / `Sự cố kỹ thuật` / `Lý do khác`); checkbox `Gửi email mời bệnh nhân đặt lịch lại`; nút **Quay lại** + **Ghi nhận vắng mặt** (`FR-26`, `BR-18`). |
| **`DLG-05`** | Modal `Khóa tài khoản` / `Mở khóa tài khoản` (`PatientAccounts.tsx`) | `SCR-22` (`/admin/patient-accounts` · nút **Khóa tài khoản** / **Mở khóa tài khoản**) | Thông điệp `Khóa quyền truy cập ClinicCare của {displayName}, kể cả phiên đang đăng nhập.`; select `Lý do` (`Chọn lý do` / `Rà soát bảo mật` / `Rà soát theo quy định` / `Yêu cầu của bệnh nhân`); nút **Quay lại** + **Xác nhận khóa** / **Xác nhận mở khóa** (`FR-27`, `BR-19`). |
| **`DLG-06`** | Modal `Xác nhận đăng xuất` (`AppShell.tsx`) | Mọi màn hình có Sidebar (`SCR-02..SCR-23` · nút icon `LogOut`) | Thẻ `.logout-account` (avatar + tên + vai trò), đoạn `Phiên làm việc hiện tại sẽ kết thúc và các thay đổi chưa lưu sẽ không được giữ lại.`; nếu đang ở `/doctor/telehealth` hoặc `/patient/telehealth` hiện thêm `Notice warn`: `Đang trong trang khám trực tuyến: Đăng xuất chỉ rời cuộc gọi trên thiết bị này, không tự kết thúc phiên khám. Bác sĩ cần chọn “Kết thúc phiên” để đóng phiên cho cả hai bên.`; nút **Ở lại** + **Đăng xuất**. |
| **Modal `SCR-09/20` (Ngày)** | Modal `Chi tiết {Thứ, ngày}` & Form `Đăng ký ca làm việc` (`Schedule.tsx`) | `SCR-09`, `SCR-20` · bấm ô ngày (`.weekday-clickable` / `.wd-head`) | Hiển thị thanh `DayTimeline` (`08:00–17:00`), `Giờ hoạt động 08:00–17:00`, danh sách `Ca làm việc (n)` và `Thời gian nghỉ (n)`, nút **+ Thêm ca làm việc**. Bấm **+ Thêm ca làm việc** mở form `Đăng ký ca làm việc` (nút **Thu gọn**, `Ngày làm việc *`, `Hình thức khám *`, preset `Ca sáng 08:00–12:00` / `Ca chiều 13:00–17:00`, `Giờ bắt đầu ca *`, `Giờ kết thúc ca *`, `Phút mỗi lượt khám *`, tóm tắt `08:00–12:00 · 240 phút · 12 lượt khám dự kiến`, nút **+ Thêm ca làm việc**). |
| **Modal `SCR-09/20` (Ca)** | Modal `Chi tiết ca làm việc`, Form `Thêm thời gian nghỉ` & `Xóa ca làm việc?` | `SCR-09`, `SCR-20` · bấm thẻ ca (`.wblock.schedule-event`) | Hiển thị ngày, giờ ca, `Trực tiếp/Từ xa · {slot} phút/lượt · {N} lượt dự kiến`, thanh `DayTimeline`, danh sách `Thời gian nghỉ trong ca (n)` (nút **Hủy nghỉ**), `Notice info`, chân modal có nút đỏ **Xóa ca** (mở `ConfirmDialog` **`Xóa ca làm việc?`**) và nút **Thêm thời gian nghỉ** (mở form `Nghỉ từ *`, `Đến *`, **Lưu thời gian nghỉ**, **Hủy**). |
| **Modal `SCR-12`** | Hộp thoại `Hoàn tất ca khám?` (`Consultation.tsx`) | `SCR-12` · nút **Hoàn tất ca khám** (khi bệnh án đã `FINAL`) | Thông điệp `Ca khám chuyển sang “Hoàn tất” và không thể mở lại.`; nút **Quay lại** + **Hoàn tất**. |
| **Modal `SCR-13`** | Hộp thoại `Kết thúc phiên khám từ xa?` (`TelehealthRoom.tsx`) | `SCR-13` · nút đỏ **Kết thúc phiên** trên thanh `.controls` | Thông điệp `Phòng sẽ đóng ngay và không cấp token mới. Việc hoàn tất bệnh án và lần khám vẫn cần thực hiện riêng.`; nút **Quay lại** + **Kết thúc phiên**. |
| **Modal `SCR-16`** | Hộp thoại `Bỏ qua lượt này?` (`staff/Queue.tsx`) | `SCR-16` · nút đỏ **Bỏ qua lượt** trên thẻ `.qcard` (`CALLED`) | Thông điệp `Phiếu #{position} sẽ quay lại trạng thái chờ ở cuối hàng đợi (giữ nguyên phiếu).`; textarea bắt buộc `Lý do *`; nút **Quay lại** + **Đưa về cuối hàng**. |
| **Modal `SCR-17`** | Modal `Chi tiết thông báo` (`Notifications.tsx`) | `SCR-17` · nút **Chi tiết** trên từng dòng bảng thông báo | Hiển thị `DetailList`: `Mã job`, `Sự kiện`, `Lịch hẹn` (`LH-… (UUID)`), `Trạng thái gửi` (`Pill`), `Số lần thử`, `Đến hạn`, `Lỗi gần nhất`, `Giờ khám`, `Bác sĩ`, `Hình thức`, `Trạng thái lịch` (`StatusPill`); chân modal có nút **Đóng**. |
| **Modal `SCR-18`** | Modal `Thêm chuyên khoa` / `Cập nhật chuyên khoa` (`Specialties.tsx`) | `SCR-18` · nút **`+`** (`Thêm chuyên khoa`) hoặc nút **Sửa** | Ô `Tên chuyên khoa *`; khi cập nhật có thêm công tắc `.clinic-switch` (`Đang hoạt động` / `Ngừng hoạt động`); chân modal có nút **Hủy** + **Lưu**. |
| **Modal `SCR-19`** | Modal `Thêm nhân sự` / `Cập nhật nhân sự` (`Permissions.tsx`) | `SCR-19` · nút **`+`** (`Thêm nhân sự`) hoặc nút **Sửa** | **Thêm mới:** `Username *`, `Email *`, `Họ tên *`, `Mật khẩu tạm thời *` (hint `Ít nhất 12 ký tự. Nhân sự phải đổi mật khẩu khi đăng nhập lần đầu.`), `Vai trò nhân sự` (4 checkbox `Bác sĩ`, `Lễ tân`, `Quản trị viên`, `Kiểm toán viên`), `Chuyên khoa` (checkbox khi chọn `Bác sĩ`). **Cập nhật:** `Họ tên *`, `Trạng thái tài khoản` (`Đang hoạt động` / `Vô hiệu hóa`), `Vai trò nhân sự`, công tắc `.clinic-switch` (`Đang nhận lịch mới` / `Tạm ngưng nhận lịch`), `Chuyên khoa`; nút **Hủy** + **Lưu**. |
| **Modal `SCR-23`** | Modal `Chi tiết sự kiện kiểm toán` & Modal `Chính sách lưu trữ & Niêm phong kiểm toán` (`Audit.tsx`) | `SCR-23` · nút **Chi tiết** từng dòng bảng hoặc nút **Chính sách lưu trữ** trên thanh đầu trang | **Chi tiết sự kiện:** hiển thị đủ 36 ký tự UUID cho `Mã sự kiện`, `Tác nhân` (kèm nhãn an toàn & loại), `Đối tượng` (kèm ngữ cảnh/`Chính mình`), `Correlation ID` (mỗi trường có nút **Sao chép** và **Truy vết**), hành động tiếng Việt + mã chuẩn, thời điểm VN & UTC và khối `Chuỗi băm toàn vẹn` (`#chainSeq`, `event_hash`, `prev_hash`). **Lưu trữ & niêm phong:** hiển thị chính sách `365/1.825` ngày (`APPEND_ONLY_NO_APP_DELETE`), form niêm phong lô mới (`POST /audit-events/archive`) và bảng các lô đã niêm phong gần đây. |

---

## 3. Wireframe mức thấp các luồng cốt lõi (Chuẩn giao diện thật — Ghi chú mã màn ở ngoài khung)

> **Quy tắc trình bày trên Figma & Wireframe:** Bên trong khung màn hình chỉ hiển thị đúng thành phần giao diện thật của ứng dụng (không chèn mã `SCR-xx` / `DLG-xx` hay mũi tên `(→ SCR-xx)` vào Topbar, Sidebar hoặc nhãn nút). Mọi mã định danh màn hình, route và ghi chú nối dây prototype được đặt ở thanh chú thích **bên ngoài khung màn hình**.

### 3.1. Wireframe Đặt lịch 3 bước & Trạng thái Thành công — Ghi chú ngoài khung: `SCR-04A` / `SCR-04` / `SCR-04B` (`/patient/booking`)
```text
[Chú thích ngoài khung: SCR-04 · /patient/booking · PATIENT · FR-07, FR-08 · UC-07, UC-08]
┌─ Topbar ───────────────────────────────────────────────────────────────────────┐
│ Đặt lịch khám                                 [● 08:55:00 19/11/2026] [Bệnh nhân]│
├─ Nội dung chính (.content) ────────────────────────────────────────────────────┤
│ DỊCH VỤ KHÁM                                                                   │
│ Chọn chuyên khoa, bác sĩ và khung giờ còn trống.                               │
│ ┌─ Panel chính (.booking left) ──────────────────┐ ┌─ Tóm tắt lịch khám ─────┐ │
│ │ (✓ Chuyên khoa & bác sĩ) (● 2 Thời gian khám)  │ │ Bác sĩ    BS. Nguyễn... │ │
│ │                          (3 Xác nhận)          │ │ Chuyên khoa     Da liễu │ │
│ │ Chọn thời gian khám                            │ │ Ngày         19/11/2026 │ │
│ │ [Trực tiếp | Từ xa]   Ngày khám [19/11/2026]   │ │ Giờ               09:30 │ │
│ │ Khung giờ còn trống                            │ │ Hình thức Khám trực tiếp│ │
│ │ [09:00] [09:15] [● 09:30] [09:45] [10:00]      │ │ ⓘ Bạn có thể đổi hoặc   │ │
│ │ [← Quay lại]                      [Tiếp tục →] │ │ hủy trước ít nhất 2 giờ.│ │
│ └────────────────────────────────────────────────┘ └─────────────────────────┘ │
│ ┌─ Trạng thái sau khi bấm "Xác nhận đặt lịch" (Panel.success) ───────────────┐ │
│ │                           (✓) Đặt lịch thành công                          │ │
│ │   Mã lịch hẹn: LH-45D5088B | Thời gian: 09:30 · 19/11/2026                 │ │
│ │   Bác sĩ: BS. Nguyễn Minh An | Hình thức: Khám trực tiếp                   │ │
│ │                  [Về tổng quan]   [Xem lịch của tôi]                       │ │
│ └────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2. Wireframe Khám bệnh, Bệnh án, Đơn thuốc & Phòng từ xa — Ghi chú ngoài khung: `SCR-12` & `SCR-13`
```text
[Chú thích ngoài khung: SCR-12 · /doctor/consultation/:appointmentId · DOCTOR · FR-11..14, FR-17]
┌─ Topbar ───────────────────────────────────────────────────────────────────────┐
│ Khám bệnh & kê đơn                            [● 09:10:00 19/11/2026] [Bác sĩ] │
├─ Nội dung chính (.content) ────────────────────────────────────────────────────┤
│ ┌─ Panel thông tin ca khám ──────────────────────────────────────────────────┐ │
│ │ Lịch hẹn: LH-45D5088B | Bệnh nhân: BN-F870FE91 | Giờ hẹn: 19/11/2026 09:00 │ │
│ │ Hình thức: Trực tiếp  | Trạng thái: [● Đang khám]                          │ │
│ │ [✓ Hoàn tất ca khám]  Cần hồ sơ ở trạng thái FINAL để hoàn tất ca khám.    │ │
│ └────────────────────────────────────────────────────────────────────────────┘ │
│ Tab: [Bệnh án]   [Đơn thuốc]   [Lịch sử (1)]                                   │
│ ┌─ Panel Bệnh án ──────────────────────────────────── [● Bản nháp · v1] ─────┐ │
│ │ Triệu chứng / Huyết áp (mmHg) / Nhịp tim / Nhiệt độ / Cân nặng / Chiều cao │ │
│ │ Chẩn đoán * / Hướng điều trị / lời dặn * / Ghi chú                         │ │
│ │ [Lưu nháp]   [✓ Hoàn tất hồ sơ]   (Khi FINAL: [Chỉnh sửa bổ sung])         │ │
│ └────────────────────────────────────────────────────────────────────────────┘ │
│ ┌─ Panel Kê đơn thuốc (Tab Đơn thuốc) ─────────────── [● Bản nháp] ──────────┐ │
│ │ ┌─ Thuốc 1 ──────────────────────────────────────────────────────────────┐ │ │
│ │ │ Tên thuốc * | Liều dùng * | Đường dùng * | Tần suất * | Thời gian dùng *│ │ │
│ │ └────────────────────────────────────────────────────────────────────────┘ │ │
│ │ [+ Thêm thuốc]   [Lưu nháp]   [Phát hành đơn]                              │ │
│ └────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 3.3. Wireframe Tiếp đón, Báo chậm & Vắng mặt — Ghi chú ngoài khung: `SCR-15`, `DLG-03`, `DLG-04`
```text
[Chú thích ngoài khung: SCR-15 · /staff/reception · RECEPTIONIST · Mở overlay DLG-03 & DLG-04]
┌─ Topbar ───────────────────────────────────────────────────────────────────────┐
│ Tiếp đón / Check-in                           [● 08:55:00 19/11/2026] [Lễ tân] │
├─ Panel danh sách tiếp đón ─────────────────────────────────────────────────────┤
│ [🔍 Mã lịch, mã bệnh nhân, bác sĩ…] [19/11/2026] [Bác sĩ ▾] [Trạng thái ▾]     │
│                                                  [Hình thức ▾] [↻ Làm mới]     │
│ GIỜ   | MÃ LỊCH     | BỆNH NHÂN   | BÁC SĨ            | HÌNH THỨC | TRẠNG THÁI │
│ 09:00 | LH-45D5088B | BN-F870FE91 | BS. Nguyễn Minh An| Trực tiếp | Đã xác nhận│
│       └── Thao tác: [✓ Check-in] [✉ Báo chậm] [✗ Vắng mặt]                     │
│ 11:40 | LH-992FAECE | BN-00000003 | BS. Võ Thanh Tâm  | Trực tiếp | Đã xác nhận│
│       └── Thao tác: [✓ Check-in (disabled)] [✉ Báo chậm] Ngoài khung giờ (-15'…+15')│
└────────────────────────────────────────────────────────────────────────────────┘
```

### 3.4. Wireframe Lịch làm việc, Quản trị chuyên khoa/nhân sự, Giờ hoạt động & Kiểm toán — Ghi chú ngoài khung: `SCR-09/20`, `SCR-18/19`, `SCR-21/22`, `SCR-23`
```text
[Chú thích ngoài khung: Modal SCR-09/20 · Chi tiết ngày & Đăng ký ca làm việc / Chi tiết ca làm việc]
┌─ Modal: Chi tiết Thứ Năm, 26 tháng 11, 2026 ────────────────────────────── [×] ┐
│ Dòng thời gian (.day-tl): 08:00 ─── 10:00 ─── 12:00 ─── 14:00 ─── 16:00 ─ 17:00│
│ Giờ hoạt động 08:00–17:00                                                      │
│ ┌─ Đăng ký ca làm việc ─────────────────────────────────────────── [Thu gọn] ┐ │
│ │ Ngày làm việc * [26/11/2026]          Hình thức khám * [Trực tiếp ▾]       │ │
│ │ [Ca sáng 08:00–12:00]  [Ca chiều 13:00–17:00]  Có thể chỉnh giờ bên dưới.  │ │
│ │ Giờ bắt đầu ca * [08:00] | Giờ kết thúc ca * [12:00] | Phút/lượt * [20]    │ │
│ │ 08:00–12:00 · 240 phút · 12 lượt khám dự kiến          [+ Thêm ca làm việc]│ │
│ └────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────┘

[Chú thích ngoài khung: Modal SCR-18 (Chuyên khoa), Modal SCR-19 (Nhân sự), Modal SCR-17 & SCR-23 (Chi tiết)]
┌─ Modal: Cập nhật nhân sự (SCR-19) ──── [×] ┐ ┌─ Modal: Chi tiết sự kiện kiểm toán (SCR-23) [×] ┐
│ Họ tên * [Nguyễn Minh An                 ] │ │ Thời gian      15:17:36 22/11/2026 (VN + UTC)   │
│ Trạng thái tài khoản [Đang hoạt động    ▾] │ │ Hành động      Xem hồ sơ cá nhân (PROFILE_READ) │
│ Vai trò: [☑ Bác sĩ] [☐ Lễ tân] [☐ QT] [☐ KT]│ │ Kết quả        [● Thành công]                   │
│ [● Đang nhận lịch mới]                     │ │ Tác nhân       auditor · 0000…0006 [Sao chép]   │
│ Chuyên khoa: [☑ Da liễu] [☑ Nội tổng quát] │ │ Đối tượng      [Chính mình] 0000…06 [Truy vết]  │
│                              [Hủy]   [Lưu] │ │ Chuỗi băm      #42 · HMAC-SHA256 [Sao chép]     │
└────────────────────────────────────────────┘ └─────────────────────────────────────────────────┘

[Chú thích ngoài khung: SCR-21 · /admin/clinic-hours & SCR-22 · /admin/patient-accounts]
┌─ Panel Lịch hoạt động hằng tuần (Mở 6/7 ngày · Tổng 54 giờ/tuần) [● Đang áp dụng]┐
│ [Thứ Hai: Hoạt động ● | Mở cửa 08:00 | Đóng cửa 17:00] ... [Chủ nhật: Nghỉ ○]    │
│ [Lưu giờ hoạt động]   (Khi sửa: [● Chưa lưu] + [↺ Bỏ thay đổi])                  │
├─ Panel Ngày nghỉ lễ & lịch đặc biệt ─────────────────── [0 ngày] [Thiết lập ngày lễ]┤
│ Từ ngày [dd/mm/yyyy] Đến ngày [dd/mm/yyyy] [Tên dịp lễ…] [Nghỉ cả ngày ▾] [+ Thêm]│
└──────────────────────────────────────────────────────────────────────────────────┘
┌─ Panel Tra cứu tài khoản (/admin/patient-accounts) ──────────────────────────────┐
│ Mã tài khoản, email hoặc số điện thoại: [patient3@example.test        ] [Tra cứu]│
├─ Panel Kết quả tra cứu ──────────────────────────────────────────────────────────┤
│ Tên hiển thị: Hoàng Minh Trần | Mã tài khoản: 1b0f18cb-da76-3037-b87f-14f1f870fe91│
│ Trạng thái: [● Đang hoạt động]                                 [🔒 Khóa tài khoản]│
└──────────────────────────────────────────────────────────────────────────────────┘
```
