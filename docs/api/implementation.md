# API tuần 3–4

Base URL local: http://localhost:8080/api. Hợp đồng thực thi được sinh từ controller tại /v3/api-docs; [bản JSON](openapi.json) được xuất bằng scripts/smoke.py.

## Xác thực

Frontend dùng realm http://localhost:8180/realms/clinic, client public clinic-web, Authorization Code + PKCE S256 và callback trên http://localhost:5173/*. Gửi access token trong Authorization: Bearer; giữ token trong bộ nhớ. Backend kiểm tra chữ ký, issuer, hạn token và audience clinic-api.

Vai trò lấy từ MySQL, không lấy quyền quản trị từ role claim trong JWT. Tài khoản mới được ánh xạ mặc định thành bệnh nhân; tài khoản bác sĩ và nhân viên cần quản trị cấp quyền. /me trả ID nội bộ để quản trị dùng khi tạo bác sĩ hoặc cấp vai trò.

CORS chỉ cho http://localhost:5173 theo cấu hình mặc định. Không dùng cookie phiên; CSRF bị tắt cho API bearer token stateless.

## Danh mục endpoint

| Phương thức | Đường dẫn sau /api | Quyền |
|---|---|---|
| GET | /me | Đã đăng nhập |
| PUT | /me/contact | Chủ tài khoản; body email |
| PUT | /users/{id}/roles | Quản trị; body roles |
| GET/POST | /specialties | Đọc: đã đăng nhập; ghi: quản trị |
| GET/POST | /doctors | Đọc: đã đăng nhập; ghi: quản trị |
| PUT | /doctors/{id} | Quản trị |
| GET/POST | /doctors/{id}/availability | Bác sĩ sở hữu hoặc quản trị |
| GET/POST | /doctors/{id}/time-off | Bác sĩ sở hữu hoặc quản trị |
| GET | /slots?date=YYYY-MM-DD | Đã đăng nhập; tùy chọn doctorId, specialtyId, mode |
| GET | /appointments?limit=20&offset=0 | Bệnh nhân: lịch của mình; bác sĩ: lịch được gán; lễ tân/quản trị: điều phối |
| POST | /appointments | Bệnh nhân; body slotId |
| POST | /appointments/{id}/reschedule | Chủ lịch; body slotId, version |
| POST | /appointments/{id}/cancel | Chủ lịch; body reason, version |
| GET | /notification-jobs | Lễ tân/quản trị |

Các lệnh đặt, đổi và hủy bắt buộc header Idempotency-Key. Cùng khóa và nội dung trong 24 giờ trả lại kết quả đã lưu; cùng khóa khác nội dung trả 409. Khóa tính riêng theo người dùng và thao tác. Gửi lại sau lỗi mạng giữ nguyên khóa, thao tác mới dùng khóa mới.

## Ví dụ dữ liệu

Khoảng làm việc:

~~~json
{"startAt":"2030-01-08T02:00:00Z","endAt":"2030-01-08T03:00:00Z","slotMinutes":20,"mode":"IN_PERSON"}
~~~

Tạo bác sĩ:

~~~json
{"userId":"UUID-tai-khoan-noi-bo","specialtyIds":["UUID-chuyen-khoa"]}
~~~

Cập nhật bác sĩ:

~~~json
{"active":true,"displayName":"Bác sĩ mô phỏng","specialtyIds":["UUID-chuyen-khoa"]}
~~~

Đổi lịch:

~~~json
{"slotId":"UUID-khung-gio-moi","version":0}
~~~

Lịch trả về gồm id, patientId, doctorId, slotId, startAt, endAt, mode, status, version, cancellationReason. Thời điểm dạng ISO-8601 UTC; frontend hiển thị theo Asia/Ho_Chi_Minh. Slot và availability sử dụng cùng tên thời gian.

Một bác sĩ nhiều chuyên khoa có nhiều dòng trong kết quả /doctors, phân biệt bằng specialtyId; frontend nhóm theo id.

## Lỗi và tích hợp

- 400: dữ liệu hoặc header thiếu/sai định dạng.
- 401: token thiếu, sai chữ ký, hết hạn, sai issuer hoặc audience.
- 403: thiếu quyền.
- 404: tài nguyên không tồn tại hoặc không thuộc người dùng.
- 409: lịch trùng, quá hạn đổi/hủy, sai phiên bản hoặc xung đột dữ liệu.
- 422: khoảng thời gian hoặc dữ liệu nghiệp vụ không hợp lệ.
- 503: lưu trữ hoặc audit không khả dụng.

Frontend cần tải lại lịch trống khi nhận 409; chỉ xác nhận thành công sau khi API trả kết quả. Chức năng đổi/hủy khả dụng khi lịch CONFIRMED và còn ít nhất 2 giờ trước giờ bắt đầu. Việc ẩn nút ở frontend không thay thế kiểm tra của backend.

Thông báo được gửi sau commit. SENT nghĩa là SMTP đã chấp nhận, không xác nhận người dùng đã đọc. Lỗi gửi không hoàn tác lịch hẹn.

## Quan hệ với đặc tả toàn hệ thống

[openapi.yaml](openapi.yaml) là bản thiết kế cho chín phân hệ; [openapi.json](openapi.json) phản ánh API đang chạy của tuần 3–4. Bản triển khai hiện sử dụng prefix /api và phản hồi lỗi ProblemDetail. Các API khám bệnh, hàng đợi, video và nhắc lịch định kỳ chưa được triển khai; không coi toàn bộ hợp đồng thiết kế đã được nghiệm thu.
