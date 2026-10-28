# Bộ dữ liệu trình diễn – manifest v2

Đây là **logical fixtures**, có thể xem trên Git và kiểm tra quan hệ mà **không** cần MySQL. Chúng KHÔNG phải request hợp lệ để POST nguyên tập vào API và KHÔNG phải seed SQL.

## Cấu trúc

- `fixtures/*.json`: danh sách thực thể theo Data Dictionary, với trường `key` để nối trong tài liệu. Mọi `id` là UUID giả lập tái lập.
- `api-examples/*.json`: ví dụ BODY của từng thao tác theo OpenAPI. Không chứa bearer token hoặc IdP credential.
- `scenarios/traceability.csv`: truy vết tất cả TC-01..TC-24, phân biệt trạng thái dữ liệu và kiểm thử runtime.
- `../tools/validate_demo.py`, `../tools/test_demo.py`: validator và unit tests stdlib.

## Ngày giờ

Tất cả thời điểm `*_at` lưu chuỗi UTC `Z` (manifest), quy ước thời gian là `Asia/Ho_Chi_Minh` cho người dùng. Khi nạp MySQL `DATETIME(6)` chuyển UTC thành số không kèm offset.

- Dữ liệu **tương lai** 10/11/2026 và 11/11/2026 để luyện đặt lịch, đổi lịch, nhắc lịch.
- Dữ liệu **lịch sử** 20/10/2026, 21/10/2026 để minh họa một hồ sơ/đơn thuốc đã phát hành và một phiên khám từ xa đã kết thúc.
- Sau những ngày tương lai này, **tạo lại fixture theo lịch demo mới, không dịch tùy ý các mốc lịch sử** hoặc ghi nhận kết quả đã chạy.

## Giới hạn và metadata

- `key` là nhãn logic, KHÔNG phải cột DB. `encryption_instruction` là hướng dẫn để Phong mã hóa một nội dung mô phỏng do backend sinh, KHÔNG phải cột DB.
- `roles` phải bung ra bảng UserRole; `contact_encrypted`, `content_encrypted` là BLOB được tạo bởi backend. Trong manifest `content_encrypted: null` chỉ là đánh dấu chưa được backend mã hóa – **không đủ điều kiện insert trực tiếp**.
- `PrescriptionItem` không có FK danh mục thuốc, tên/đường/liều/tần suất/thời gian đều là placeholder không thể dùng cho điều trị thật.
- `Appointment` đã có `start_at`, `end_at` như snapshot Slot, `mode` đúng `IN_PERSON` hoặc `TELEHEALTH` theo OpenAPI, không phải DIRECT/REMOTE.
- Case test trùng lịch, stale version, vi phạm quyền phải tái hiện bằng request/mocks; KHÔNG cố tình phá các khóa ngoại trong base fixture.

## Trình tự bàn giao để nạp MySQL (Phong chủ trì)

1. Tạo tài khoản giả lập trên môi trường IdP test, map `issuer`,`subject` → UserAccount/UserRole.
2. Nạp Specialty, Doctor, DoctorSpecialty, Patient sau khi có FK UserAccount.
3. Availability, Slot, Appointment qua service/migration **đúng quy tắc nghiệp vụ**, không tắt transaction để seed.
4. Nạp các lịch sử theo quy trình Encounter, MedicalRecord, Prescription/Items, QueueTicket, TelehealthSession; chỉ tạo dữ liệu `content_encrypted` qua tầng ứng dụng.
5. Sinh NotificationJob PENDING cho các lịch tương lai, audit theo quy định; kiểm tra phiên bản/hạn nhắc trước chạy worker.
6. Nạp môi trường *test* sạch, đặt cơ chế reset/idempotency. Không nạp vào hệ thống thật hoặc môi trường production.

## Các giới hạn cần xác nhận

- Thực thể Encounter/Prescription/QueueTicket có trường bắt buộc chi tiết nào trong migration ngoài Data Dictionary không?
- Schema OpenAPI `Prescription` chưa trả `author_id`, `issued_at`, trong khi Data Dictionary lưu các trường đó.
- Cấu hình mock IdP, quy tắc mã hóa BLOB và `Idempotency-Key` do backend quản lý.

## Công cụ kiểm tra bổ sung

- `validate_contract.py` so khớp 8 request mẫu theo OpenAPI 3.1 với `jsonschema`/PyYAML (không gửi request HTTP).
- `rebase_demo_dates.py --base-date YYYY-MM-DD` chỉ dịch 2 ngày tương lai sang các ngày làm việc kế tiếp, giữ nguyên bệnh án/đơn thuốc lịch sử; kết quả ở `test-data/generated/` và không ghi đè nguồn.
- `tools/run-checks.ps1` chạy validator + unittest trên PowerShell.

## Bộ API examples v3

- `scenarios/api-catalog.json` khai báo một ví dụ cho **từng operationId hiện có trong OpenAPI**, gồm tham số bắt buộc và tham chiếu request body nếu có.
- `scenarios/api-no-body.http` ghi nhận các API **không yêu cầu JSON body** (chẳng hạn check-in, gọi số). Không tự thêm JSON vào các API này.
- Chạy `tools/validate_contract.py` để kiểm toàn bộ catalog và schema của request body; kiểm tra này không thực hiện HTTP, xác thực RBAC hay side effect.
- `audit-events.json` đã bổ sung `READ_MEDICAL_RECORD` (minh họa thành công), còn lỗi ghi audit phải kiểm khi backend chạy theo BR-16.
- Chạy `tools/rebase_demo_dates.py --auto-next-business-day` **trước khi demo** để tạo ngày tương lai; không tái sử dụng fixture 10/11/2026 sau khi ngày đó đã qua.
