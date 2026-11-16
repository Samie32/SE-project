# Chuyển sang frontend gộp theo hợp đồng 1.0.0

Ngày 16/11/2026. Theo yêu cầu thay frontend chính bằng `frontend-unified.zip` và sửa để chuẩn bị nối BE.

1. Đưa source ZIP vào `frontend/` làm ứng dụng chính; giữ các thư mục patient/doctor cũ để đối chiếu, không dùng trong Compose mới.
2. Kiểm thử rồi sửa adapter URL/header/body, key retry, profile, queue, audit và endpoint detail/current clinical theo hợp đồng.
3. Sửa UI khám bệnh để mở lại DRAFT, cập nhật đơn có sẵn, theo dõi session bằng GET và quản lý token hết hạn. Chuẩn bị adapter signaling; truyền media WebRTC hai phía vẫn cần công việc và nghiệm thu riêng.
4. Chuyển Compose/CI/hướng dẫn sang frontend gộp; mặc định API thật, mock chỉ bật bằng lệnh riêng.
5. Chạy test, typecheck/build, kiểm tra browser và cấu hình Compose. Không sửa backend; giữ rõ các mục BE-01…04 còn mở. Tiếp tục bàn giao trên nhánh `docs/52400244-demo-data` đã được người dùng chỉ định; commit tiếng Việt chi tiết, không merge vào main.

Đích kiểm chứng: request adapters gửi đúng hợp đồng; key được giữ khi kết quả chưa xác định; tải lại ca khám có encounter và draft đúng; lỗi queue 404 không bị nuốt thành hết hàng; audit không crash vì tên trường ngày; phòng đã đóng được nhận biết qua GET. Build/test chỉ xác nhận phần chuẩn bị FE, không thay nghiệm thu API/Keycloak/MySQL/media thật.
