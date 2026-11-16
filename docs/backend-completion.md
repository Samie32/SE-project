# Backend: triển khai và tích hợp

> Cập nhật hợp đồng 16/11/2026: FE/BE triển khai tiếp theo [hợp đồng 1.0.0](api/integration-contract.md) và [OpenAPI YAML](api/openapi.yaml). Nội dung dưới mô tả baseline đang chạy. [Backlog](api/integration-backlog.md) ghi riêng audit từ chối, quyền đọc và queue rỗng 204 chưa được sửa; không coi việc chốt tài liệu là đã nghiệm thu.

Backend Spring Boot có API cho chín phân hệ. Migration V2 bổ sung hàng đợi, lần khám, bệnh án, đơn thuốc và phiên khám từ xa; giữ nguyên V1 và dữ liệu đặt lịch hiện có.

## Chạy local

Yêu cầu Java 21 trở lên và Docker Desktop đang chạy. Từ thư mục gốc:

```powershell
.\scripts\run-backend.ps1
```

Script tạo `.env` nếu thiếu, khởi động MySQL/Keycloak/Mailpit rồi chạy profile `demo`. Dùng `-SkipInfrastructure` nếu đã tự chuẩn bị dịch vụ. Không chạy đồng thời backend Docker và Maven trên cổng 8080.

- API: `http://localhost:8080/api`
- Swagger: `http://localhost:8080/swagger-ui/index.html`
- OpenAPI thực thi: `http://localhost:8080/v3/api-docs`
- Email demo: `http://localhost:8025`
- Tài khoản: patient, patient2, doctor, receptionist, admin, auditor; mật khẩu trong `DEMO_PASSWORD` của `.env`.
- Demo tạo lịch trực tiếp 08:00–12:00 và từ xa 13:00–17:00 cho các ngày làm việc trong bảy ngày kế tiếp.

## Quy ước API

Tất cả API `/api` yêu cầu JWT OIDC với audience `clinic-api`. Vai trò lấy từ database. Thời gian ISO-8601 UTC; ngày hàng đợi theo Asia/Ho_Chi_Minh.

Đặt/đổi/hủy, check-in, progress, gọi/bỏ lượt, lưu/bổ sung bệnh án, tạo/sửa/phát hành đơn và tạo/bắt đầu/kết thúc phòng yêu cầu `Idempotency-Key`. Giữ nguyên khóa khi thử lại cùng yêu cầu. Đổi nội dung dùng khóa mới. Response được giữ 24 giờ, mã hóa AES-GCM; phát lại kiểm tra vai trò và ghi audit.

Join/connection/signals không dùng idempotency. Join cấp token mới và thu hồi token trước của chính người tham gia. Thao tác sửa gửi `version` hiện tại; thiếu version trả 400, cũ trả 409. Response có `X-Request-Id` liên kết audit trong request.

## API bổ sung

Prefix `/api` lược bỏ. Các API danh mục và đặt lịch cũ giữ nguyên.

