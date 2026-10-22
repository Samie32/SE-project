# Quy trình nghiệp vụ

Các quy trình mô tả hoạt động của phòng khám trong phạm vi đồ án, từ công bố lịch làm việc đến hoàn tất lần khám và lưu trữ hồ sơ.

| Mã | Quy trình | Tác nhân hoặc thành phần tham gia | Luồng chính | Ngoại lệ |
|---|---|---|---|---|
| BP-01 | Công bố lịch làm việc | Bác sĩ, quản trị viên | Kiểm tra quyền → xác định khoảng làm việc và lịch nghỉ → công bố khung giờ nhận khám | Từ chối thay đổi nếu ảnh hưởng đến lịch hẹn còn hiệu lực |
| BP-02 | Đặt, đổi và hủy lịch | Bệnh nhân | Chọn khung giờ → kiểm tra điều kiện → lưu giao dịch → gửi thông báo | Khung giờ đã được đặt hoặc yêu cầu quá hạn: thông báo xung đột; đổi lịch thất bại giữ nguyên lịch cũ |
| BP-03 | Khám trực tiếp | Lễ tân, bác sĩ, bệnh nhân | Xác minh bệnh nhân → check-in → xếp hàng → gọi lượt → khám → hoàn tất hồ sơ | Check-in lặp trả lại phiếu đã có; bệnh nhân chưa sẵn sàng được chuyển xuống cuối hàng; xử lý vắng mặt theo quy tắc thời gian |
| BP-04 | Khám từ xa | Bác sĩ, bệnh nhân | Vào phòng chờ → kiểm tra quyền → tham gia phiên → tư vấn → kết thúc phiên → hoàn tất hồ sơ | Mất kết nối: thử kết nối lại hoặc chuyển sang âm thanh; không tự động hoàn tất lần khám |
| BP-05 | Lập hồ sơ và đơn thuốc | Bác sĩ phụ trách | Xem lịch sử được phép truy cập → lập bản nháp → kiểm tra nội dung → hoàn tất hồ sơ hoặc phát hành đơn thuốc | Xung đột phiên bản: từ chối ghi đè; chỉnh sửa hồ sơ đã hoàn tất bằng bản bổ sung có lý do |
| BP-06 | Nhắc lịch | Bộ xử lý thông báo, dịch vụ Email/SMS | Lấy tác vụ đến hạn → kiểm tra lịch hẹn → gửi thông báo → cập nhật kết quả | Lỗi tạm thời: gửi lại với số lần giới hạn; lịch không còn hợp lệ: bỏ qua tác vụ; phản hồi trùng lặp: chỉ xử lý một lần |
| BP-07 | Tra cứu nhật ký kiểm toán | Kiểm toán viên | Nhập bộ lọc → truy xuất sự kiện → đối chiếu thao tác | Từ chối truy cập không đủ quyền; không cung cấp thao tác sửa hoặc xóa nhật ký |

Nhân viên thực hiện xác minh bệnh nhân, xác nhận tình trạng có mặt và quyết định chuyên môn. Hệ thống quản lý lịch, hàng đợi và trạng thái xử lý theo [quy tắc nghiệp vụ](../requirements/business-rules.md).

Các quy trình được biểu diễn trong sơ đồ [đặt lịch](../design/activity-diagrams/booking.png), [khám trực tiếp](../design/activity-diagrams/consultation.png), [khám từ xa](../design/activity-diagrams/telehealth-consultation.png) và [trạng thái lịch hẹn](../design/state-diagrams/appointment.png). Luồng chi tiết được trình bày trong [đặc tả ca sử dụng](use-cases.md).
