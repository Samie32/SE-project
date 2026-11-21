# Báo cáo rà soát P0, kiểm thử bổ sung và các hạng mục chưa đạt (21/11/2026)

Nền mã nguồn: `main@7c847d4` + các sửa đổi P0 trong workspace (chưa push git). Báo cáo này tổng hợp trung thực các lỗi kỹ thuật P0 đã khắc phục, tài liệu đã đồng bộ lượng hóa và **danh sách lọc kỹ những gì chưa đạt hoặc chưa nghiệm thu**.

## 1. Các hạng mục P0 đã khắc phục và xác minh

| Hạng mục | Thay đổi đã thực hiện | Kết quả xác minh |
|---|---|---|
| **Tách cờ OTP khỏi thông báo** | Thêm `clinic.contact-otp-required` (`CONTACT_OTP_REQUIRED`, mặc định `true`) trong `application.yml` và `ContactOtpService`, tách hoàn toàn khỏi `clinic.notifications-enabled`. | **Đạt** ở `ContactOtpServiceTest` (5/5 test). Tích hợp MySQL với `notifications-enabled=false` đã viết trong `PatientAccountIntegrationTest`, chờ Docker/CI chạy. |
| **Lưu OTP bền vững trong MySQL** | Tạo migration `V9__contact_otp.sql` (`contact_otp`, `contact_otp_send_log`), tách `ContactOtpService.OtpStore` và triển khai `JdbcContactOtpStore`; cập nhật `TransientDataCleanup` dọn bản ghi hết hạn. | Biên dịch sạch (`mvnw test-compile`); thực thi SQL/Flyway chờ Docker/CI. |
| **Chống spam OTP theo email đích** | Chặn gửi lại cùng email đích trong `30 s` và giới hạn tối đa `5 lượt / 3600 s` qua mọi tài khoản. | **Đạt** (`enforcesTargetEmailCooldownAndHourlyRateLimitAcrossActors` trong `ContactOtpServiceTest`). |
| **Tách khóa HMAC blind index** | `Crypto.java` dẫn xuất khóa riêng $K_{\text{hmac}} = \text{HMAC-SHA256}(K, \text{"cliniccare:blind-index:v1"})$; thêm `ContactHashSync` tự đồng bộ `email_hash`/`phone_hash` cho dữ liệu hiện có khi khởi động. | **Đạt** (`cryptoHashUsesDomainSeparatedKey` trong `ContactOtpServiceTest`). |
| **Test giao diện mới (`AccountPage`, `Guard`)** | Thêm `frontend/tests/account-page.test.tsx` (2 test) và `frontend/tests/guard-redirect.test.tsx` (2 test). | **Đạt** trong `npm run typecheck && npm test && npm run build`: **21/21 file (78/78 test)**, build `1,93 s`. |
| **Đồng bộ & lượng hóa tài liệu** | Tạo [công thức và lượng hóa nghiệp vụ](../../design/business-formulas-and-quantification.md); cập nhật `functional-requirements.md`, `business-rules.md`, `acceptance-criteria.md`, `non-functional-requirements.md`, `traceability-matrix.md`, `integration-contract.md`, `security.md`, `data-dictionary.md`, `use-cases.md`, `deploy-internet-demo.md`, `test-cases.md`, sổ test agent. | Đối chiếu cấu trúc YAML/JSON khớp **50 đường dẫn / 61 thao tác**, phủ đủ `FR-01..FR-27`. |
| **Mật khẩu demo (rủi ro chấp nhận)** | Giữ nguyên fallback `DemoClinic` trong `scripts/prepare-internet.py` cho bản demo dữ liệu giả; ghi rõ vào mục *Rủi ro đã chấp nhận* trong `non-functional-requirements.md`, `security.md`, `deploy-internet-demo.md`. | Đạt kiểm thử `test_internet_demo_passwords.py` (2/2). |

## 2. Những gì CHƯA ĐẠT hoặc CHƯA NGHIỆM THU (đã lọc kỹ)

### 2.1 Chưa chạy được trên máy cục bộ (thiếu môi trường)
1. **Toàn bộ kiểm thử tích hợp MySQL (`mvnw verify`, gồm `PatientAccountIntegrationTest` mới):** Docker không chạy trên máy cục bộ (`docker info` trả mã 1) nên Testcontainers MySQL 8.4 không khởi động (`AGENT-TC-015` ghi trạng thái **`BLOCKED`**). Migration `V9__contact_otp.sql`, `JdbcContactOtpStore`, `ContactHashSync` và luồng tích hợp OTP/lookup **chỉ mới biên dịch sạch**, cần xác nhận qua GitHub Actions job `backend` khi push hoặc sau khi bật Docker Desktop.
2. **Kiểm tra đầy đủ `scripts/check-api-contract.py`:** Máy cục bộ thiếu gói `openapi_spec_validator` / `jsonschema`. Đã kiểm tra parity đường dẫn/tham số/schema bằng Python + `PyYAML` (0 lỗi), còn kiểm tra schema Draft 2020-12 đầy đủ chờ CI job `api-contract`.
3. **5 ca `scripts/tests/test_azure_deploy_scope.py`:** Tự động bỏ qua trên Windows vì cần công cụ POSIX (`flock`), chỉ chạy trên runner Linux.

