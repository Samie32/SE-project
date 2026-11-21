# Báo cáo rà soát P0, kiểm thử bổ sung và các hạng mục chưa đạt (21/11/2026)

Nền mã nguồn: `main@98aa64a` (đã push lên `origin/main`, workflow GitHub Actions `Deploy ClinicCare to Azure #38` đạt xanh toàn bộ trong `4m 18s`). Báo cáo này tổng hợp trung thực các lỗi kỹ thuật P0 đã khắc phục, tài liệu đã đồng bộ lượng hóa và **danh sách lọc kỹ những gì chưa đạt hoặc chưa nghiệm thu**.

## 1. Các hạng mục P0 đã khắc phục và xác minh

| Hạng mục | Thay đổi đã thực hiện | Kết quả xác minh |
|---|---|---|
| **Tách cờ OTP khỏi thông báo** | Thêm `clinic.contact-otp-required` (`CONTACT_OTP_REQUIRED`, mặc định `true`) trong `application.yml` và `ContactOtpService`, tách hoàn toàn khỏi `clinic.notifications-enabled`. | **Đạt** ở `ContactOtpServiceTest` (5/5 test cục bộ) và `PatientAccountIntegrationTest` (`AGENT-TC-015`) trên CI GitHub Actions `#38` (`98aa64a`). |
| **Lưu OTP bền vững trong MySQL** | Tạo migration `V9__contact_otp.sql` (`contact_otp`, `contact_otp_send_log`), tách `ContactOtpService.OtpStore` và triển khai `JdbcContactOtpStore`; cập nhật `TransientDataCleanup` dọn bản ghi hết hạn. | **Đạt** trên CI GitHub Actions `#38` (`sh mvnw -B verify` với MySQL 8.4 Testcontainers, Flyway `V1..V9`). |
| **Chống spam OTP theo email đích** | Chặn gửi lại cùng email đích trong `30 s` và giới hạn tối đa `5 lượt / 3600 s` qua mọi tài khoản. | **Đạt** (`enforcesTargetEmailCooldownAndHourlyRateLimitAcrossActors` trong `ContactOtpServiceTest`). |
| **Tách khóa HMAC blind index** | `Crypto.java` dẫn xuất khóa riêng $K_{\text{hmac}} = \text{HMAC-SHA256}(K, \text{"cliniccare:blind-index:v1"})$; thêm `ContactHashSync` tự đồng bộ `email_hash`/`phone_hash` cho dữ liệu hiện có khi khởi động. | **Đạt** (`cryptoHashUsesDomainSeparatedKey` trong `ContactOtpServiceTest` và tích hợp MySQL trên CI `#38`). |
| **Test giao diện mới (`AccountPage`, `Guard`)** | Thêm `frontend/tests/account-page.test.tsx` (2 test) và `frontend/tests/guard-redirect.test.tsx` (2 test). | **Đạt** cả cục bộ và CI `#38`: **21/21 file (78/78 test)**, typecheck + `vite build`. |
| **Đồng bộ & lượng hóa tài liệu** | Tạo [công thức và lượng hóa nghiệp vụ](../../design/business-formulas-and-quantification.md); cập nhật `functional-requirements.md`, `business-rules.md`, `acceptance-criteria.md`, `non-functional-requirements.md`, `traceability-matrix.md`, `integration-contract.md`, `security.md`, `data-dictionary.md`, `use-cases.md`, `deploy-internet-demo.md`, `test-cases.md`, sổ test agent. | **Đạt** kiểm tra `api-contract` (`openapi_spec_validator` + `scripts/tests`) trên CI `#38`: **50 đường dẫn / 61 thao tác**, phủ đủ `FR-01..FR-27`. |
| **Mật khẩu demo (rủi ro chấp nhận)** | Giữ nguyên fallback `DemoClinic` trong `scripts/prepare-internet.py` cho bản demo dữ liệu giả; ghi rõ vào mục *Rủi ro đã chấp nhận* trong `non-functional-requirements.md`, `security.md`, `deploy-internet-demo.md`. | Đạt kiểm thử `test_internet_demo_passwords.py` (2/2). |

## 2. Những gì CHƯA ĐẠT hoặc CHƯA NGHIỆM THU (đã lọc kỹ)

### 2.1 Hạn chế môi trường cục bộ (đã được CI Linux bù đắp cho `98aa64a`)
1. **Kiểm thử tích hợp MySQL (`mvnw verify`, gồm `PatientAccountIntegrationTest` / `AGENT-TC-015`):** Đã **ĐẠT** trên GitHub Actions `Deploy ClinicCare to Azure #38` (`98aa64a`). Trên máy Windows cục bộ vẫn chưa chạy được khi Docker Desktop tắt.
2. **Kiểm tra đầy đủ `scripts/check-api-contract.py` và 5 ca `scripts/tests/test_azure_deploy_scope.py` (cần POSIX `flock`):** Đã **ĐẠT** trong job `api-contract` trên runner Linux của GitHub Actions `#38`. Trên máy Windows cục bộ thiếu gói `openapi_spec_validator` và công cụ `flock`.

