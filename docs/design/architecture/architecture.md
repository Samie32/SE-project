# Kiến trúc hệ thống — High-Level Design

Kiến trúc được mô tả theo mô hình 4+1, sử dụng React + TypeScript, Java Spring Boot và MySQL.

## Quyết định chính

Một backend modular monolith Spring Boot, frontend React + TypeScript, MySQL; phân lớp controller → application/domain service → repository. Module sở hữu dữ liệu, module khác gọi dịch vụ thay vì sửa bảng trực tiếp.


## Các góc nhìn kiến trúc 4+1

| Góc nhìn | Mô hình hoặc tài liệu | Nội dung |
|---|---|---|
| Logical | [Class](../class-diagram/class-diagram.png), [ERD](../database/erd.png) | Khái niệm nghiệp vụ và quan hệ dữ liệu |
| Process | [Booking sequence](../sequence-diagrams/book-appointment.png), [telehealth](../sequence-diagrams/telehealth.png) | Giao dịch, cạnh tranh và các tích hợp bất đồng bộ |
| Development | Bảng module bên dưới | Tách trách nhiệm, dependencies, lớp |
| Physical | [Deployment](deployment.png) | Browser, ứng dụng, private DB, providers |
| +1 Scenarios | [Use cases](../../analysis/use-cases.md) | UC-01–24 dẫn dắt thiết kế và kiểm thử |

## Trách nhiệm và phụ thuộc

| Phân hệ | Dữ liệu sở hữu | Phụ thuộc |
|---|---|---|
| M01 auth | UserAccount, vai trò mapping | IdP; M07 nhật ký kiểm toán |
| M02 doctor | Doctor, Specialty, DoctorSpecialty | M01; M04 kiểm tra lịch trước vô hiệu hóa |
| M03 availability | Availability, TimeOff, Slot | M02; M04 kiểm tra xung đột |
| M04 appointment | Appointment | M01/M03, M07; phát sự kiện M06 |
| M05 medicalrecord/prescription | Encounter, MedicalRecord, Prescription, Item | M04, M01, M07 |
| M06 notification | NotificationJob, delivery attempts | Outbox; Email/SMS nhà cung cấp dịch vụ |
| M07 security/audit | AuditEvent | Chính sách truy cập, kho nhật ký kiểm toán |
| M08 checkin/queue | QueueTicket | M04, M01, M07 |
| M09 telehealth | TelehealthSession | M04, M01, M07; video nhà cung cấp dịch vụ |

Patient liên kết tài khoản người dùng với dữ liệu bệnh nhân. Các chức năng liên quan được phân bổ trong các phân hệ hiện có; hệ thống không tách riêng phân hệ quản lý bệnh nhân.


## Tích hợp và lỗi

- Chức năng đăng nhập sử dụng OAuth2/OIDC Authorization Code + PKCE. Tích hợp IdP qua adapter; access token giữ trong bộ nhớ client, hết hạn thì đăng nhập lại.
- Backend kiểm tra issuer/audience/expiry và quyền nội bộ; browser không tự quyết định quyền.
- Media đi qua video nhà cung cấp dịch vụ; backend điều phối admission/session. Callback phải được xác minh và loại bỏ bản trùng theo event ID/version.
- Thông báo: thử lại hữu hạn với backoff; khả năng bảo đảm gửi đúng một lần phụ thuộc vào cơ chế chống xử lý lặp của dịch vụ tích hợp. Trạng thái SENT chỉ xác nhận nhà cung cấp dịch vụ nhận, DELIVERED chỉ khi có receipt.
- HTTP 400 định dạng, 401 chưa xác thực, 403 thiếu quyền, 404 không thấy tài nguyên được phép, 409 conflict/version, 422 dữ liệu nghiệp vụ sai, 503 phụ thuộc hoặc nhật ký kiểm toán không khả dụng. Không trả stack trace hay nội dung PHI trong lỗi.

## Đồng bộ các vòng đời nghiệp vụ

Các giao dịch bắt đầu/kết thúc khám được mô tả trong [trình tự tiến trình khám](../sequence-diagrams/consultation-progress.png). Hoàn tất bản ghi, kết thúc media và hoàn tất Encounter là các thao tác riêng. Lệnh hoàn tất Encounter chỉ thành công khi hồ sơ FINAL và phiên từ xa ENDED nếu có.

Bộ xử lý nền xử lý các tác vụ đã commit bằng lease có thời hạn. Thông báo được thử lại theo BR-11; đóng phòng từ xa được lưu trong outbox và thử lại đến khi nhà cung cấp xác nhận. Trong thời gian này hệ thống không cấp token mới, nhưng chỉ đánh dấu đóng phòng tại nhà cung cấp thành công khi có xác nhận. Sự kiện callback được lưu dấu trong ProviderEvent để loại trùng trong cùng giao dịch cập nhật trạng thái.

Việc tạo phòng tại nhà cung cấp nằm ngoài giao dịch khóa dữ liệu. Sau khi nhà cung cấp trả phòng, hệ thống kiểm tra lại lịch/phiên trước khi lưu và cấp quyền. Nếu lịch đã NO_SHOW, phòng được đưa vào tác vụ đóng thay vì cấp token.

Môi trường phát triển, kiểm thử và trình diễn sử dụng cấu hình, dữ liệu và thông tin bí mật tách biệt. Vòng Kỷ Phong phụ trách MySQL, môi trường, mã hóa đường truyền, sao lưu/phục hồi, đóng gói và CI/CD.
