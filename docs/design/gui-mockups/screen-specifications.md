# Đặc tả màn hình và wireframe mức thấp


| Màn hình | Vai trò / UC | Nội dung, hành động | Trạng thái lỗi hoặc không có dữ liệu |
|---|---|---|---|
| Đăng nhập | Người dùng hệ thống / UC-01 | Chuyển IdP, trạng thái phiên | Đăng nhập thất bại, thử lại |
| Danh mục bác sĩ | Quản trị / UC-03/04 | Chuyên khoa, trạng thái, chỉnh sửa | Trùng/thiếu dữ liệu; còn lịch chưa xử lý |
| Lịch làm việc | Bác sĩ / UC-05/06 | Ngày, giờ, khung giờ, hình thức, nghỉ | Chỉ rõ lịch bị ảnh hưởng |
| Đặt lịch | Bệnh nhân / UC-07/08 | Chuyên khoa → bác sĩ → ngày/slot → xác nhận | Slot vừa hết: tải lại và giữ bộ lọc |
| Lịch của tôi | Bệnh nhân / UC-09/10 | Ngày, hình thức, trạng thái; đổi/hủy có xác nhận | Nêu lý do không thể đổi/hủy |
| Bảng tiếp đón | Lễ tân / UC-19/21 | Tìm lịch, xác minh, check-in, số lượt | Check-in lặp trả lượt cũ |
| Hàng khám | Bác sĩ / UC-20/11 | WAITING/CALLED/IN_SERVICE; gọi/bắt đầu | Hàng rỗng, phiếu chờ đã được nhận |
| Hồ sơ và đơn | Bác sĩ/bệnh nhân / UC-12/13/14 | Bản nháp, hồ sơ hoàn tất và lịch sử phiên bản; đơn theo dòng | Xung đột phiên bản, lỗi trường, chưa phát hành |
| Trung tâm thông báo | Nhân viên điều phối / UC-15/16 | Tác vụ gửi thông báo, trạng thái, lỗi đã che dữ liệu nhạy cảm | Lỗi dịch vụ tích hợp, thử lại hết hạn |
| Nhật ký kiểm toán | Kiểm toán / UC-18 | Bộ lọc actor/tài nguyên/thời gian, phân trang | Không có kết quả/không có quyền |
| Phòng khám từ xa | Hai bên / UC-22/23/24 | Thiết bị, phòng chờ, video/audio, kết thúc | Micro bị chặn, mất mạng, phiên đã đóng |

## Wireframe đặt lịch

```text
Đặt lịch khám                    Giờ phòng khám: Asia/Ho_Chi_Minh
[Chuyên khoa v] [Bác sĩ v]        [Ngày khám ____]
[Trực tiếp ( )  Từ xa ( )]
Khung giờ còn trống: [09:00] [09:20] [09:40]
Tóm tắt: bác sĩ | ngày/giờ | hình thức
[Quay lại]                       [Xác nhận đặt lịch]
Vùng phản hồi: đang xử lý / đã đặt / khung giờ không còn trống
```

## Wireframe hồ sơ và phòng từ xa

```text
Tên bệnh nhân (đã kiểm tra quyền) | Lịch hẹn | Trạng thái
[Lịch sử được phép xem]           [Bản nháp lần khám]
                                 [Nội dung khám ........]
                                 [Đơn thuốc: thêm dòng]
                                 [Lưu nháp] [Hoàn tất hồ sơ]

Phòng từ xa: Đang chờ / Đang khám / Mất kết nối
[Video bác sĩ] [Video bệnh nhân]  [Micro] [Camera]
[Thử kết nối lại]                [Kết thúc phiên]
Thông báo: Kết thúc cuộc gọi chưa đồng nghĩa hoàn tất hồ sơ.
```

Nhãn trường dữ liệu và thông báo lỗi được trình bày rõ ràng. Giao diện hỗ trợ điều hướng bằng bàn phím và chỉ báo vị trí tương tác; trạng thái được thể hiện bằng văn bản bên cạnh màu sắc. Các thao tác hoàn tất, hủy và kết thúc yêu cầu xác nhận. Khi mất kết nối, hệ thống kiểm tra trạng thái giao dịch trước khi cho phép gửi lại yêu cầu đặt lịch.

## Điều khiển theo vòng đời

- Phòng chờ yêu cầu xác nhận tham gia trước khi gọi joinSession với participationConfirmed=true. Bác sĩ bắt đầu phiên qua startSession rồi lấy token bằng joinSession.
- Bác sĩ có các thao tác riêng: Kết thúc phiên, Hoàn tất hồ sơ và Hoàn tất lần khám. Hoàn tất lần khám chỉ khả dụng khi hồ sơ FINAL và phiên từ xa ENDED nếu có.
- Màn hình tiếp đón cho phép bệnh nhân đã check-in đúng giờ tiếp tục chờ sau start +15 phút; không hiển thị thao tác NO_SHOW cho CHECKED_IN.
- Phiên CANCELLED do lịch NO_SHOW hiển thị lý do không thể tham gia. Phiên ACTIVE/RECONNECTING vẫn cho phép đúng người kết nối lại sau cửa sổ tham gia ban đầu.
- Khi dịch vụ ngoài chưa xác nhận đóng phòng, giao diện phân biệt trạng thái phiên đã kết thúc trong hệ thống và tác vụ thu hồi đang xử lý.
