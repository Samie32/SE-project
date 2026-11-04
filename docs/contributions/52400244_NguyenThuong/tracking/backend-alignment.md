# Đối chiếu phần 52400244 với backend tuần 3–4

Ngày đối chiếu: **04/11/2026**. Phạm vi: dữ liệu, ví dụ API, hướng dẫn và demo của 52400244; không sửa code backend/frontend, migration hoặc phân công nhóm.

## Nguồn đã xác nhận

- Backend: `main` tại `b10e0960a6a48225b5c26af60c737dbd1c37968f`.
- Phần đóng góp gốc: `docs/52400244-demo-data` tại `1104fdb970233a396df1ee76af37e155496ffc55`.
- Đã đọc controller/service auth, catalog, availability, appointment, notification; DemoData, migration V1, Db/ErrorHandler, integration test, realm Keycloak và tài liệu chạy/API của main.
- Workspace ban đầu không có `.git`, backend/frontend chỉ có `.gitignore`. Thư mục đóng góp được cập nhật từ nhánh 52400244 trước khi sửa. Bản local cũ được giữ ngoài workspace tại thư mục clone tạm (đường dẫn trong `report/backend-validation.md`).

## Sai khác có tác động tích hợp

| Nội dung | Gói thiết kế | Backend đang triển khai |
| --- | --- | --- |
| Contract | `docs/api/openapi.yaml`, 30 operations | `docs/api/openapi.json`, 19 operations, prefix `/api` |
| Vai trò quản trị | `ADMIN` | `ADMINISTRATOR`; quyền từ MySQL, không từ claim JWT |
| Chế độ từ xa | `TELEHEALTH` (bản local cũ dùng `mode_label`) | `REMOTE`; trực tiếp `IN_PERSON` |
| Tên thời gian | fixture logic `start_at`, `end_at` | request/response `startAt`, `endAt` |
| Version mới | giá trị mô phỏng | `0`; đọc version response cho các lệnh tiếp theo |
| Đổi lịch | ví dụ theo thiết kế | `POST /api/appointments/{id}/reschedule` |
| Lỗi | code/message/correlationId | ProblemDetail; validation DTO 400, nghiệp vụ 409/422 |
| Tài khoản demo | 7 account, 2 bác sĩ, issuer giả | 6 account, 1 bác sĩ, 1 chuyên khoa; xem manifest backend |
| ID dữ liệu | UUID fixture cố định | chỉ account/catalog seed có ID biết trước; availability/slot/appointment sinh lúc chạy |
| Thông báo | nhắc trước 30 phút | outbox BOOKED/RESCHEDULED/CANCELLED sau giao dịch; chưa có nhắc định kỳ |
| Clinical/queue/video | mô hình 16 nhóm fixtures | chưa có API/migration; chưa thể nạp hoặc demo runtime |

Giữ nguyên bộ thiết kế để không biến các phần chưa triển khai thành dữ liệu có thể import. Bộ `test-data/backend/` dành cho backend thực thi; không gửi trực tiếp `fixtures/` hoặc `api-examples/` cũ đến main.

## Yêu cầu và tiêu chí kiểm chứng

- **FR-BE-01:** đủ ví dụ cho 19 operations của backend; body camelCase, tham số bắt buộc và schema khớp snapshot được ghim SHA. Kiểm: validator contract backend.
- **FR-BE-02:** dữ liệu demo có ngày tương lai theo UTC+7, thứ Hai–thứ Bảy, giờ phòng khám; dùng enum/role thực thi. Kiểm: unit test ngày Chủ nhật, ngày quá khứ, version=0 và enum sai.
- **FR-BE-03:** demo lấy ID slot/appointment/version từ response, dùng Idempotency-Key riêng theo thao tác; không nhúng token/mật khẩu. Kiểm: template HTTP và schema mẫu.
- **FR-BE-04:** hướng dẫn nêu rõ phần đã triển khai, phần chờ và cách chạy trong clone có backend. Kiểm: review tài liệu và ma trận 24 TC.

## Kế hoạch và tác vụ

- [x] T001: đối chiếu hai nhánh, cập nhật gói từ nhánh 52400244, lưu bản local ban đầu ngoài workspace.
- [x] T002: thêm manifest seed, snapshot có nguồn, công cụ sinh bundle/request HTTP lấy ID từ response; regression cho ngày UTC+7 và hash LF/CRLF.
- [x] T003: kiểm schema body, required parameters và phủ 19 operations; kiểm bộ thiết kế riêng. Bằng chứng tại report/backend-validation.md.
- [x] T004: sửa README, bàn giao, hướng dẫn, demo, truy vết 24 TC và báo cáo xác minh.

Giả định: môi trường demo dùng profile `demo` và realm local chuẩn của main. Nếu `/api/me` hoặc danh mục khác manifest, phải lấy ID thực tế trước khi gửi lệnh. Không giả định 2 bác sĩ/2 chuyên khoa đã có trong seed.

Chưa kiểm chứng: HTTP trên Spring Boot/MySQL/Keycloak thật. Docker daemon hiện chưa hoạt động; không coi unit test/contract validation là kết quả tích hợp.