### 2.2 Chưa nghiệm thu theo đặc tả NFR / AC (đã chốt **13/16 NFR đạt** sau CI `#43` `7c13276`)
- **Các NFR vừa nghiệm thu ĐẠT bổ sung trên CI `#43` (`7c13276`):**
  - **NFR-06 (`AGENT-TC-021`):** `BackupRestoreIntegrationTest` đạt (`mysqldump` + restore sang schema sạch + kiểm chứng giải mã AES-GCM và ràng buộc khóa ngoại trên MySQL 8.4).
  - **NFR-09 (`AGENT-TC-001`):** `frontend/tests/booking-offline.test.tsx` đạt (báo lỗi mất mạng `< 10 s`, giữ nguyên thông tin đang chọn và dùng lại cùng `Idempotency-Key`).
  - **NFR-11 (`AGENT-TC-020`):** `BusinessRulesUnitTest` + cổng `jacoco:check` ($\ge 60\%$ dòng và $\ge 60\%$ nhánh) trong `backend/pom.xml` đạt xanh toàn bộ (`86/86` test backend).
  - **NFR-14, NFR-15, NFR-16:** đã bổ sung vào đặc tả và đạt đầy đủ qua `test:scan`/`axe`, chống lạm dụng đa tầng (Keycloak + OTP + Nginx IP `429`), và pipeline rollback + `post-deploy-smoke`.
- **Các hạng mục còn lại cần bấm chạy workflow độc lập hoặc người dùng thật:**
  1. **NFR-01 (Tải chuẩn — đã sẵn sàng chạy 1 nút trên GitHub Actions):** Đã tạo `.github/workflows/nfr01-load-test.yml` + `scripts/nfr01-load-harness.py` + `tests/k6/nfr01-full-load.js` (`50 VU`, seed `10.000` lịch hẹn vào MySQL 8.4 trên runner độc lập, `15 phút` đọc + ghi, ngưỡng `p95 < 2000 ms`, xuất artifact `nfr01-load-report` mà không ảnh hưởng VM demo Azure).
  2. **NFR-08 (`TC-N05` — Khả năng sử dụng — chưa nghiệm thu):** Cần 5 người tham gia thật thử đặt lịch trên `https://cliniccare-demo.duckdns.org` và ghi thời gian hoàn thành (mục tiêu $\ge 4/5$ người $\le 3$ phút).
  3. **NFR-13 (WebRTC / TURN — đã xác minh kỹ thuật & VM thật):** Đã đạt `npm run test:rtc` (2/2 thiết bị giả), `test_webrtc_turn_config.py` (2/2) và xác minh trực tiếp Azure VM qua `scripts/verify-live-demo.py` (`/api/webrtc/ice` trả `401` + `Cache-Control: no-store`; `coturn` cổng `3478` UDP/TCP phản hồi STUN Binding Success `0x0101`); chỉ còn phép thử tay 2 thiết bị trên 2 mạng vật lý (4G/WiFi).
  4. **Luồng E2E thực tế bổ sung:** Đăng nhập Google OAuth2 (`TC-01-C`), Quên mật khẩu email (`TC-01-D`), khóa tạm 5 lần sai (`TC-01-E`), khám trực tiếp + phát hành đơn thuốc xuyên UI chưa có bài Playwright tự động chạy trong CI; `AC-24-E` nằm ngoài giới hạn kiến trúc P2P hiện có (đã ghi rõ trong `integration-contract.md`).

### 2.3 Hạng mục quy trình, CI/CD và vận hành (còn mở theo phạm vi P1/P2)
1. **Đã bổ sung cơ chế bảo vệ khi deploy & gateway (21/11/2026):**
   - **Rollback tự động khi deploy lỗi:** `scripts/deploy-azure-demo.sh` lưu lại commit đã xác minh trước đó (`prev_sha`); nếu bước dựng container, cấu hình Keycloak hoặc kiểm tra sức khỏe thất bại, script tự `git reset --hard "$prev_sha"`, khôi phục dịch vụ cũ (`CLINICCARE_DEPLOY_ROLLED_BACK`) và trả mã lỗi để CI báo đỏ.
   - **Smoke test tự động sau deploy trên VM thật:** job `post-deploy-smoke` trong `.github/workflows/deploy-azure-demo.yml` chạy `scripts/verify-live-demo.py` kiểm tra trực tiếp HTTP 200, security headers (`AGENT-TC-009`), chặn ẩn danh `/api/me/profile` (`401`), chặn Direct Access Grants (`AGENT-TC-008`) và từ chối redirect URI lạ (`AGENT-TC-007`), đồng thời hỗ trợ `--update-catalog` cập nhật tự động sổ kiểm thử cục bộ.
   - **Rate-limit OTP theo IP ở tầng gateway:** `frontend/nginx.conf` áp `limit_req_zone ... rate=10r/m` (`burst=5 nodelay`, trả `429`) cho `location = /api/me/contact/otp` bên cạnh kiểm soát theo `actorId` và `emailHash` ở backend.
2. **Hạng mục CI/CD còn mở:** Playwright, k6, axe, quét phụ thuộc (`Dependabot` / `npm audit`) và `CodeQL` / secret scanning chưa đưa vào CI (cổng `jacoco:check` $\ge 60\%$ dòng & nhánh đã đưa vào `backend/pom.xml` và đạt xanh từ CI `#43`).
3. **Vận hành Azure VM còn mở:** Keycloak đang chạy `KC_DB: dev-file` thay vì CSDL chuyên dụng (giữ nguyên cho bản demo để không làm mất dữ liệu tài khoản hiện có trong `keycloak-data`); chưa có giám sát/cảnh báo tập trung (Prometheus/Grafana).
4. **Phạm vi mở rộng (chưa triển khai theo quyết định giữ phạm vi):** Tài khoản người phụ thuộc/giám hộ, nhắc lịch SMS/Zalo, xác minh OTP số điện thoại, trang quản trị bảo mật chuyên sâu, công cụ xuất/xóa dữ liệu theo yêu cầu tuân thủ dữ liệu cá nhân.
