# Hướng dẫn sử dụng – bản nháp (chưa được xác nhận trên phần mềm thực tế)

**Áp dụng cho hệ thống phòng khám ngoại trú và khám từ xa.** Giao diện có thể thay đổi trong quá trình lập trình. Thay tên nút, đường dẫn, ảnh chụp bằng bản triển khai thật trước khi bàn giao.

## 1. Chuẩn bị

1. Dùng đường dẫn môi trường demo do nhóm cung cấp (hiện chưa có URL đã xác minh).
2. Đăng nhập với tài khoản **thử nghiệm theo vai trò**, qua IdP test; không sử dụng tài khoản thật.
3. Chuyển đổi thời gian trên giao diện theo Asia/Ho_Chi_Minh.

## 2. Người dùng bệnh nhân

### Tìm bác sĩ và đặt lịch

Đăng nhập → tìm bác sĩ/chuyên khoa → chọn ngày → chọn slot còn trống → xác nhận đặt lịch → xem lịch CONFIRMED. Khi hai người đặt cùng slot, chỉ một người được chấp nhận; người còn lại cần chọn slot khác.

### Đổi/hủy lịch

Từ lịch CONFIRMED chọn đổi hoặc hủy khi còn ít nhất **2 giờ** trước thời điểm bắt đầu; nếu không đạt thời hạn, hệ thống phải từ chối. Sau đổi/hủy, kiểm tra lịch và thông báo được cập nhật.

### Khám trực tuyến

Trong cửa sổ từ T−10 phút đến trước T+15 phút, vào phòng chờ, kiểm camera/micro, xác nhận tham gia. Chỉ bệnh nhân và bác sĩ được phân công có quyền vào phiên hợp lệ. Không tự coi mất kết nối là kết thúc khám.

## 3. Bác sĩ

Đăng nhập → xem lịch làm việc/lịch nghỉ → danh sách bệnh nhân được phân công. Khi tiếp nhận khám trực tiếp: chỉ bắt đầu từ phiếu chờ CALLED hợp lệ; nhập hồ sơ DRAFT, hoàn tất thành FINAL; kê đơn nếu đủ nội dung; hoàn tất lần khám bằng thao tác riêng. Khi khám từ xa: kết thúc phiên trước khi hoàn tất lần khám.

## 4. Lễ tân

Đăng nhập → tìm lịch trực tiếp CONFIRMED → xác minh bệnh nhân → check-in trong khoảng T−15 phút đến trước T+15 phút → kiểm tra số thứ tự. Check-in lại cùng lịch không được tạo phiếu chờ thứ hai. Bỏ lượt phải có lý do và đưa phiếu về cuối hàng.

## 5. Quản trị viên

Theo quyền: quản lý danh mục bác sĩ, chuyên khoa, trạng thái hoạt động và vai trò. Không vô hiệu hóa bác sĩ khi còn lịch hiệu lực tương lai. Kiểm soát thay đổi quyền và nhật ký thao tác.

## 6. Kiểm toán viên

Theo quyền truy cập, tìm kiếm/lọc nhật ký kiểm toán theo thời gian/tác nhân; chỉ đọc. Không thể tự sửa hoặc xóa các sự kiện kiểm toán.

## 7. Lỗi thông thường

| Hiện tượng | Cách xử lý theo nghiệp vụ |
| --- | --- |
| 401 | Phiên đăng nhập không hợp lệ/hết hạn; đăng nhập lại |
| 409 | Xung đột lịch hoặc trạng thái không còn hợp lệ; tải lại dữ liệu |
| 422 | Dữ liệu chưa đạt yêu cầu (ví dụ đơn trống); kiểm tra thông tin nhập |
| Mất video/mạng | Thử nối lại cùng phiên còn hiệu lực, không tạo hồ sơ/lần khám trùng |
| Dịch vụ thông báo lỗi | Không mặc nhiên hủy lịch; kiểm tra trạng thái lịch và thông báo |

## 8. Danh mục hình cần chụp khi frontend hoàn thiện

- H1: đăng nhập; H2: tra cứu bác sĩ; H3: lịch trống; H4: đặt thành công/xung đột; H5: danh sách lịch.
- H6: check-in, hàng đợi; H7: màn bác sĩ; H8: hồ sơ DRAFT/FINAL; H9: đơn thuốc; H10: phòng chờ/video.
- H11: admin danh mục/quyền; H12: auditor log. Ảnh phải chụp **ứng dụng chạy thật** và không chứa PHI, mật khẩu, token.