| Method | Đường dẫn | Quyền / body |
|---|---|---|
| GET | `/me/profile` | Tài khoản hiện tại; gồm patientId/doctorId và tên |
| GET | `/users?limit=20&offset=0` | Quản trị; ID nội bộ để tạo bác sĩ/cấp vai trò |
| DELETE | `/availability/{id}` | Bác sĩ sở hữu/quản trị; lịch tương lai chưa có lịch hẹn |
| DELETE | `/time-off/{id}` | Bác sĩ sở hữu/quản trị; lịch tương lai |
| GET | `/appointments/{id}` | Chủ lịch/bác sĩ/lễ tân/quản trị; gồm encounterId |
| POST | `/appointments/{id}/check-in` | Lễ tân; không cần body |
| POST | `/appointments/{id}/progress` | `{targetStatus, version}` |
| GET | `/doctors/{id}/queue?date=YYYY-MM-DD` | Bác sĩ sở hữu/lễ tân |
| POST | `/doctors/{id}/queue/next?date=YYYY-MM-DD` | Bác sĩ sở hữu/lễ tân; không cần body |
| POST | `/queue-tickets/{id}/skip` | `{reason, version}` |
| GET | `/patients/{id}/records` | Chủ bệnh nhân/bác sĩ có quan hệ điều trị; limit/offset |
| GET, PUT | `/encounters/{id}/record` | GET: chủ lịch/bác sĩ; PUT: bác sĩ phụ trách |
| POST | `/records/{id}/amendments` | Bác sĩ; `{version, content, reason}` |
| GET, POST | `/encounters/{id}/prescriptions` | GET: chủ lịch/bác sĩ; POST: bác sĩ, `{items}` |
| PUT | `/prescriptions/{id}` | Bác sĩ; `{version, items}`; chỉ DRAFT |
| POST | `/prescriptions/{id}/issue` | Bác sĩ; `{version}` |
| GET | `/patients/{id}/prescriptions` | Chủ bệnh nhân/bác sĩ có quan hệ điều trị; limit/offset |
| GET | `/audit-events` | AUDITOR; from/to UTC, actorId, resourceId, limit/offset |
| POST | `/appointments/{id}/telehealth-session` | Chủ lịch/bác sĩ; tạo hoặc lấy phòng |
| GET | `/telehealth-sessions/{id}` | Hai người tham gia; trạng thái và phiên bản |
| POST | `/telehealth-sessions/{id}/join` | `{consent: true}` cho bệnh nhân; bác sĩ có thể gửi false |
| POST | `/telehealth-sessions/{id}/start` | Bác sĩ; `{version}` |
| POST | `/telehealth-sessions/{id}/end` | Bác sĩ; `{version}` |
| POST | `/telehealth-sessions/{id}/connection` | `{version, state: ACTIVE hoặc RECONNECTING}` và X-Room-Token |
| GET, POST | `/telehealth-sessions/{id}/signals` | JWT và X-Room-Token |

## Khám trực tiếp

1. Bệnh nhân đặt lịch.
2. Lễ tân check-in trong `[start -15 phút, start +15 phút)`. Tạo duy nhất một phiếu WAITING và chuyển lịch CHECKED_IN nguyên tử.
3. Gọi queue/next nhận phiếu FIFO và chuyển CALLED. Bác sĩ/ngày chỉ có một phiếu CALLED/IN_SERVICE. Bỏ lượt cần lý do, giữ ID phiếu và đưa cuối hàng.
4. Bác sĩ gửi progress `{targetStatus: "IN_PROGRESS", version: 1}`. Cần phiếu CALLED; chuyển phiếu IN_SERVICE và tạo encounter cùng transaction. Response có encounterId.
5. Lưu bệnh án, phát hành đơn nếu cần.
6. Progress `{targetStatus: "COMPLETED", version: 2}` yêu cầu bệnh án FINAL; encounter/lịch/phiếu chuyển COMPLETED/COMPLETED/DONE nguyên tử.

Lễ tân đánh dấu NO_SHOW cho lịch trực tiếp CONFIRMED từ start +15 phút; bác sĩ phụ trách thực hiện với lịch từ xa. Bệnh nhân đã check-in được tiếp tục chờ/khám sau cửa sổ này.

## Bệnh án và đơn thuốc

PUT record lần đầu dùng `{version: 0, content: "...", status: "DRAFT"}` hoặc FINAL. Response đầu tiên có version 1; lần sửa sau gửi version trả về. FINAL không thể ghi đè/xóa, kể cả qua SQL runtime. Bổ sung tạo FINAL mới tham chiếu bản cuối cùng, có lý do; hai bổ sung đồng thời không tạo nhánh.

Bệnh nhân chỉ đọc FINAL/ISSUED của mình. Bác sĩ có lịch CONFIRMED/CHECKED_IN/IN_PROGRESS được đọc lịch sử FINAL/ISSUED của bệnh nhân; sau hoàn tất chỉ đọc lần khám mình phụ trách. Quyền quản trị không cho phép đọc/ghi bệnh án.

Mỗi dòng thuốc có medicineName, doseText, route, frequency, durationText, đều không rỗng. Draft có thể chưa có dòng; phát hành cần ít nhất một dòng đầy đủ. ISSUED không sửa/xóa. Không tự đề xuất thuốc/liều dùng.

