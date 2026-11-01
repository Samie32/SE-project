# Thiết kế triển khai backend

## Cấu trúc và giao dịch

Spring Boot modular monolith, Java 21, Spring JDBC, MySQL 8.4 InnoDB, Flyway. Controller kiểm tra định dạng; service kiểm tra quyền và quản lý giao dịch; Db chuẩn hóa truy vấn tham số và ánh xạ snake_case sang camelCase.

Các module auth, catalog, availability, appointment, audit, notification nằm trong com.clinic. Các quy trình lâm sàng chưa được triển khai trong tuần 3–4.

Đặt/đổi lịch dùng READ COMMITTED: dành idempotency key, khóa Doctor theo ID tăng dần, khóa Patient, đọc lại lịch và kiểm tra xung đột. Khóa trên hàng Doctor/Patient tồn tại sẵn bảo vệ cả trường hợp chưa có lịch hẹn. Tạo lịch nghỉ và vô hiệu hóa bác sĩ cùng khóa Doctor. Đổi lịch kiểm tra version sau khi đã lấy khóa; lỗi giữ nguyên lịch cũ.

Khoảng thời gian dùng [start,end), cho phép các lịch liền kề. Một phòng khám, múi giờ Asia/Ho_Chi_Minh, thứ Hai–thứ Bảy 08:00–17:00. Khoảng làm việc trong một ngày, chính xác đến phút và chia hết cho thời lượng slot. Khung giờ mặc định trong dữ liệu demo là 20 phút.

## Dữ liệu

Migration V1__scheduling.sql tạo tài khoản, vai trò, bệnh nhân, bác sĩ, chuyên khoa, lịch làm việc/nghỉ, slot, appointment, audit, idempotency và notification_job.

Thời gian MySQL là DATETIME(6) UTC; cấu hình JDBC ép timezone UTC. Lịch hẹn lưu snapshot thời điểm từ slot. Trạng thái lịch mới CONFIRMED; tuần 4 triển khai đổi lịch và CANCELLED. Các trạng thái khám được dành cho giai đoạn sau.

Email liên hệ mã hóa AES-256-GCM, nonce ngẫu nhiên từng lần ghi; khóa nằm trong biến môi trường. Audit không chứa email, nội dung bệnh án, token hoặc mật khẩu. Migration tạo trigger chặn UPDATE/DELETE audit; thay đổi dữ liệu và audit cùng giao dịch.

## Thông báo xác nhận

notification_job là transactional outbox chuyên biệt cho BOOKED, RESCHEDULED, CANCELLED, được ghi cùng giao dịch lịch hẹn và audit. Worker nhận tác vụ bằng SKIP LOCKED và lease 60 giây; lease token ngăn worker cũ cập nhật kết quả của lần nhận mới.

Trước gửi kiểm tra version hiện tại, tác vụ cũ chuyển SKIPPED. Lỗi SMTP thử lại thêm tối đa 3 lần sau 1, 5 và 15 phút. SMTP timeout giới hạn 5 giây. Worker phục hồi tác vụ PROCESSING khi lease hết hạn.

Cơ chế gửi là at-least-once: nếu SMTP đã nhận nhưng DB chưa lưu SENT, lần phục hồi có thể gửi lại. SMTP không bảo đảm exactly-once. Nhắc trước giờ khám và SMS thật thuộc giai đoạn sau.

## Môi trường và giới hạn

Compose local tách MySQL, Keycloak, Mailpit và backend. Testcontainers tạo MySQL riêng cho kiểm thử; không dùng H2 thay thế kiểm thử khóa. Cấu hình demo và dữ liệu giả chỉ được nạp khi bật profile demo.

Compose chỉ bind cổng vào localhost. HTTP, Keycloak start-dev và quyền DB dùng cho migration local không phải cấu hình production. HTTPS, phân tách tài khoản migration/runtime, vận hành sao lưu/phục hồi đầy đủ nằm ở giai đoạn triển khai sau.

Nguồn tham khảo kỹ thuật: [Spring Boot 3.5](https://docs.spring.io/spring-boot/3.5/system-requirements.html), [Spring Security JWT](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html).
