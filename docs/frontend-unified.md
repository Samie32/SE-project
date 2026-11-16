# Frontend gộp: chạy và chuẩn bị tích hợp

Ngày 16/11/2026. Frontend chính nằm ngay tại `frontend/`, lấy từ ZIP người dùng cung cấp và chỉnh theo [hợp đồng 1.0.0](api/integration-contract.md). Các thư mục frontend cũ được giữ đối chiếu, không dùng trong Compose mới.

## Chạy với backend thật

Yêu cầu Node `^22.12.0 || >=24.0.0`; backend/Keycloak chạy theo [backend-completion.md](backend-completion.md).

```powershell
# Terminal 1, từ thư mục gốc
.\scripts\run-backend.ps1

# Terminal 2
cd frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

FE: `http://localhost:5173`. Vite proxy `/api` tới `API_PROXY_TARGET`, mặc định `http://localhost:8080`. OIDC authority `http://localhost:8180/realms/clinic`, client `clinic-web`; tài khoản demo/mật khẩu do setup local sinh, không đặt token/mật khẩu vào các biến VITE.

Không cần copy `.env` nếu dùng toàn bộ giá trị mặc định. Khi đã có `.env` riêng, giữ cấu hình hiện có và đối chiếu các cờ BACKEND; không ghi đè máy móc. `VITE_BACKEND_*` mặc định true vì BE đã có API. Đặt false chỉ để tắt một chức năng; không tạo dữ liệu giả khi tắt.

## Chạy Docker

```powershell
.\scripts\setup-local.ps1
docker compose up -d --build --remove-orphans
```

Service FE mới tên `frontend`, context `./frontend`, cổng 5173. `--remove-orphans` thay container `patient-frontend` cũ của cùng project. Nginx phục vụ SPA và proxy tới `backend:8080`; `.dockerignore` không đưa frontend cũ hoặc node_modules vào image.

Các biến root `FE_BACKEND_CHECKIN/QUEUE/PROGRESS/CLINICAL/TELEHEALTH/AUDIT` truyền thành build args. Đổi cờ hoặc authority/client cần rebuild image. Preview Vite không có API proxy; dùng dev server hoặc Nginx Docker để nối thật.

## Chế độ xem giao diện độc lập

```powershell
cd frontend
npm run dev:mock
```

Có bộ chọn tài khoản demo và banner giả lập; dữ liệu nằm trong tab trình duyệt. Mock chỉ kích hoạt khi dev; production không bật mock. Mock không chứng minh tính đúng của quyền/giao dịch MySQL và không thay kiểm thử backend thật.

## Những phần đã chuẩn bị theo hợp đồng

- Lấy profile có doctorId/patientId, không suy ID và không dò quyền qua danh sách bác sĩ. AUDITOR thuần không gọi API danh mục.
- Queue theo `/doctors/{id}/queue?date=`, ticket version/createdAt; gọi lượt có ngày, skip có reason/version. Không nuốt 404 thành hết hàng; hỗ trợ 204 khi BE-04 được sửa. Nút gọi lượt bị khóa khi không có WAITING hoặc đang có CALLED/IN_SERVICE.
- Header idempotency cho progress, check-in, record/amendment, create/update/issue prescription, prepare/start/end. Cùng thao tác chưa rõ kết quả do timeout/5xx giữ key; thành công hoặc đổi nội dung dùng key mới.
- Mở ca khám qua appointment detail để lấy encounterId; bản record/rx hiện tại đọc từ encounter. History chỉ phục vụ FINAL/ISSUED. Đơn nháp sửa bằng PUT; retry issue không lưu/tạo đơn lại trước khi gửi lại lệnh phát hành.
- Audit dùng createdAt, filter `to` exclusive đầu ngày kế tiếp; lỗi rỗng 200/204 được xử lý.
- Telehealth prepare một lần, poll GET session, nhận biết ENDED/CANCELLED, hết hạn token thì cho join lại khi hợp lệ; end dừng thiết bị preview. Adapter đã có signals/connection với JWT + X-Room-Token.

## Phần còn lại trước nghiệm thu

- **BE-01…04** trong [backlog](api/integration-backlog.md) chưa sửa. Trong race hàng đợi vừa hết, baseline có thể trả 404; FE hiển thị lỗi và cho tải lại, không giả thành công.
- **Media WebRTC hai phía chưa triển khai**: UI camera/micro chỉ xem trước thiết bị; các API signaling đã sẵn sàng nhưng chưa có RTCPeerConnection, remote tracks hoặc STUN/TURN. Bật TELEHEALTH chỉ bật vòng đời phiên, không xác nhận cuộc gọi thật.
- Cần E2E Keycloak → UI → BE → MySQL cho luồng trực tiếp, kiểm tra hai tab/stale version và tải lại draft; sau đó triển khai media và nghiệm thu hai trình duyệt. Không dùng test mock/build xanh để kết luận đã nối hoàn chỉnh.
- NFR tải, backup/restore, usability và cấu hình TLS/TURN vẫn cần kiểm chứng riêng.

## Kiểm tra FE

```powershell
cd frontend
npm run typecheck
npm test
npm run build
```

Workflow `unified-frontend.yml` kiểm tra frontend mới; workflow patient cũ chỉ phục vụ thư mục lịch sử khi thư mục đó thay đổi. CI GitHub không mặc nhiên được xem là đã chạy.

## Kiểm chứng lần chuẩn bị 16/11/2026

- **29/29 test FE đạt**, gồm request/header/body theo contract, giữ key sau 503, mở lại draft, PUT đơn đang có, retry issue qua chuyển tab, GET phòng đóng và bỏ phản hồi poll phiên bản cũ.
- `npm run build` đạt, bao gồm TypeScript check và Vite production build.
- `docker compose --env-file .env.example config --quiet` đạt; build image `cliniccare-unified:local` đạt với source sau các sửa lỗi cuối.
- Playwright/Edge: mở cổng bác sĩ, trang khám và audit bằng tài khoản mock; không thấy console error. Đã kiểm tra ảnh audit ở viewport 390×844. Không gọi đây là E2E đăng nhập/API thật.
- Hai lỗi tìm thấy khi review (mất key phát hành do đổi tab; poll cũ ghi đè trạng thái mới) đã có regression test đạt. Media hai phía và BE-01…04 vẫn chưa triển khai trong đợt này.
