# Bàn giao cho backend — 52400244, 04/11/2026

Đã đối chiếu code `main@b10e096`, không còn chờ xác nhận enum/migration tuần 3–4. Dùng [backend/README.md](../test-data/backend/README.md), [accounts.json](../test-data/backend/accounts.json) và `tools/backend_demo.py` cho bản đang triển khai.

| Hạng mục | Đã xác nhận từ code | Việc còn cần chạy |
| --- | --- | --- |
| Auth/role | Keycloak local, audience clinic-api; role từ MySQL, ADMINISTRATOR | Đăng nhập thật và đối chiếu /api/me |
| Seed | 6 account, 2 bệnh nhân, 1 bác sĩ, 1 chuyên khoa; ngày mai và 7 ngày tiếp theo bỏ Chủ nhật | Khởi động profile demo và xác minh danh mục |
| DTO | camelCase; IN_PERSON/REMOTE; booking chỉ slotId | Gửi bundle HTTP, lấy ID/version response |
| Version | Appointment mặc định 0, đổi/hủy tăng version | Kiểm replay/stale/ownership bằng API |
| Migration | V1 có scheduling/auth/audit/outbox; chưa có clinical/queue/video | Không import toàn bộ 16 nhóm fixtures |
| Mã hóa | email_encrypted do Crypto/backend tạo | Không chuyển placeholder thành BLOB |
| Thông báo | BOOKED/RESCHEDULED/CANCELLED, chưa có nhắc -30 phút | Chạy smoke backend và kiểm Mailpit |
| Lịch sử/clinical | Chỉ có mô hình thiết kế | Chờ migration/API tuần sau |

## Tiêu chí nhận bàn giao

- [x] Đối chiếu enum/role/DTO và 19 operations; kiểm tra tĩnh bằng snapshot và code.
- [x] Có request sinh ngày tương lai, dùng ID và version thực tế trong HTTP demo.
- [ ] Phong/QA chạy Compose và scripts/smoke.py, lưu SHA/log thực tế.
- [ ] Chạy demo.http, ghi HTTP status/body đã bỏ token và kết quả thực tế.
- [ ] QA chạy TC đã có API; không ghi PASS cho TC clinical/queue/video.
- [ ] Nếu cần quy mô 2 bác sĩ/2 chuyên khoa: tạo bổ sung qua IdP/API và lưu mapping ID; seed mặc định chưa đáp ứng quy mô đó.

Không có script SQL import trực tiếp, không reset/xóa DB. Kịch bản giữ lịch đã hủy, availability, audit và outbox làm lịch sử thử nghiệm. Bộ fixtures thiết kế giữ để chuẩn bị giai đoạn sau.
