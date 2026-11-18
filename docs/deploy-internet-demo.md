# Triển khai demo ClinicCare qua Internet

Cấu hình này dùng cho **dữ liệu mô phỏng** trên một máy chủ Linux. Nó hỗ trợ nghiệm thu FR-22–24 và NFR-04 bằng hai thiết bị ở hai mạng khác nhau. Các quy tắc tham gia phòng, room token, signaling và kết thúc phiên tiếp tục do backend hiện có xử lý.

## Chuẩn bị máy chủ

- Cài Docker Engine, Compose từ 2.24.4 và Python 3.10 trở lên. Dùng Docker Engine có hỗ trợ host networking cho Coturn.
- Trỏ hai bản ghi DNS A, ví dụ `clinic.example.org` và `auth.example.org`, về IPv4 công khai của máy chủ. Trỏ trực tiếp về máy chủ trong lần triển khai đầu để Caddy cấp HTTPS tự động. Nếu có bản ghi AAAA, cấu hình IPv6 cho HTTPS hoặc bỏ bản ghi đó.
- Cho phép **TCP 80/443** cho HTTPS, **UDP và TCP 3478** cho TURN và **UDP 49160–49200** cho media relay. Cấu hình cả firewall của nhà cung cấp và máy chủ. Nếu máy chủ có IP nội bộ ánh xạ sang IP công khai, giữ nguyên số cổng khi chuyển tiếp và dùng IP nội bộ của card mạng trong `--turn-bind-ip`. Ưu tiên máy chủ có IPv4 công khai gắn trực tiếp để giảm vấn đề NAT loopback khi cả hai phía dùng cùng TURN.
- Giữ MySQL, Mailpit, backend, Keycloak trực tiếp và dịch vụ cấp ICE trong mạng Docker. Caddy công khai web, đường dẫn API và các đường dẫn cần cho đăng nhập realm `clinic`.

## Tạo môi trường và khởi động

Từ thư mục gốc repository, thay hai hostname và IPv4 dưới đây bằng giá trị thật. Thêm `--turn-bind-ip IP_NOI_BO` nếu máy chủ nằm sau NAT.

```bash
python3 scripts/prepare-internet.py --app-host clinic.example.org --auth-host auth.example.org --turn-public-ip IP_CONG_KHAI
docker compose --env-file .env.internet -f compose.yaml -f compose.internet.yaml config --quiet
docker compose --env-file .env.internet -f compose.yaml -f compose.internet.yaml up -d --build
docker compose --env-file .env.internet -f compose.yaml -f compose.internet.yaml ps
```

Trình tạo cấu hình sinh mật khẩu riêng cho từng tài khoản demo và giữ nguyên ID mà backend dùng để nạp dữ liệu. Tài khoản và mật khẩu nằm trong `infra/runtime/internet/clinic-realm.json`. Chia sẻ riêng tài khoản `doctor` và `patient` cho hai người kiểm thử. `.env.internet` và thư mục runtime chứa bí mật và đã được Git bỏ qua. Hãy giữ bản sao an toàn cùng các volume. Keycloak chỉ import realm khi realm chưa tồn tại, nên khi đổi domain hoặc tài khoản sau lần chạy đầu cần cập nhật realm đang sử dụng cùng các biến liên quan.

Sau khi dịch vụ sẵn sàng, chạy `sudo python3 -B data_demo/load_local_demo.py --internet --apply` trên máy chủ để thêm chuyên khoa, bác sĩ và lịch mẫu. Xem [tài khoản và cách nạp](../data_demo/README.md#2-tài-khoản-và-mật-khẩu-demo).

Frontend trỏ `VITE_WEBRTC_ICE_CONFIG_URL` tới `/api/webrtc/ice`. Caddy chuyển riêng URL này tới dịch vụ cấp ICE. Dịch vụ dùng `/api/me/profile` hiện có để kiểm tra JWT và vai trò bác sĩ/bệnh nhân, sau đó trả thông tin TURN dùng trong một giờ. Caddy chuyển các API khác theo tuyến frontend → backend hiện có. Bí mật ký TURN chỉ có ở máy chủ.

TURN dùng UDP hoặc TCP 3478 cho kết nối từ trình duyệt, với media relay qua dải UDP đã mở. Âm thanh và hình ảnh WebRTC vẫn được mã hóa giữa hai trình duyệt. Profile demo này cần mạng cho phép một trong hai giao thức tới cổng 3478. Với mạng chỉ cho phép HTTPS cổng 443, cần thêm TURN qua TLS trên cổng 443 tại một địa chỉ riêng.

## Nghiệm thu khác mạng

1. Mở web bằng HTTPS trên hai thiết bị. Cho một thiết bị dùng Wi-Fi và thiết bị còn lại dùng 4G/5G, tắt Wi-Fi trên thiết bị đó. Đăng nhập bằng `doctor` và `patient`.
2. Tạo lịch khám từ xa hợp lệ. Đến cửa sổ tham gia, vào cùng một phiên, cấp quyền camera/micro và xác nhận mỗi bên **thấy hình, nghe tiếng của bên kia**. Kiểm tra kết nối lại khi gián đoạn và trạng thái khi bác sĩ kết thúc.
3. Đổi `ICE_POLICY=relay` trong `.env.internet` và chạy lại lệnh `up -d` để cập nhật dịch vụ cấp ICE. Tạo kết nối mới và lặp phép thử. Xác nhận cặp ICE được chọn có candidate local loại `relay` và có media hai chiều. Sau đó trả về `all` và chạy lại `up -d`.

Ghi kết quả theo thiết bị, mạng, trình duyệt và chế độ `all`/`relay`. Nếu đăng nhập được nhưng chưa thấy/hay nghe đầu bên kia, kiểm tra signaling, quyền thiết bị và đường TURN trước khi xác nhận đạt. Cấu hình dùng profile `demo` và kho dữ liệu Keycloak nhúng, phù hợp trình diễn với dữ liệu giả.
