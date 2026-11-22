# Kiến trúc hệ thống — High-Level Design

Kiến trúc được mô tả theo mô hình **Kruchten 4+1 Views**, sử dụng **React 18 + TypeScript 5**, **Java 21 / Spring Boot 3.5 modular monolith** và **MySQL 8.4 (InnoDB)**. Hợp đồng API tuân theo **OpenAPI 3.1.0** và lỗi chuẩn hóa **RFC 9457 (`ProblemDetail`)**.

## Quyết định chính

Một backend modular monolith Spring Boot (`HikariCP` pool tối đa 30 kết nối), frontend React + TypeScript đóng gói sau `Nginx 1.28`, lưu trữ MySQL 8.4 (`Flyway V1..V11`), phân lớp `Controller -> Service/Policy -> Repository (JdbcTemplate)`. Mỗi phân hệ sở hữu bảng dữ liệu riêng và giao tiếp qua dịch vụ thay vì sửa chéo bảng.

## Các góc nhìn kiến trúc 4+1

| Góc nhìn | Mô hình hoặc tài liệu | Nội dung |
|---|---|---|
| Logical | [Class](../class-diagram/class-diagram.png), [ERD](../database/erd.png) | 24 thực thể miền & quan hệ MySQL `V1..V11` |
| Process | [Auth/OTP](../sequence-diagrams/auth-otp-contact.png), [Booking](../sequence-diagrams/book-appointment.png), [Delay/NO_SHOW](../sequence-diagrams/delay-and-noshow.png), [Telehealth](../sequence-diagrams/telehealth.png) | Giao dịch `SELECT ... FOR UPDATE`, chống trùng lặp Idempotency, worker SMTP & P2P WebRTC |
| Development | Bảng 9 phân hệ `M01–M09` | Ranh giới module, DTO, khóa & phân quyền |
| Physical | [Docker local](deployment.png), [Azure VM Demo](deployment-azure.png) | Nginx rate-limit OTP `10r/m`, Caddy TLS/HSTS/CSP, Keycloak+Google, Brevo SMTP, `coturn` 3478 & CI auto-rollback |
| +1 Scenarios | [Use cases](../../analysis/use-cases.md), [Use Case UML](../use-case/use-case-diagram.png) | 27 Use Case (Cockburn + UML 2.5) dẫn dắt thiết kế và kiểm thử |

## Trách nhiệm và phụ thuộc (`M01–M09`)

| Phân hệ | Dữ liệu sở hữu | Phụ thuộc & điểm nhấn |
|---|---|---|
| M01 `auth` | `user_account`, `user_role`, `contact_otp`, `contact_otp_send_log` | OIDC PKCE + Google OAuth2; OTP 6 số đổi email; tra cứu `patient-accounts/lookup` qua blind index HMAC-SHA256 tách khóa; M07 audit |
| M02 `catalog` | `doctor`, `specialty`, `doctor_specialty` | M01; kiểm tra lịch hẹn hiệu lực trước khi ngừng nhận lịch / vô hiệu hóa bác sĩ |
| M03 `availability` | `clinic_hours`, `clinic_holiday`, `availability`, `time_off`, `slot` | M02; ưu tiên `clinic_holiday` trên `clinic_hours`; tối ưu index `V10`/`V11` giúp `GET /api/slots` đạt `p95 = 7,81 ms` |
| M04 `appointment` | `appointment`, `idempotency_record` | M01/M03/M07; khóa cố định `Doctor -> Patient`; sinh `notification_job` xác nhận & nhắc trước 30 phút |
| M05 `clinical` | `encounter`, `medical_record`, `prescription` | M04/M01/M07; mã hóa AES-256-GCM; trigger MySQL khóa bất biến bản `FINAL`/`ISSUED`; bổ sung tạo version mới |
| M06 `notification` | `notification_job` (kiêm transactional outbox) | Hàng đợi durable dùng `FOR UPDATE SKIP LOCKED` + lease 60s; `CONFIRMATION`, `REMINDER`, `DELAY_NOTICE`, `NO_SHOW_REBOOKING`; thử lại SMTP `+1/+5/+15` phút |
| M07 `audit/security` | `audit_event` | Trigger append-only cấm `UPDATE`/`DELETE`; fail-closed hoàn tác giao dịch nếu ghi audit lỗi |
| M08 `workflow` | `queue_ticket` | M04/M01/M07; check-in trực tiếp `[-15p, +15p)`; FIFO dưới khóa `Doctor`; hàng rỗng trả `204` |
| M09 `telehealth` | `telehealth_session`, `telehealth_token`, `telehealth_signal` | M04/M01/M07; signaling WebRTC nội bộ mã hóa AES-256-GCM; `X-Room-Token` SHA-256 TTL 300s; `coturn` STUN/TURN `:3478` |

## Tích hợp và bảo mật

- **Xác thực & Phiên:** OAuth2/OIDC Authorization Code + PKCE S256 trên Keycloak 26.4 (có Google OAuth2 broker, khóa tạm 60–900 giây sau 5 lần sai, Quên mật khẩu qua SMTP). Access token lưu trong bộ nhớ client; Backend kiểm tra chữ ký, issuer, audience và `user_account.active` ngay tại mỗi request (`403 Account disabled` tức thì khi bị khóa).
- **Bảo vệ dữ liệu nhạy cảm (PII/PHI):** Mã hóa ứng dụng AES-256-GCM (`content_encrypted`, `items_encrypted`, `email_encrypted`, `phone_encrypted`, `payload_encrypted`) và HMAC-SHA256 tách khóa (`email_hash`, `phone_hash`, `otp_hash`). Khóa nằm ngoài CSDL qua biến môi trường.
- **Khám từ xa P2P WebRTC:** Không lưu video/audio trên server. Client lấy cấu hình STUN/TURN tạm thời từ `/api/webrtc/ice` (`ice-config` dùng chung secret HMAC với `coturn:3478`), trao đổi SDP/ICE mã hóa qua `/api/telehealth-sessions/{id}/signals` (giới hạn `< 300` thông điệp/60s), hỗ trợ `ICE restart` và chế độ chỉ âm thanh.
- **An toàn phát hành & biên mạng Azure VM:** `Caddy 2` chấm dứt TLS và gắn header bảo mật (`HSTS`, `CSP`, `X-Frame-Options: DENY`, `nosniff`, `Permissions-Policy`); `Nginx` giới hạn `10r/m` (`burst=5`, HTTP `429`) trên endpoint gửi OTP; script `deploy-azure-demo.sh` tự động rollback về commit trước khi health check thất bại và job `post-deploy-smoke` xác minh cả HTTP/TLS lẫn STUN `:3478`.
