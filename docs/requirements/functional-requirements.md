# Yêu cầu chức năng

Các yêu cầu được đặc tả theo điều kiện kích hoạt và hành vi của hệ thống.

| ID | Phân hệ | Nguồn | Yêu cầu hệ thống (EARS) |
|---|---|---|---|
| FR-01 | M01 | Đề bài | Khi IdP xác thực hợp lệ, hệ thống phải tạo phiên gắn đúng danh tính và quyền nội bộ. |
| FR-02 | M01 | Phạm vi cụ thể hóa hoặc mở rộng | Khi nhận yêu cầu được bảo vệ, hệ thống phải kiểm tra vai trò và quyền trên tài nguyên trước xử lý. |
| FR-03 | M02 | Phạm vi cụ thể hóa hoặc mở rộng | Khi quản trị tạo hoặc sửa bác sĩ, hệ thống phải lưu hồ sơ, chuyên khoa và trạng thái nhận lịch. |
| FR-04 | M02 | Phạm vi cụ thể hóa hoặc mở rộng | Khi ngừng hoạt động bác sĩ, hệ thống phải chặn nếu còn lịch tương lai chưa xử lý và giữ các hồ sơ lịch sử. |
| FR-05 | M03 | Đề bài | Khi lưu khoảng làm việc, hệ thống phải kiểm tra start/end, thời lượng khung giờ và tạo danh sách khung giờ trong khoảng. |
| FR-06 | M03 | Đề bài và phạm vi cụ thể hóa | Khi thêm lịch nghỉ, hệ thống phải chặn cập nhật nếu có lịch hẹn còn hiệu lực bị ảnh hưởng. |
| FR-07 | M03 | Đề bài | Khi tìm lịch, hệ thống phải chỉ trả khung giờ còn nhận lịch theo bác sĩ, ngày, chuyên khoa và hình thức khám. |
| FR-08 | M04 | Đề bài | Khi đặt khung giờ còn trống, hệ thống phải tạo lịch CONFIRMED và chống trùng bác sĩ/bệnh nhân trong cùng giao dịch. |
| FR-09 | M04 | Phạm vi cụ thể hóa hoặc mở rộng | Khi đổi lịch CONFIRMED còn ít nhất 2 giờ trước thời điểm bắt đầu, hệ thống phải cập nhật khung giờ trong một giao dịch nguyên tử, giữ lịch cũ nếu khung giờ mới không còn hợp lệ. |
| FR-10 | M04 | Phạm vi cụ thể hóa hoặc mở rộng | Khi hủy lịch CONFIRMED còn ít nhất 2 giờ trước thời điểm bắt đầu, hệ thống phải lưu lý do, chuyển CANCELLED và ngăn thông báo nhắc lịch cũ gửi tiếp. |
| FR-11 | M04 | Phạm vi cụ thể hóa hoặc mở rộng | Khi cập nhật tiến trình, hệ thống phải chỉ chấp nhận chuyển trạng thái và vai trò theo BR-07/08. |
| FR-12 | M05 | Đề bài | Khi bác sĩ có quan hệ điều trị truy cập lịch sử, hệ thống phải trả các bản được phép xem và ghi nhật ký kiểm toán trước phản hồi. |
| FR-13 | M05 | Đề bài | Khi bác sĩ lưu hồ sơ của lần khám, hệ thống phải kiểm tra quyền, phiên bản và giữ bản đã hoàn tất bất biến. |
| FR-14 | M05 | Đề bài | Khi bác sĩ phát hành đơn, hệ thống phải yêu cầu ít nhất một dòng thuốc đủ tên, mô tả liều dùng, đường dùng, tần suất và thời gian dùng. |
| FR-15 | M06 | Đề bài | Khi đến hạn nhắc, hệ thống phải gửi Email/SMS cho lịch còn CONFIRMED theo các mốc thời gian trong quy tắc nghiệp vụ. |
| FR-16 | M06 | Cụ thể hóa yêu cầu đề bài | Nếu nhà cung cấp lỗi tạm thời, hệ thống phải thử lại có giới hạn và hiển thị thất bại mà không hoàn tác giao dịch lịch hẹn đã hoàn thành. |
| FR-17 | M07 | Đề bài | Khi đọc/ghi dữ liệu nhạy cảm hoặc đổi quyền, hệ thống phải ghi nhật ký kiểm toán theo BR-13/16. |
| FR-18 | M07 | Đề bài | Khi người kiểm toán tìm nhật ký kiểm toán, hệ thống phải hỗ trợ lọc thời gian/tác nhân/tài nguyên và cấm sửa/xóa từ ứng dụng. |
| FR-19 | M08 | Phạm vi cụ thể hóa hoặc mở rộng | Khi check-in lịch trực tiếp CONFIRMED, hệ thống phải tạo đúng một phiếu chờ và đổi lịch sang CHECKED_IN trong một giao dịch nguyên tử. |
| FR-20 | M08 | Phạm vi cụ thể hóa hoặc mở rộng | Khi gọi tiếp, hệ thống phải lấy phiếu chờ WAITING đầu hàng của bác sĩ/ngày và chỉ cho một thao tác nhận phiếu chờ đó. |
| FR-21 | M08 | Phạm vi cụ thể hóa hoặc mở rộng | Khi trả phiếu chờ CALLED về hàng chờ, hệ thống phải ghi lý do và đặt cuối hàng mà không tạo phiếu chờ mới. |
| FR-22 | M09 | Phạm vi cụ thể hóa hoặc mở rộng | Khi lịch từ xa còn hiệu lực đến cửa sổ tham gia, hệ thống phải tạo hoặc lấy một phiên riêng gắn lịch. |
| FR-23 | M09 | Phạm vi cụ thể hóa hoặc mở rộng | Khi cấp quyền tham gia, hệ thống phải kiểm tra danh tính, lịch và trạng thái phiên trước cấp token ngắn hạn. |
| FR-24 | M09 | Phạm vi cụ thể hóa hoặc mở rộng | Nếu luồng âm thanh, hình ảnh bị ngắt, hệ thống phải cho phép nối lại phiên còn mở; khi bác sĩ kết thúc phải thu hồi quyền tham gia. |
