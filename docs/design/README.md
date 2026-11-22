# Thiết kế hệ thống

Thiết kế sử dụng **React 18 + TypeScript 5**, **Java 21 / Spring Boot 3.5 modular monolith** và **MySQL 8.4 (InnoDB, Flyway `V1..V11`)**. Các sơ đồ mô tả hệ thống thực tế đã triển khai (bao gồm 27 ca sử dụng, 24 bảng CSDL và hạ tầng Internet Azure VM với `Caddy 2`, `Nginx 1.28`, `Keycloak 26.4 + Google OAuth2`, `Brevo SMTP` và `coturn` STUN/TURN), đồng bộ cùng hợp đồng OpenAPI 3.1 và bộ kiểm thử tự động.

## Chuẩn mô hình hóa & đặc tả tham chiếu

| Mảng | Chuẩn / Quy ước áp dụng | Ghi chú phạm vi |
|---|---|---|
| Yêu cầu chức năng (FR) | Cú pháp **EARS** (*Easy Approach to Requirements Syntax*) · tham chiếu **ISO/IEC/IEEE 29148** | `KHI / NẾU / TRONG KHI ... PHẢI ...` |
| Đặc tả Use Case (UC) | **Alistair Cockburn — Fully Dressed Use Case** + **OMG UML 2.5** | Tác nhân, Mục tiêu, Tiền điều kiện, Kích hoạt, Luồng chính/thay thế/ngoại lệ, Hậu điều kiện |
| Tiêu chí chấp nhận (AC) & Chất lượng (NFR) | **BDD / Gherkin** (`Given–When–Then`) · **ISO/IEC 25010:2023** (16 NFR) | Chuẩn là căn cứ thiết kế/đánh giá, không phải tuyên bố chứng nhận pháp lý |
| Kiến trúc & Mô hình hóa | **OMG UML 2.5** · **Kruchten 4+1 Views** · **IE / Crow's Foot ERD** | 34 file `.puml` → 34 file `.png` ở 150 DPI |
| API, Bảo mật & Truyền thông | **OpenAPI 3.1.0** · **RFC 9457** · **ISO 8601** · **OAuth 2.0 / OIDC PKCE S256 / JWT** · **NIST SP 800-38D (AES-256-GCM)** & **RFC 2104 (HMAC-SHA256)** · **OWASP ASVS/WSTG** · **WebRTC / STUN (RFC 5389) / TURN (RFC 5766)** | Bảo vệ dữ liệu y tế & danh tính bằng mã hóa trường nhạy cảm + blind index tách khóa |
| Kiểm thử & Tiếp cận | **ISO/IEC/IEEE 29119** · **PCL (`N / B / A`)** · **Arrange–Act–Assert (AAA)** · **WCAG 2.2 AA** (`axe-core`) | Quét `axe` tự động hỗ trợ rà soát, không thay thế kiểm thử thủ công |

## Tài liệu nền tảng

- [Nguồn thiết kế Figma desktop và phạm vi bàn giao](gui-mockups/figma-design-source.md)
- [Kiến trúc và các góc nhìn 4+1](architecture/architecture.md)
- [Phân quyền, bảo mật và audit](architecture/security.md)
- [Từ điển dữ liệu và ràng buộc](database/data-dictionary.md)
- [Đặc tả màn hình](gui-mockups/screen-specifications.md)
- [Hợp đồng API](../api/openapi.yaml)

## Danh mục 34 sơ đồ

