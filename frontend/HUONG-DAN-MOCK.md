# Chạy ClinicCare frontend ở chế độ mock

## 1. Chuẩn bị

- Cài Node.js 22 từ phiên bản 22.12 trở lên trong nhánh 22, hoặc Node.js 24 trở lên. npm đi kèm Node.js.
- Dùng Chrome hoặc Edge bản hiện hành.
- Cần Internet khi cài các gói lần đầu. Không cần Java, MySQL, Docker, backend hoặc Keycloak để chạy mock.

Mở terminal tại thư mục `frontend` chứa `package.json`.

## 2. Khởi động

Trên Windows PowerShell:

```powershell
node --version
npm.cmd ci
npm.cmd run dev:mock -- --host 127.0.0.1
```

Trên macOS/Linux dùng `npm` thay cho `npm.cmd`.

Mở **http://127.0.0.1:5173/** và chọn tài khoản demo. Lệnh `dev:mock` bật chế độ giả lập của Vite. Bạn có thể chạy ngay với cấu hình mặc định.

Giữ terminal đang chạy; nhấn `Ctrl+C` để dừng. Những lần sau chỉ cần chạy lại lệnh `npm.cmd run dev:mock -- --host 127.0.0.1`.

## 3. Các vai trò để xem giao diện

| Tài khoản | Vai trò | Nội dung chính |
| --- | --- | --- |
| Trần Quản Trị | Quản trị | Bác sĩ, chuyên khoa, lịch làm việc, phân quyền |
| Nguyễn Minh Khoa / Hoàng Gia Bảo | Bác sĩ | Lịch, lịch hẹn, hàng đợi, khám, hồ sơ và đơn thuốc |
| Lê Thu Hà / Võ Minh Trí | Bệnh nhân | Đặt lịch, lịch hẹn, hồ sơ, khám từ xa |
| Phạm Lan Anh | Lễ tân | Tiếp đón, check-in, hàng đợi, thông báo |
| Đặng Kiểm Toán | Kiểm toán | Nhật ký kiểm toán |

Đổi vai trò bằng **Đăng xuất → xác nhận → chọn tài khoản khác**. Nên thao tác trong cùng một tab để giữ cùng bộ dữ liệu giả lập.

## 4. Luồng demo gợi ý

1. Chọn bác sĩ, vào **Lịch làm việc** để xem ca, thêm ca hoặc chọn ca để thêm/hủy khoảng nghỉ. Ca mới phải ở tương lai, thứ Hai–thứ Bảy, trong 08:00–17:00 giờ Việt Nam, không chồng ca của cùng bác sĩ.
2. Đăng xuất, chọn bệnh nhân, vào **Đặt lịch**, chọn bác sĩ và lượt còn trống. Muốn thử tiếp đón/khám hôm nay, chọn lượt hôm nay còn hợp lệ hoặc dùng lịch hẹn demo có sẵn.
3. Chọn lễ tân để xem lịch và thực hiện check-in theo thời điểm được phép; chọn bác sĩ để xử lý hàng đợi và lần khám tương ứng.
4. Chọn kiểm toán viên để xem các sự kiện phát sinh từ thao tác demo trong cùng tab.

Dữ liệu ban đầu được tạo theo ngày hiện tại. Một số thao tác phụ thuộc giờ thực tế, trạng thái lịch hẹn và quyền; nút bị khóa hoặc lỗi 403/409 có thể là điều kiện nghiệp vụ.

## 5. Dữ liệu và giới hạn của bản mock

- Dữ liệu và tài khoản đều giả lập, lưu trong `sessionStorage` của tab; tải lại trang vẫn giữ dữ liệu trong phiên tab đó. Các tab không đồng bộ thay đổi với nhau.
- Đặt lại dữ liệu: mở DevTools (`F12`), chọn Console, chạy `window.__clinicMockReset()` rồi chọn lại tài khoản. Thao tác này xóa các thay đổi demo trong tab.
- Bản mock dùng để xem giao diện và thử các luồng được mô phỏng. Kết quả mock không chứng minh đã tích hợp backend thật, xử lý tranh chấp giữa nhiều người dùng hoặc gửi email thực tế.
- Giao diện khám từ xa có sẵn; **bản mock thông thường chưa mô phỏng signaling để gọi video hai người qua hai tab**. Kiểm thử WebRTC riêng dùng fixture signaling và thiết bị âm thanh/hình ảnh giả. Cuộc gọi thật cần backend cùng cấu hình kết nối phù hợp.
- `npm run build` và `npm run preview` phục vụ bản production, không bật mock. Để xem mock, dùng đúng `npm run dev:mock`; mở trực tiếp `index.html` bằng cách nhấp đúp không chạy được ứng dụng.

## 6. Kiểm tra source (tùy chọn)

```powershell
npm.cmd test
npm.cmd run build
```

Kiểm tra giao diện tự động và WebRTC cần cài Chromium trước:

```powershell
npx.cmd playwright install chromium
npm.cmd run test:scan
npm.cmd run test:rtc
```

`test:scan` ghi kết quả từng trang vào `test-results/scan-*.json`; cần đọc các trường `errors`, `alerts`, `overflowPx` và `axe`, vì bài quét ghi nhận lỗi giao diện vào báo cáo chứ không chặn mọi lỗi bằng assertion.

## 7. Lỗi khởi động thường gặp

- **Không tìm thấy node/npm:** cài Node.js phù hợp rồi mở lại terminal.
- **PowerShell chặn npm.ps1:** dùng `npm.cmd` như các lệnh ở trên.
- **Port 5173 is already in use:** dừng phiên Vite cũ bằng `Ctrl+C`, hoặc chạy `npm.cmd run dev:mock -- --host 127.0.0.1 --port 5176`, rồi mở cổng 5176.
- **Hiện trang Keycloak:** dừng server và khởi động lại bằng `dev:mock`; kiểm tra terminal đang đứng trong thư mục `frontend`.
- **Dữ liệu demo cũ hoặc vai trò không phù hợp:** đăng xuất/chọn lại tài khoản; nếu cần bộ dữ liệu mới thì dùng lệnh reset ở trên.

