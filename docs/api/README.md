# Đặc tả giao diện lập trình ứng dụng

[Hợp đồng OpenAPI](openapi.yaml) xác định 30 thao tác API của chín phân hệ. Tên miền example.invalid được sử dụng làm địa chỉ minh họa trong tài liệu.

## Quy ước giao tiếp

- Dữ liệu trao đổi có định dạng JSON; mã định danh sử dụng UUID.
- Thời điểm bao gồm độ lệch múi giờ; giao diện hiển thị theo Asia/Ho_Chi_Minh.
- Các API danh sách sử dụng limit/offset, giới hạn tối đa 100 phần tử trong mỗi phản hồi.
- Phản hồi lỗi gồm code, message và correlationId; không chứa nội dung hồ sơ bệnh án hoặc thông tin truy vết lỗi nội bộ.

## Xác thực và kiểm soát truy cập

Dịch vụ danh tính thực hiện đăng nhập bằng OAuth2/OIDC. Backend kiểm tra mã truy cập và quyền trên tài nguyên. Mã truy cập được lưu trong bộ nhớ phía client; người dùng đăng nhập lại sau khi mã hết hạn.

Đối với chức năng tự đặt lịch, danh tính bệnh nhân được xác định từ phiên đăng nhập. Hệ thống không hỗ trợ đặt lịch thay cho người khác.

## Tính nhất quán của thao tác

Các yêu cầu cập nhật sử dụng số phiên bản để phát hiện xung đột. Khi xảy ra xung đột, hệ thống trả mã 409 và bảo toàn dữ liệu hiện tại.

Khóa Idempotency-Key được lưu trong 24 giờ theo tổ hợp tác nhân, thao tác và khóa yêu cầu. Yêu cầu sử dụng lại cùng khóa nhưng có nội dung khác bị từ chối với mã 409.

Thao tác bắt đầu khám tạo hoặc truy xuất lần khám duy nhất của lịch hẹn. Phản hồi lịch hẹn cung cấp encounterId để liên kết với các chức năng hồ sơ và đơn thuốc.

## Quy tắc nghiệp vụ và tích hợp

Điều kiện phân quyền, chuyển trạng thái, thời gian nhắc lịch, chính sách gửi lại và khoảng thời gian tham gia phiên khám tuân theo [quy tắc nghiệp vụ](../requirements/business-rules.md).

Các dịch vụ ngoài được tích hợp qua lớp kết nối độc lập. Hợp đồng API tập trung vào các luồng nghiệp vụ của hệ thống, không bao gồm giao diện quản trị của nhà cung cấp.

Tài liệu phản ánh giao diện hệ thống ở giai đoạn thiết kế; kết quả kiểm thử hợp đồng được xác lập khi triển khai.

## Quy ước vòng đời

prepareSession và startSession trả Session; joinSession nhận participationConfirmed=true và trả JoinToken. Kết thúc media, hoàn tất hồ sơ và hoàn tất lần khám là ba thao tác riêng. Tiến trình khám được mô tả trong [sequence tiến trình](../design/sequence-diagrams/consultation-progress.png) và [sequence telehealth](../design/sequence-diagrams/telehealth.png).

Các yêu cầu ghi có Idempotency-Key giữ khóa trong 24 giờ; khóa và kết quả được lưu cùng giao dịch. Hoàn tất bản ghi không tự hoàn tất lịch hẹn. Lịch NO_SHOW đóng phiên chờ, còn người đã check-in đúng giờ được tiếp tục chờ khám.