Nội dung bệnh án, thuốc, signaling và response idempotency mã hóa AES-256-GCM. Audit không chứa nội dung này. Đọc dữ liệu lâm sàng chỉ thành công khi lưu audit thành công.

## Khám từ xa và WebRTC

Backend cung cấp phòng signaling riêng, không dùng nhà cung cấp media bên ngoài. Tạo phòng từ start -10 phút đến trước start +15 phút. Bệnh nhân đồng ý rồi join: CREATED → WAITING. Bác sĩ start từ giờ hẹn: WAITING → ACTIVE, lịch → IN_PROGRESS và tạo encounter cùng transaction. Bác sĩ join sau start.

Join trả sessionId, token, expiresAt, signalingUrl. Token ngẫu nhiên 256-bit, lưu hash, hết hạn 5 phút, gắn tài khoản/phòng. Signaling yêu cầu JWT OIDC và X-Room-Token. ACTIVE/RECONNECTING được cấp lại token sau cửa sổ vào phòng ban đầu.

- POST signals: `{kind: "OFFER" | "ANSWER" | "ICE", payload: "SDP hoặc JSON candidate"}`.
- GET signals: `?after=0`, tối đa 100 message của phía đối diện. Lần sau dùng ID cuối đã nhận; poll 1–2 giây khi thương lượng kết nối.
- Payload tối đa 65.536 ký tự; 300 message/người/phòng/phút. Message hết hạn sau 5 phút và được dọn nền.
- Client xử lý OFFER/ANSWER/ICE bằng RTCPeerConnection, xin quyền camera/microphone và có thể tắt video dùng audio.
- Mất mạng: connection RECONNECTING; kết nối lại: ACTIVE với version mới. Không tự hoàn tất khám.
- End chuyển ENDED, xóa token/message nguyên tử; không cấp lại token/mở lại phòng. Sau đó chốt bệnh án và gọi progress COMPLETED riêng.
- NO_SHOW chuyển CREATED/WAITING → CANCELLED, thu hồi token.

**Giới hạn:** frontend chưa có cuộc gọi WebRTC thật nối API này. Backend không chuyển tiếp media và không thể cưỡng chế ngắt luồng P2P đã thiết lập; client phải quan sát trạng thái và đóng RTCPeerConnection khi ENDED. Gọi xuyên NAT cần STUN/TURN, HTTPS và kiểm thử hai trình duyệt. Thiết kế callback/outbox đóng phòng nhà cung cấp trong đặc tả chưa áp dụng cho signaling nội bộ. Nếu cần cưỡng chế thu hồi media phía server, cần SFU/provider cùng outbox đóng phòng và webhook xác thực. Test signaling không phải nghiệm thu video/audio đầu cuối.

## Email và tác vụ nền

Đặt/đổi lịch từ ít nhất 30 phút trước giờ hẹn tạo REMINDER đến hạn start -30 phút. Đặt khi còn ít hơn 30 phút chỉ tạo xác nhận. Reminder cũ bỏ khi version đổi, lịch không còn CONFIRMED hoặc đã đến giờ khám. Worker gửi sau commit, lease 60 giây, retry 1/5/15 phút; thất bại cuối là FAILED và có audit. Email không chứa bệnh án/thuốc/token.

Kênh local là SMTP/Mailpit; chưa cấu hình SMS thật. Lịch tồn tại trước nâng cấp không tự thêm reminder. Notification-jobs cho lễ tân/quản trị theo dõi kết quả.

## Kiểm thử và frontend

```powershell
.\backend\mvnw.cmd -f backend/pom.xml verify
```

Testcontainers dùng MySQL 8.4 riêng, chạy migration/trigger, không dùng database demo. Test bao phủ đồng thời, idempotency, ranh giới thời gian, bệnh án bất biến, đơn thuốc, quyền truy cập, audit rollback, reminder và vòng đời/token/signaling. Test contract xuất OpenAPI vào backend/target/openapi.json.

Frontend bác sĩ vẫn mặc định mock/localStorage; payload cũ thiếu JWT/version hoặc dùng status thay targetStatus cần chuyển theo hợp đồng này. Đợt backend này không thay giao diện hoặc tự tắt mock.
