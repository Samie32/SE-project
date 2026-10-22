# Thiết kế quyền, bảo vệ dữ liệu và nhật ký kiểm toán

Thiết kế bảo mật xác định quyền truy cập theo vai trò và quan hệ giữa người dùng với tài nguyên.

## Ma trận phân quyền

| Tài nguyên/tác vụ | Bệnh nhân | Bác sĩ | Lễ tân | Quản trị | Kiểm toán |
|---|---|---|---|---|---|
| Lịch trống/danh mục hoạt động | Đọc | Đọc | Đọc | Quản lý | Không |
| Đặt/đổi/hủy lịch | Của mình | Đọc lịch được gán | Xem lịch để tiếp đón | Xem lịch để vận hành, không đặt/đổi/hủy thay bệnh nhân | Không |
| Lịch làm/ nghỉ | Không | Của mình | Đọc | Quản lý | Không |
| Check-in/hàng đợi | Xem lượt của mình | Hàng của mình | Quản lý quầy | Cấu hình | Không |
| Hồ sơ/đơn | Bản đã final/issued của mình | Đọc/ghi trong quan hệ điều trị | Không | Không mặc định | Không |
| Telehealth | Lịch của mình | Lịch được gán | Chỉ trạng thái lịch | Chỉ vận hành, không tham gia phiên khám | Không |
| Nhật ký kiểm toán | Không | Không | Không | Không mặc định | Đọc, không sửa/xóa |
| Role mapping | Không | Không | Không | Quản lý, có nhật ký kiểm toán | Đọc nhật ký kiểm toán |

Vai trò cấp cao không tự động có quyền lâm sàng. Backend kiểm tra cả vai trò và resource relation; đối chiếu patientId và doctorId trong yêu cầu với danh tính và quyền truy cập.

## Mối đe dọa và biện pháp kiểm soát

| Rủi ro | Kiểm soát | Kiểm chứng |
|---|---|---|
| IDOR hồ sơ/phiên | Phân quyền ở mức tài nguyên, không trả dữ liệu khi truy cập bị từ chối | TC-02/12/23 |
| Lộ PHI qua log/SMS | Giới hạn trường dữ liệu được ghi nhật ký và nội dung mẫu thông báo | TC-N04 |
| Cạnh tranh tạo lịch | Giao dịch, khóa và ràng buộc cơ sở dữ liệu | TC-08/09 |
| Token bị dùng lại/sai người | Expiry, audience, session binding; revoke khi kết thúc | TC-23/24 |
| Callback giả hoặc đến trễ | Chữ ký nhà cung cấp dịch vụ, event ID, kiểm tra trạng thái/version | TC-N06 |
| Sửa nhật ký kiểm toán | Tài khoản ứng dụng chỉ có quyền INSERT; tài khoản tra cứu riêng; sao lưu và kiểm tra toàn vẹn | TC-18 |
| Lộ backup/khóa | Mã hóa, quản lý khóa riêng và giới hạn quyền restore | TC-N03/N07 |
| Audit hỏng | Ghi cùng transaction; từ chối trả dữ liệu nhạy cảm nếu không ghi được nhật ký | TC-17 |

Không lưu token và nội dung lâm sàng trong audit. Tài khoản ứng dụng chỉ INSERT nhật ký kiểm toán; vai trò kiểm toán chỉ đọc. Dữ liệu giả được giữ suốt đồ án, không có API xóa audit.
Bệnh nhân xác nhận tham gia phiên từ xa; không ghi hình. Chức năng xuất hồ sơ và chứng nhận tuân thủ pháp lý nằm ngoài phạm vi đồ án.

## Audit hệ thống và quyền tham gia phiên

Audit ghi nhận tác nhân USER bằng tài khoản nội bộ; tác vụ nền dùng tác nhân SYSTEM với tên dịch vụ. Các thao tác bị từ chối không trả dữ liệu nhạy cảm; thông tin sự kiện không chứa token hay nội dung hồ sơ.

Cấp token tham gia yêu cầu xác nhận của bệnh nhân và kiểm tra phiên hiện tại. Khi kết thúc, hệ thống từ chối cấp mới ngay và gửi tác vụ thu hồi/đóng phòng đến nhà cung cấp. Nếu dịch vụ ngoài lỗi, trạng thái tác vụ còn chờ xử lý phải được theo dõi; không coi việc đổi trạng thái trong MySQL là bằng chứng nhà cung cấp đã đóng luồng media.

Bệnh nhân tự đặt/đổi/hủy lịch của mình. Quyền điều phối của lễ tân/quản trị giới hạn ở xem lịch và các tác vụ được đặc tả riêng; không bao gồm đặt thay hoặc vượt hạn đổi/hủy.