### 2.2 Chưa nghiệm thu theo đặc tả NFR / AC
1. **NFR-01 (Tải chuẩn):** Chưa chạy kịch bản **50 người dùng đồng thời, 10.000 lịch hẹn mô phỏng trong 15 phút (đọc + ghi)**. Kết quả k6 ngày 19/11 mới kiểm tra 10 VU trong 2 phút và ghi nhận 1 ngoại lệ trễ tới **24,37 giây** chưa điều tra nguyên nhân.
2. **NFR-06 (Sao lưu & phục hồi):** Chưa có lần diễn tập sao lưu/phục hồi thực tế cho MySQL và volume `keycloak-data` kèm kiểm chứng khóa ngoại.
3. **NFR-08 (`TC-N05` — Khả năng sử dụng):** Chưa thực hiện thử nghiệm đo thời gian (mục tiêu $\ge 4/5$ người hoàn thành $\le 3$ phút) với 5 người tham gia.
4. **NFR-09 (`AGENT-TC-001` — Mất mạng UI):** Chưa có kiểm thử tự động hoặc biên bản đo ngưỡng $\le 10\text{ s}$ khi mất kết nối ở UI đặt lịch/hồ sơ (mới kiểm WebRTC fixture).
5. **NFR-11 (Bao phủ unit riêng cho logic nghiệp vụ & bao phủ nhánh):** Báo cáo ngày 19/11 đo trên bộ tổng hợp đạt **78,25% dòng** nhưng **59,41% nhánh** (`< 60%`), và chưa tách phép đo riêng cho unit test nghiệp vụ; gói `config` (`35%`) và `catalog` (`53%`) còn thấp (theo snapshot `jacoco.csv` ngày 16/11).
6. **Luồng E2E thực tế chưa có kiểm thử tự động trên `main`:**
   - Đăng nhập **Google OAuth2** (`TC-01-C`), **Quên mật khẩu qua email** (`TC-01-D`, bộ `password-recovery.spec.ts` / `test_keycloak_recovery.py` vẫn nằm ở nhánh `prepare/main-cliniccare-20261119`), và **khóa tạm brute-force 5 lần sai** (`TC-01-E`) chưa có bằng chứng chạy tự động trên môi trường thật.
   - Khám trực tiếp và phát hành đơn thuốc E2E xuyên UI; WebRTC hai thiết bị qua hai mạng khác nhau có ép `ICE_POLICY=relay` qua TURN (`deploy-internet-demo.md`).
   - `AC-24-E` (provider webhook và outbox đóng phòng phía server): nằm ngoài giới hạn thiết kế P2P hiện có (đã ghi rõ trong `integration-contract.md`).

### 2.3 Hạng mục quy trình, CI/CD và vận hành (thuộc P1/P2, chưa thực hiện)
1. **Quy trình Git & CI:** Chưa bật *Branch Protection* trên GitHub (vẫn có thể push thẳng lên `main`); Playwright, k6, axe, quét phụ thuộc (`Dependabot` / `npm audit`), `CodeQL` / secret scanning và `jacoco:check` chưa đưa vào CI; chưa có bước smoke test tự động sau deploy để cập nhật `AGENT-TC-009` sau mỗi bản phát hành.
2. **Vận hành Azure VM:** Keycloak đang chạy `KC_DB: dev-file` thay vì CSDL chuyên dụng; chưa có giám sát/cảnh báo tập trung và kịch bản rollback tự động; giới hạn tần suất (rate-limit) OTP hiện bảo vệ theo `actorId` và `emailHash` chứ chưa giới hạn theo IP ở tầng gateway; màn hình chọn tài khoản Google chưa xác minh thương hiệu (`Branding verification`) do dùng domain `duckdns.org`.
3. **Phạm vi mở rộng (chưa triển khai theo quyết định giữ phạm vi):** Tài khoản người phụ thuộc/giám hộ, nhắc lịch SMS/Zalo, xác minh OTP số điện thoại, trang quản trị bảo mật chuyên sâu, công cụ xuất/xóa dữ liệu theo yêu cầu tuân thủ dữ liệu cá nhân.
