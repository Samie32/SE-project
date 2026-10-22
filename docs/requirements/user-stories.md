# Yêu cầu người dùng (User stories)

Các user story mô tả nhu cầu theo vai trò, chức năng mong muốn và giá trị sử dụng. Mỗi story liên kết với yêu cầu chức năng và tiêu chí chấp nhận tương ứng.

| ID | User story | FR / AC | Phụ thuộc | Sprint dự kiến |
|---|---|---|---|---|
| US-01 | Là bệnh nhân, tôi muốn truy cập tài khoản được xác thực, để bảo vệ thông tin cá nhân và vào đúng khu vực chức năng. | FR-01 / AC-01 | IdP/quyền | 2 |
| US-02 | Là quản trị, tôi muốn giới hạn tác vụ theo vai trò, để ngăn người không có quyền thực hiện tác vụ nhạy cảm. | FR-02 / AC-02 | IdP/quyền | 2 |
| US-03 | Là quản trị, tôi muốn quản lý danh mục phục vụ tìm lịch, để bệnh nhân tìm đúng bác sĩ theo nhu cầu khám. | FR-03 / AC-03 | M01; dữ liệu được phân quyền | 2 |
| US-04 | Là quản trị, tôi muốn ngừng tiếp nhận lịch mới và bảo toàn lịch sử khám, để không nhận thêm lịch khi bác sĩ ngừng làm việc. | FR-04 / AC-04 | M01; dữ liệu được phân quyền | 2 |
| US-05 | Là bác sĩ, tôi muốn công bố thời gian nhận khám, để bệnh nhân chỉ đặt trong thời gian tôi có thể tiếp nhận. | FR-05 / AC-05 | M01; dữ liệu được phân quyền | 2 |
| US-06 | Là bác sĩ, tôi muốn chặn nhận lịch khi nghỉ, để không có lịch mới trong thời gian tôi vắng mặt. | FR-06 / AC-06 | M01; dữ liệu được phân quyền | 2 |
| US-07 | Là bệnh nhân, tôi muốn chọn giờ khám phù hợp, để chủ động sắp xếp thời gian đến khám. | FR-07 / AC-07 | M01; dữ liệu được phân quyền | 2 |
| US-08 | Là bệnh nhân, tôi muốn nhận xác nhận đặt lịch khám, để biết chắc lịch hẹn của mình đã được ghi nhận. | FR-08 / AC-08 | M01; lịch hợp lệ | 2 |
| US-09 | Là bệnh nhân, tôi muốn đổi giờ mà không mất lịch đang có, để điều chỉnh kế hoạch mà vẫn giữ lịch nếu đổi thất bại. | FR-09 / AC-09 | M01; lịch hợp lệ | 2 |
| US-10 | Là bệnh nhân, tôi muốn giải phóng lịch không thể tham gia, để phòng khám có thể sử dụng lại thời gian đã giữ. | FR-10 / AC-10 | M01; lịch hợp lệ | 2 |
| US-11 | Là bác sĩ, tôi muốn theo dõi tiến trình khám chính xác, để nhân viên cùng biết lượt khám đang ở bước nào. | FR-11 / AC-11 | M01; lịch hợp lệ | 2 |
| US-12 | Là bác sĩ, tôi muốn xem thông tin phục vụ lần khám được phân công, để có thông tin của các lần khám trước khi tiếp nhận bệnh nhân. | FR-12 / AC-12 | M01; dữ liệu được phân quyền | 3 |
| US-13 | Là bác sĩ, tôi muốn lưu kết quả lần khám, để thông tin lần khám được lưu đúng và có thể truy vết. | FR-13 / AC-13 | M01; dữ liệu được phân quyền | 3 |
| US-14 | Là bác sĩ, tôi muốn phát hành đơn thuốc điện tử, để bệnh nhân có thể tra cứu chỉ định sau lần khám. | FR-14 / AC-14 | M01; dữ liệu được phân quyền | 3 |
| US-15 | Là bệnh nhân, tôi muốn nhận nhắc lịch qua kênh đã chọn, để hạn chế quên giờ khám đã đặt. | FR-15 / AC-15 | M01; dữ liệu được phân quyền | 3 |
| US-16 | Là nhân viên điều phối, tôi muốn theo dõi thông báo không gửi được, để kịp xử lý các lần gửi thất bại. | FR-16 / AC-16 | M01; dữ liệu được phân quyền | 3 |
| US-17 | Là kiểm toán viên, tôi muốn truy vết truy cập hồ sơ, để xác định ai đã đọc hoặc thay đổi dữ liệu nhạy cảm. | FR-17 / AC-17 | M01; dữ liệu được phân quyền | 3 |
| US-18 | Là kiểm toán viên, tôi muốn tra cứu dấu vết mà không làm đổi lịch sử, để đối chiếu sự kiện mà vẫn giữ nguyên bằng chứng. | FR-18 / AC-18 | M01; dữ liệu được phân quyền | 3 |
| US-19 | Là lễ tân, tôi muốn ghi nhận bệnh nhân đã đến và xếp vào hàng đợi, để bác sĩ biết bệnh nhân đã có mặt. | FR-19 / AC-19 | M01; lịch hợp lệ | 3 |
| US-20 | Là bác sĩ, tôi muốn gọi đúng lượt tiếp theo, để giảm việc gọi nhầm hoặc gọi trùng lượt. | FR-20 / AC-20 | M01; lịch hợp lệ | 3 |
| US-21 | Là lễ tân, tôi muốn xử lý bệnh nhân chưa sẵn sàng, để hàng chờ tiếp tục hoạt động khi một người chưa sẵn sàng. | FR-21 / AC-21 | M01; lịch hợp lệ | 3 |
| US-22 | Là bệnh nhân, tôi muốn vào đúng phòng khám trực tuyến, để chuẩn bị thiết bị trước khi bác sĩ bắt đầu. | FR-22 / AC-22 | M01; lịch hợp lệ | 3 |
| US-23 | Là bác sĩ, tôi muốn tư vấn đúng bệnh nhân trong phiên được phân công, để hai bên trao đổi từ xa trong phòng đúng lịch hẹn. | FR-23 / AC-23 | M01; lịch hợp lệ | 3 |
| US-24 | Là bác sĩ, tôi muốn xử lý gián đoạn mà giữ hồ sơ khám, để bảo toàn thông tin đã lưu khi kết nối bị gián đoạn. | FR-24 / AC-24 | M01; lịch hợp lệ | 3 |

Các quan hệ phụ thuộc thể hiện điều kiện về dữ liệu và nghiệp vụ cần đáp ứng khi triển khai.

Kế hoạch gồm bốn sprint trong [8 tuần thực hiện](../project-plan.md). Sprint 1 tập trung phân tích và thiết kế; Sprint 2 triển khai các chức năng nền tảng và lịch hẹn; Sprint 3 hoàn thiện nghiệp vụ khám bệnh và tích hợp; Sprint 4 dành cho kiểm thử, sửa lỗi và bàn giao. Các chức năng phân quyền và ghi nhật ký được tích hợp xuyên suốt các sprint triển khai.
