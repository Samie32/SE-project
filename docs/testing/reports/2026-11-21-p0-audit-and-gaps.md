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

### 2.3 Hạng mục quy trình, CI/CD và vận hành (còn mở theo phạm vi P1/P2)
1. **Đã bổ sung cơ chế bảo vệ khi deploy & gateway (21/11/2026):**
   - **Rollback tự động khi deploy lỗi:** `scripts/deploy-azure-demo.sh` lưu lại commit đã xác minh trước đó (`prev_sha`); nếu bước dựng container, cấu hình Keycloak hoặc kiểm tra sức khỏe thất bại, script tự `git reset --hard "$prev_sha"`, khôi phục dịch vụ cũ (`CLINICCARE_DEPLOY_ROLLED_BACK`) và trả mã lỗi để CI báo đỏ.
   - **Smoke test tự động sau deploy trên VM thật:** job `post-deploy-smoke` trong `.github/workflows/deploy-azure-demo.yml` chạy `scripts/verify-live-demo.py` kiểm tra trực tiếp HTTP 200, security headers (`AGENT-TC-009`), chặn ẩn danh `/api/me/profile` (`401`), chặn Direct Access Grants (`AGENT-TC-008`) và từ chối redirect URI lạ (`AGENT-TC-007`), đồng thời hỗ trợ `--update-catalog` cập nhật tự động sổ kiểm thử cục bộ.
   - **Rate-limit OTP theo IP ở tầng gateway:** `frontend/nginx.conf` áp `limit_req_zone ... rate=10r/m` (`burst=5 nodelay`, trả `429`) cho `location = /api/me/contact/otp` bên cạnh kiểm soát theo `actorId` và `emailHash` ở backend.
2. **Hạng mục CI/CD còn mở:** Playwright, k6, axe, quét phụ thuộc (`Dependabot` / `npm audit`), `CodeQL` / secret scanning và cổng `jacoco:check` chưa đưa vào CI.
3. **Vận hành Azure VM còn mở:** Keycloak đang chạy `KC_DB: dev-file` thay vì CSDL chuyên dụng (giữ nguyên cho bản demo để không làm mất dữ liệu tài khoản hiện có trong `keycloak-data`); chưa có giám sát/cảnh báo tập trung (Prometheus/Grafana).
4. **Phạm vi mở rộng (chưa triển khai theo quyết định giữ phạm vi):** Tài khoản người phụ thuộc/giám hộ, nhắc lịch SMS/Zalo, xác minh OTP số điện thoại, trang quản trị bảo mật chuyên sâu, công cụ xuất/xóa dữ liệu theo yêu cầu tuân thủ dữ liệu cá nhân.
