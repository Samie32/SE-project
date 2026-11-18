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

Tất cả tài khoản mẫu của ClinicCare dùng mật khẩu mặc định `DemoClinic`. Đặt `DEMO_PASSWORD` khi tạo cấu hình hoặc sửa biến này trong `.env.internet` để dùng giá trị khác. Mật khẩu quản trị hạ tầng Keycloak (`KEYCLOAK_ADMIN_PASSWORD`) được sinh riêng. Giữ các file cấu hình trên máy chủ và chỉ dùng bộ tài khoản này với dữ liệu mô phỏng.

### Tự động cập nhật VM Azure từ main

Workflow **Deploy ClinicCare to Azure** chạy khi có push vào `main`. Bước triển khai chờ kiểm tra frontend, backend và hợp đồng API đạt.

1. Mở managed identity `id-cliniccare-deploy` → **Federated credentials** → **Add Credential**. Chọn **GitHub Actions deploying Azure resources**, nhập tên chủ sở hữu `Samie32` (ID `266011799`) và repo `SE-project` (ID `1385168886`), chọn **Branch**, nhập `main` và đặt tên `github-main`. Subject là `repo:Samie32@266011799/SE-project@1385168886:ref:refs/heads/main`.
2. Gán quyền `Microsoft.Compute/virtualMachines/read` và `Microsoft.Compute/virtualMachines/runCommand/action` cho identity ở phạm vi `vm-cliniccare-azure-test` trong `rg-cliniccare`. Run Command chạy với quyền quản trị trong VM. Giới hạn quyền sửa workflow và merge vào `main`.
3. Trên GitHub, ở **Settings → Secrets and variables → Actions → Secrets**, thêm `AZURE_CLIENT_ID` (Client ID của identity), `AZURE_TENANT_ID` và `AZURE_SUBSCRIPTION_ID`. Khi VM sẵn sàng, thêm `AZURE_DEPLOY_ENABLED=true` trong tab **Variables**.
4. Vào **Actions → Deploy ClinicCare to Azure → Run workflow**, chọn `main`. Kiểm tra log job deploy có `CLINICCARE_DEPLOY_OK` kèm SHA. Có thể chạy workflow thủ công để triển khai lại khi cần.

Workflow cập nhật checkout `/opt/cliniccare` theo commit đã qua kiểm tra. VM so sánh toàn bộ thay đổi từ SHA triển khai thành công gần nhất đến SHA mới để chọn chế độ. File `.env.internet` và Docker volumes được giữ qua các lượt deploy.

| Chế độ trong log | Điều kiện | Thao tác trên VM |
| --- | --- | --- |
| `docs-only` | Chỉ đổi `docs/` hoặc `README.md`, hoặc nội dung đầu và cuối giống nhau | Cập nhật checkout và ghi SHA mới. |
| `frontend-only` | Có thay đổi trong `frontend/` và phần còn lại chỉ là tài liệu | Chạy `docker compose up -d --build --no-deps frontend`, sau đó kiểm tra web và API qua HTTPS. |
| `full` | Có thay đổi khác, thiếu mốc triển khai hợp lệ, lượt trước bị gián đoạn, hoặc chạy thủ công bằng **Run workflow** | Chạy `docker compose up -d --build`, khởi động lại frontend và kiểm tra cả FE lẫn BE. |

Xem `CLINICCARE_DEPLOY_MODE <chế độ> <SHA>` trong log GitHub Actions hoặc nhật ký systemd. Khi VM bỏ lỡ nhiều commit, thay đổi backend ở bất kỳ commit nào còn hiện diện trong bản mới đều khiến VM chọn `full`.

### Kiểm tra commit khi VM khởi động

Sau lượt deploy thành công đầu tiên, VM bật dịch vụ systemd `cliniccare-boot-deploy.service`. Khi khởi động, dịch vụ so sánh SHA mới nhất trên `main` với SHA đã triển khai thành công. Nếu trùng thì ghi log rồi kết thúc. Nếu có SHA mới, dịch vụ chờ lượt GitHub Actions đã qua cả ba kiểm tra và đã chạy bước triển khai, sau đó dùng cùng script triển khai. Cơ chế này xử lý cả lượt CI đạt nhưng GitHub gửi lệnh lúc VM đang tắt. Một lượt có bước deploy bị bỏ qua không kích hoạt cập nhật bù.

Xem kết quả kiểm tra bằng `sudo journalctl -u cliniccare-boot-deploy.service -b`.

### Nạp dữ liệu demo trên VM

Sau khi dịch vụ sẵn sàng, chạy các lệnh dưới đây trên VM hoặc trong Azure **RunShellScript**. Lệnh đầu nạp dữ liệu mẫu. Lệnh sau đồng bộ và xác thực mật khẩu tài khoản mẫu theo `DEMO_PASSWORD`.

```bash
cd /opt/cliniccare
sudo python3 -B data_demo/load_local_demo.py --internet --apply
sudo python3 -B data_demo/load_local_demo.py --internet --demo-logins --apply
```

Khi đã nạp đủ dữ liệu, kết quả xác thực là `Verified Keycloak demo logins: 14 accounts.` Xem [tài khoản và cách nạp](../data_demo/README.md#2-tài-khoản-và-mật-khẩu-demo).

Frontend trỏ `VITE_WEBRTC_ICE_CONFIG_URL` tới `/api/webrtc/ice`. Caddy chuyển riêng URL này tới dịch vụ cấp ICE. Dịch vụ dùng `/api/me/profile` hiện có để kiểm tra JWT và vai trò bác sĩ/bệnh nhân, sau đó trả thông tin TURN dùng trong một giờ. Caddy chuyển các API khác theo tuyến frontend → backend hiện có. Bí mật ký TURN chỉ có ở máy chủ.

TURN dùng UDP hoặc TCP 3478 cho kết nối từ trình duyệt, với media relay qua dải UDP đã mở. Âm thanh và hình ảnh WebRTC vẫn được mã hóa giữa hai trình duyệt. Profile demo này cần mạng cho phép một trong hai giao thức tới cổng 3478. Với mạng chỉ cho phép HTTPS cổng 443, cần thêm TURN qua TLS trên cổng 443 tại một địa chỉ riêng.

## Nghiệm thu khác mạng

1. Mở web bằng HTTPS trên hai thiết bị. Cho một thiết bị dùng Wi-Fi và thiết bị còn lại dùng 4G/5G, tắt Wi-Fi trên thiết bị đó. Đăng nhập bằng `doctor` và `patient`.
2. Tạo lịch khám từ xa hợp lệ. Đến cửa sổ tham gia, vào cùng một phiên, cấp quyền camera/micro và xác nhận mỗi bên **thấy hình, nghe tiếng của bên kia**. Kiểm tra kết nối lại khi gián đoạn và trạng thái khi bác sĩ kết thúc.
3. Đổi `ICE_POLICY=relay` trong `.env.internet` và chạy lại lệnh `up -d` để cập nhật dịch vụ cấp ICE. Tạo kết nối mới và lặp phép thử. Xác nhận cặp ICE được chọn có candidate local loại `relay` và có media hai chiều. Sau đó trả về `all` và chạy lại `up -d`.

Ghi kết quả theo thiết bị, mạng, trình duyệt và chế độ `all`/`relay`. Nếu đăng nhập được nhưng chưa thấy/hay nghe đầu bên kia, kiểm tra signaling, quyền thiết bị và đường TURN trước khi xác nhận đạt. Cấu hình dùng profile `demo` và kho dữ liệu Keycloak nhúng, phù hợp trình diễn với dữ liệu giả.