| Nhóm | Sơ đồ PNG | Nội dung chính |
|---|---|---|
| activity-diagrams | [account-security-otp](activity-diagrams/account-security-otp.png) | BP-01 Đăng nhập PKCE/Google, Quên MK & OTP đổi email |
| activity-diagrams | [booking](activity-diagrams/booking.png) | BP-02 Quy trình đặt/đổi/hủy lịch |
| activity-diagrams | [consultation](activity-diagrams/consultation.png) | BP-03 Quy trình khám bệnh trực tiếp |
| activity-diagrams | [telehealth-consultation](activity-diagrams/telehealth-consultation.png) | BP-04 Quy trình khám từ xa WebRTC P2P + `coturn` |
| architecture | [deployment-azure](architecture/deployment-azure.png) | Triển khai Azure VM (`Caddy 2`, `Nginx`, `Keycloak/Google`, `Brevo`, `coturn`, CI rollback) |
| architecture | [deployment](architecture/deployment.png) | Triển khai Docker Compose phát triển & kiểm thử cục bộ |
| architecture | [system-architecture](architecture/system-architecture.png) | Kiến trúc phân tầng Modular Monolith (Kruchten 4+1) |
| class-diagram | [class-diagram](class-diagram/class-diagram.png) | Mô hình miền PIM đồng bộ 24 thực thể `V1..V11` |
| database | [erd](database/erd.png) | ERD tổng quan 24 bảng MySQL 8.4 / InnoDB (`V1..V11`) |
| database | [erd-scheduling](database/erd-scheduling.png) | ERD nhóm Đặt lịch & Danh mục (`M02–M03–M04`) |
| database | [erd-clinical](database/erd-clinical.png) | ERD nhóm Lâm sàng, Hàng đợi & WebRTC (`M05–M08–M09`) |
| database | [erd-infrastructure](database/erd-infrastructure.png) | ERD nhóm Danh tính, OTP, Thông báo Outbox & Kiểm toán (`M01–M06–M07`) |
| sequence-diagrams | [auth-otp-contact](sequence-diagrams/auth-otp-contact.png) | UC-01 Xác thực PKCE/Google & OTP đổi email |
| sequence-diagrams | [book-appointment](sequence-diagrams/book-appointment.png) | UC-08/09 Đặt lịch và đổi lịch nguyên tử |
| sequence-diagrams | [change-appointment](sequence-diagrams/change-appointment.png) | UC-09 Đổi lịch hẹn chi tiết |
| sequence-diagrams | [cancel-appointment](sequence-diagrams/cancel-appointment.png) | UC-10 Hủy lịch hẹn |
| sequence-diagrams | [checkin-and-queue](sequence-diagrams/checkin-and-queue.png) | UC-19/20 Check-in & gọi lượt tiếp theo |
| sequence-diagrams | [skip-ticket](sequence-diagrams/skip-ticket.png) | UC-21 Bỏ lượt về cuối hàng đợi |
| sequence-diagrams | [consultation-progress](sequence-diagrams/consultation-progress.png) | UC-11 Tiến trình khám & hoàn tất / `NO_SHOW` |
| sequence-diagrams | [delay-and-noshow](sequence-diagrams/delay-and-noshow.png) | UC-25/26 Báo chậm giờ khám (`DELAY_NOTICE`) & Ghi nhận vắng hẹn (`NO_SHOW`) |
| sequence-diagrams | [medical-record](sequence-diagrams/medical-record.png) | UC-12/13 Lịch sử lâm sàng, hồ sơ bất biến & bổ sung |
| sequence-diagrams | [prescription](sequence-diagrams/prescription.png) | UC-14 Nháp và phát hành đơn thuốc |
| sequence-diagrams | [notifications](sequence-diagrams/notifications.png) | UC-15/16 Gửi thông báo bất đồng bộ qua `notification_job` |
| sequence-diagrams | [patient-account-admin](sequence-diagrams/patient-account-admin.png) | UC-27 Tra cứu chính xác (`K_hmac`) & Khóa/Mở khóa tài khoản bệnh nhân |
| sequence-diagrams | [telehealth](sequence-diagrams/telehealth.png) | UC-22/23/24 Phiên khám từ xa WebRTC (Signaling nội bộ + `coturn`) |
| state-diagrams | [appointment](state-diagrams/appointment.png) | Vòng đời Lịch hẹn (`CONFIRMED -> CHECKED_IN -> IN_PROGRESS -> COMPLETED / CANCELLED / NO_SHOW`) |
| state-diagrams | [medical-record](state-diagrams/medical-record.png) | Vòng đời Hồ sơ khám (`DRAFT -> FINAL`, bổ sung tạo bản `FINAL` mới) |
| state-diagrams | [queue-ticket](state-diagrams/queue-ticket.png) | Vòng đời Phiếu hàng đợi (`WAITING -> CALLED -> IN_SERVICE -> DONE`) |
| state-diagrams | [telehealth](state-diagrams/telehealth.png) | Vòng đời Phiên từ xa (`CREATED -> WAITING -> ACTIVE <-> RECONNECTING -> ENDED / CANCELLED`) |
| use-case | [use-case-diagram](use-case/use-case-diagram.png) | Tổng quan Use Case — 27 ca sử dụng |
| use-case | [use-case-1](use-case/use-case-1.png) | Nhóm 1: Danh tính, Bảo vệ tài khoản, Danh mục & Lịch phòng khám (`UC-01..06, 27`) |
| use-case | [use-case-2](use-case/use-case-2.png) | Nhóm 2: Lịch hẹn, Vắng hẹn & Hàng đợi (`UC-07..11, 19..21, 25..26`) |
| use-case | [use-case-3](use-case/use-case-3.png) | Nhóm 3: Chăm sóc lâm sàng & WebRTC (`UC-12..14, 22..24`) |
| use-case | [use-case-4](use-case/use-case-4.png) | Nhóm 4: Thông báo Outbox & Kiểm toán (`UC-15..18`) |

## Cách đọc mô hình

Use case tổng quan liệt kê toàn bộ **27 mục tiêu người dùng**, các bản `use-case-1` đến `use-case-4` tách nhóm theo phân hệ. `UC-17` là hành vi ghi audit fail-closed nội bộ trong giao dịch; kiểm toán viên tra cứu lịch sử qua `UC-18`. Quan hệ `<<include>>` chỉ dùng cho hành vi bắt buộc, không biểu diễn thứ tự thời gian.

Class diagram thể hiện mô hình khái niệm miền (PIM); ERD tổng quan và 3 ERD góc nhìn thể hiện **24 bảng MySQL 8.4 (InnoDB)** theo đúng migration `V1..V11`. Ranh giới truyền thông WebRTC dùng signaling P2P nội bộ (`telehealth_session`, `telehealth_token`, `telehealth_signal`) kết hợp `coturn` STUN/TURN `:3478`, và `notification_job` trực tiếp đóng vai trò hàng đợi transactional outbox cho worker SMTP.
