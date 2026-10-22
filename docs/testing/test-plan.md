# Kế hoạch kiểm thử

## 1. Mục tiêu và phạm vi

Kiểm thử đánh giá mức độ đáp ứng 24 yêu cầu chức năng, 12 yêu cầu phi chức năng và các quy tắc nghiệp vụ của chín phân hệ. Các nội dung trọng tâm gồm tính nhất quán của lịch hẹn, phân quyền truy cập hồ sơ và xử lý gián đoạn trong quá trình khám từ xa.

Trạng thái hiện tại: lập kế hoạch; chưa thực thi kiểm thử phần mềm.

## 2. Phương pháp kiểm thử

| Nhóm kiểm thử | Nội dung |
|---|---|
| Đơn vị | Quy tắc thời gian, chuyển trạng thái, kiểm tra quyền và điều kiện nhắc lịch |
| Tích hợp | Giao dịch MySQL, hoàn tác, chống trùng lịch, nhật ký kiểm toán và hàng đợi thông báo |
| Hợp đồng API | Cấu trúc yêu cầu, phản hồi và mã lỗi theo OpenAPI; công cụ dự kiến: Playwright |
| Toàn trình | Đặt lịch → check-in hoặc tham gia khám từ xa → ghi hồ sơ, đơn thuốc → hoàn tất |
| Bảo mật | Truy cập trái quyền, mã truy cập hết hạn và nguy cơ lộ dữ liệu qua nhật ký |
| Phi chức năng | Tải đồng thời, lỗi mạng hoặc dịch vụ ngoài, sao lưu và phục hồi, khả năng sử dụng giao diện |

## 3. Dữ liệu và môi trường

Bộ dữ liệu kiểm thử gồm ít nhất hai bệnh nhân, hai bác sĩ, hai chuyên khoa và tài khoản tương ứng với năm vai trò. Toàn bộ dữ liệu bệnh nhân là dữ liệu mô phỏng.

Kiểm thử truy cập đồng thời sử dụng MySQL. Các thành phần mô phỏng dịch vụ ngoài được sử dụng để tái hiện lỗi; chức năng gửi thông báo và truyền âm thanh, hình ảnh được kiểm tra riêng với dịch vụ tích hợp.

Đánh giá khả năng sử dụng được thực hiện theo các tình huống của bệnh nhân, bác sĩ và lễ tân. Thành viên tham gia đảm nhận vai trò người dùng tương ứng trong môi trường thử nghiệm.

## 4. Tiêu chí hoàn thành

- Các tiêu chí chấp nhận được đáp ứng.
- Không còn lỗi ngăn cản các luồng nghiệp vụ chính.
- Các ca kiểm thử chống trùng lịch và phân quyền đạt yêu cầu.
- Độ bao phủ kiểm thử đơn vị đối với logic nghiệp vụ đạt tối thiểu 60%.

Mỗi lỗi được ghi nhận cùng điều kiện tái hiện, kết quả mong đợi và kết quả thực tế. Các ca liên quan được kiểm thử lại sau khi khắc phục.

## 5. Tài liệu liên quan

[Danh mục ca kiểm thử](test-cases.md) xác định tình huống và kết quả mong đợi. [Ma trận truy vết](../requirements/traceability-matrix.md) thể hiện mối liên hệ giữa yêu cầu, thiết kế và kiểm thử. Kết quả thực thi được ghi nhận độc lập với nội dung kế hoạch.
