# Công việc sau khi chốt hợp đồng 1.0.0

Ngày 16/11/2026. Chuẩn: [integration-contract.md](integration-contract.md), [openapi.yaml](openapi.yaml). Đây là việc cần thực hiện, không phải danh sách lỗi đã sửa. Thay đổi lần này chỉ đồng bộ nhánh, hợp đồng, tài liệu và kiểm tra tĩnh.

**Cập nhật 17/11/2026:** frontend chính đã chuyển sang source ZIP ở `frontend/`; adapter API, profile, current clinical, queue/audit và vòng đời telehealth đã được sửa theo hợp đồng. Media WebRTC phía FE đã triển khai; xem [hướng dẫn media](../webrtc-client.md) và [bằng chứng FE](../frontend-unified.md). BE-01…04, E2E BE thật và nghiệm thu TURN/xuyên NAT vẫn mở; các bảng dưới là phạm vi công việc gốc.

## Backend

| ID | Ưu tiên | Việc chốt phải sửa | Điều kiện kiểm chứng |
|---|---|---|---|
| BE-01 | P1 | Lưu audit DENIED cho người ngoài bị chặn tham gia phòng; event sống sau rollback, không chứa PHI/token | Request người ngoài trả 404, không token; có event actor/resource/result/correlationId. Fault injection không làm commit nhầm dữ liệu |
| BE-02 | P2 | GET availability/time-off cho RECEPTIONIST; giữ quyền ghi DOCTOR sở hữu/ADMINISTRATOR | Lễ tân GET 200, POST/DELETE 403; bác sĩ khác bị chặn; bác sĩ sở hữu/quản trị được ghi theo quy tắc |
| BE-03 | P2 | Theo ma trận thiết kế, tài khoản chỉ AUDITOR không đọc doctors/specialties/slots | Ba GET trả 403 cho AUDITOR thuần; vai trò được phép vẫn đọc được. Nếu có nhiều role, dùng quyền hợp lệ của role còn lại |
| BE-04 | P1 tích hợp | Queue hợp lệ không còn WAITING: queue/next trả **204 không body** thay 404 | Phân biệt queue trống 204, doctor không tồn tại 404, có CALLED/IN_SERVICE 409; retry không gọi hai bệnh nhân hoặc lưu response sai. Cần thiết kế cách lưu/replay kết quả rỗng với Commands/Idempotency hiện dùng Map |

BE-01, GET availability cho lễ tân và GET doctors cho auditor đã có probe runtime tái hiện. Time-off, specialties và slots trong BE-02/03 là mở rộng cần test riêng theo cùng ma trận. BE-04 là quyết định hợp đồng mới để loại bỏ 404 mơ hồ; không mô tả như lỗi runtime đã được sửa.

Đề nghị thành viên phụ trách backend nhận nhóm BE; người làm FE có thể sửa adapter theo hợp đồng song song, nhưng không dựa vào 204 trước khi BE-04 được kiểm chứng.

## Frontend gộp

Tham chiếu đường dẫn trong `frontend-unified.zip` đã đánh giá. Compose dùng frontend gộp ngay tại `frontend/`; frontend patient/doctor/staff cũ vẫn giữ đối chiếu. FE-API/CLINICAL/QUEUE/AUDIT/CONFIG đã chuẩn bị và có test; FE-WEBRTC đã có media client, chờ nối BE thật và nghiệm thu hạ tầng.

| Nhóm | Nội dung | Tiêu chí hoàn thành |
|---|---|---|
| FE-API | API PUT/POST nhận key, giữ key khi retry; queue route/date; skip version; progress key; join consent; audit createdAt; dùng profile cho doctorId/patientId | Test request URL/header/body của từng adapter; 400/401/403/404/409/429/503 và body rỗng xử lý đúng |
| FE-CLINICAL | Mở appointment detail lấy encounterId; record/rx hiện tại qua encounter; cập nhật đơn draft bằng PUT; lịch sử chỉ FINAL/ISSUED | Lưu nháp → refresh → sửa không mất dữ liệu; version mới được dùng; không tạo draft đơn mới mỗi lần lưu; xử lý stale version hai tab |
| FE-QUEUE | Ticket có version/createdAt/queueDate; lọc trạng thái từ queue response; next xử lý 204 sau BE-04 | Check-in → CALLED → IN_SERVICE → DONE; skip giữ ID, về cuối; không coi 404 tài nguyên thành hàng rỗng |
| FE-AUDIT | Render createdAt; filter to exclusive ngày kế tiếp; actor SYSTEM; pagination | Không crash vì Invalid Date; đủ sự kiện cuối ngày; bệnh nhân không xem được audit |
| FE-WEBRTC | Prepare một lần, poll GET session, join/token refresh, signaling/connection, remote track, STUN/TURN, đóng media khi ENDED/CANCELLED | Hai trình duyệt nghe/nhìn nhau; audio-only, token hết 5 phút, reconnect sau +15 phút; không gọi `/api/api/...`; client bên kia đóng media khi bác sĩ end |
| FE-CONFIG | Bật từng cờ sau kiểm tra; proxy 5173; Docker build args | Production bundle dùng đúng cờ; không chạy hai frontend trên 5173; không nhầm chế độ mock với kết nối thật |

## Thứ tự tích hợp

1. Đọc YAML/tài liệu 1.0.0; BE nhận BE-01…04, FE nhận FE-API/CLINICAL song song.
2. E2E đăng nhập và đặt/đổi/hủy; tiếp theo check-in/queue/progress/record/rx/complete trực tiếp.
3. Audit/notification UI và test trái quyền; sửa đến khi đúng ma trận.
4. Vòng đời telehealth và media thật; xử lý mất mạng, hết token, đóng phiên và hoàn tất encounter riêng.
5. Kiểm chứng NFR tải, backup/restore, TLS/khóa/backup encryption, usability; đưa vào báo cáo nghiệm thu.

## Kiểm chứng đã có và giới hạn

- Bộ backend gốc trên MySQL 8.4: 49/49 test đạt tại lần đối chiếu 16/11/2026; việc này không xóa ba lỗi bổ sung theo đặc tả.
- ZIP frontend: 12/12 test logic/mock và production build đạt; chưa E2E với Keycloak/BE thật.
- Các kiểm tra Python đi kèm chỉ là kiểm tra hợp đồng tĩnh. Snapshot runtime có response generic Object nên không xác minh được đầy đủ response DTO hoặc quyền chỉ bằng so sánh OpenAPI.
- Chưa thay mã nghiệp vụ BE. ZIP đã thay frontend chính; media client có kiểm thử với signaling fixture. Chưa nghiệm thu cuộc gọi qua BE thật/xuyên NAT. Mục provider callback/outbox đóng media trong thiết kế vẫn mở; signaling nội bộ không chứng minh nhà cung cấp đã đóng media.
