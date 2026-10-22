# Mô hình dữ liệu logic

Mô hình dữ liệu được thiết kế cho MySQL, bao gồm các thực thể, thuộc tính và ràng buộc toàn vẹn.

| Thực thể | Khóa và thuộc tính chính | Ràng buộc và phân hệ quản lý |
|---|---|---|
| UserAccount | id CHAR(36) (UUID), issuer, subject, status | UNIQUE(issuer,subject); M01; không lưu mật khẩu IdP |
| UserRole | user_id, role | PK ghép; vai trò nội bộ, thay đổi có nhật ký kiểm toán |
| Patient | id, user_id, display_name, contact_encrypted | user_id unique; chỉ trường tối thiểu |
| Doctor | id, user_id, display_name, active | user_id unique; không xóa lịch sử |
| Specialty | id, name, active | name unique không phân biệt hoa/thường sau khi bỏ khoảng trắng đầu/cuối |
| DoctorSpecialty | doctor_id, specialty_id | PK ghép, liên kết N:N |
| Availability | id, doctor_id, start_at, end_at, slot_minutes, mode | start < end; slot_minutes >0 |
| TimeOff | id, doctor_id, start_at, end_at | không được chồng lịch hẹn hiệu lực |
| Slot | id, availability_id, doctor_id, start_at, end_at, mode | bảo toàn quan hệ doctor/availability; không chồng khung giờ cùng bác sĩ |
| Appointment | id, patient_id, doctor_id, slot_id, start_at, end_at, mode, status, version, cancellation_reason | FK; kiểm tra trùng khoảng doctor và patient; slot/doctor/mode nhất quán |
| Encounter | id, appointment_id, status, version | appointment_id unique; một lần khám/lịch |
| MedicalRecord | id, encounter_id, version, status, content_encrypted, author_id, supersedes_id, amendment_reason | UNIQUE(encounter_id,version), UNIQUE(supersedes_id); đã hoàn tất bất biến; bản bổ sung FINAL tham chiếu bản FINAL gần nhất, có lý do |
| Prescription | id, encounter_id, author_id, status, issued_at, version | issued có thời điểm và ≥1 item |
| PrescriptionItem | id, prescription_id, medicine_name, dose_text, route, frequency, duration_text | trường mô tả bắt buộc trước issue; không chứa thuật toán kê thuốc |
| QueueTicket | id, appointment_id, doctor_id, service_date, position, status | appointment_id unique; UNIQUE(doctor_id,service_date,position); vị trí lấy nguyên tử dưới khóa Doctor |
| TelehealthSession | id, appointment_id, provider_room_id, status, version, ended_at | appointment_id unique; provider_room_id unique; không lưu media/token dài hạn |
| NotificationJob | id, appointment_id, appointment_version, channel, due_at, status, attempts, dedupe_key, lease_until, provider_message_id | dedupe_key unique; snapshot tối thiểu, recheck trước gửi |
| OutboxEvent | id, aggregate_id, event_type, aggregate_version, status, created_at, lease_until | lưu cùng transaction; thông tin xử lý lấy từ aggregate_id/version, không chứa bệnh án |
| AuditEvent | id, actor_id, actor_type, actor_label, action, resource_type, resource_id, timestamp, result, correlation_id | chỉ INSERT đối với app; resource reference không xóa dây chuyền |
| IdempotencyRecord | actor_id CHAR(36), operation VARCHAR(64), request_key VARCHAR(128), request_hash, result_resource_id, expires_at | PK(actor_id,operation,request_key); cùng khóa nhưng khác nội dung yêu cầu → conflict |

## Toàn vẹn và chuẩn hóa

Danh mục chuyên khoa tách khỏi bác sĩ, bảng nối xử lý N:N; items tách khỏi prescription, vai trò tách khỏi account. Không lưu danh sách thuốc hoặc chuyên khoa phân cách bằng dấu phẩy. Đây là hướng chuẩn hóa đến 3NF; các snapshot phục vụ audit/thông báo là sao chép có chủ đích và không phải dữ liệu nguồn.

Thời điểm được lưu bằng DATETIME(6) theo quy ước UTC. Tầng ứng dụng chuyển đổi dữ liệu đầu vào sang UTC trước khi ghi và chuyển về Asia/Ho_Chi_Minh khi hiển thị. Ngày phục vụ hàng đợi dùng DATE và được xác định theo giờ phòng khám. Slot biểu diễn khoảng [start,end). DATETIME không lưu kèm múi giờ; quy ước UTC được áp dụng thống nhất tại tầng ứng dụng và kết nối cơ sở dữ liệu.
Các thao tác đặt và đổi lịch sử dụng giao dịch InnoDB ở mức cô lập READ COMMITTED. Giao dịch khóa các bản ghi Doctor liên quan theo thứ tự ID, sau đó khóa Patient bằng SELECT ... FOR UPDATE; các bản ghi này tồn tại ngay cả khi chưa có lịch hẹn. Sau khi lấy khóa, hệ thống đọc lại lịch làm việc, lịch nghỉ và các lịch CONFIRMED/CHECKED_IN/IN_PROGRESS để kiểm tra điều kiện giao nhau: existing.start < requested.end và existing.end > requested.start. Khi đổi lịch, phép kiểm tra loại trừ chính lịch đang cập nhật. Mọi thao tác thay đổi lịch làm việc, lịch nghỉ hoặc trạng thái nhận lịch đều phải khóa cùng bản ghi Doctor. Các thao tác thay đổi lịch hẹn tuân theo cùng thứ tự khóa; khóa được giữ đến khi giao dịch hoàn tất. Cơ chế này bảo vệ cả trường hợp chưa có lịch để khóa, thay vì chỉ dựa vào UNIQUE trên slot_id. Các lịch đã kết thúc không giữ khung giờ.
Appointment lưu start_at/end_at như snapshot của Slot. Đặt/đổi lịch đồng bộ snapshot, doctor_id, slot_id và mode trong cùng giao dịch; client không được sửa độc lập. Không thay đổi thời gian Slot đã được tham chiếu bởi lịch hẹn; thay đổi lịch làm việc phải bảo toàn các khung giờ lịch sử.

Không cascade-delete bệnh án khi vô hiệu hóa user/doctor. Composition trong UML mô tả ownership, không thay thế chính sách lưu/xóa dữ liệu y tế.
Các chỉ mục phục vụ truy vấn: appointment(doctor_id,start_at), appointment(patient_id,start_at), queue(doctor_id,service_date,status,position), notification(status,due_at), audit_event(resource_id,timestamp). Hiệu quả của các chỉ mục được đánh giá thông qua kế hoạch thực thi truy vấn trong giai đoạn triển khai.

## Vòng đời và dữ liệu nhạy cảm

Hồ sơ và contact cần mã hóa khi lưu/backup theo NFR-04; khóa được quản lý ngoài DB. Bản final/issued không được ghi đè; amendment giữ tham chiếu phiên bản cũ. Giữ dữ liệu trong suốt đồ án, không có chức năng xóa vĩnh viễn hoặc xuất hồ sơ. Dữ liệu demo/test hoàn toàn giả.

Mô hình được biểu diễn trong [sơ đồ ERD](erd.png).

## Ánh xạ kiểu dữ liệu MySQL

| Dữ liệu | Kiểu lưu trữ |
|---|---|
| UUID và khóa ngoại tương ứng | CHAR(36), thống nhất cách biểu diễn chữ thường |
| Thời điểm | DATETIME(6), giá trị UTC |
| Ngày phục vụ hàng đợi | DATE |
| Phiên bản, thứ tự, số lần gửi | INT |
| Trạng thái, mã và chuỗi có giới hạn | VARCHAR với độ dài phù hợp từng trường |
| Nội dung đã mã hóa | BLOB |
| Cờ hoạt động | BOOLEAN |


## Ràng buộc bổ sung của mô hình

| Hạng mục | Quy định |
|---|---|
| ProviderEvent | PK(provider VARCHAR(64), event_id VARCHAR(255)), session_id CHAR(36) FK, received_at DATETIME(6); lưu dấu callback đã xử lý cùng giao dịch cập nhật phiên và audit |
| AuditEvent | actor_type USER yêu cầu actor_id khác NULL; actor_type SYSTEM yêu cầu actor_id NULL và actor_label xác định dịch vụ. Quan hệ UserAccount–AuditEvent là 0..1 ở phía tác nhân |
| MedicalRecord | supersedes_id NULL cho bản đầu; bản bổ sung yêu cầu supersedes_id và amendment_reason. Bản được tham chiếu phải thuộc cùng Encounter và là bản FINAL mới nhất |
| TelehealthSession | provider_room_id có thể NULL khi CREATED và nhà cung cấp chưa cấp phòng; ended_at NULL trước khi ENDED/CANCELLED |
| Prescription | issued_at NULL khi DRAFT; bắt buộc khi ISSUED. Không sửa nội dung ISSUED |
| QueueTicket | position > 0; service_date xác định theo múi giờ phòng khám. Check-in, gọi lượt, bỏ lượt và bắt đầu/kết thúc khám cùng sử dụng khóa Doctor |
| NotificationJob | attempts bắt đầu từ 0; lease_until NULL khi chưa được nhận xử lý; provider_message_id NULL trước khi nhà cung cấp chấp nhận |
| OutboxEvent | hỗ trợ thông báo và đóng phòng; worker lấy dữ liệu qua aggregate_id/version. Lease hết hạn cho phép nhận lại tác vụ sau khi worker gián đoạn |
| IdempotencyRecord | khóa xác định theo người dùng, thao tác và request_key; result_resource_id có thể NULL với kết quả hàng đợi rỗng. Lưu kết quả và khóa cùng giao dịch; TTL 24 giờ |
| Nullability chung | PK/FK sở hữu và các trường nghiệp vụ bắt buộc không nhận NULL; các trường tùy chọn nêu trên, cancellation_reason trước khi hủy và amendment_reason ở bản đầu có thể NULL |

Các giao dịch nhiều tài nguyên khóa Doctor theo ID tăng dần, tiếp đến Patient, Appointment, Encounter và các bản ghi phụ thuộc khi cần. Giao dịch chỉ thao tác một phần tài nguyên giữ nguyên thứ tự tương đối. Xung đột ràng buộc trả 409; lỗi lưu trữ/audit hoàn tác giao dịch và trả 503.

ERD tổng quan được bổ sung các góc nhìn [đặt lịch](erd-scheduling.png), [lâm sàng](erd-clinical.png) và [hạ tầng dữ liệu](erd-infrastructure.png). Các góc nhìn dùng cùng định nghĩa thực thể, không phải các cơ sở dữ liệu độc lập.
