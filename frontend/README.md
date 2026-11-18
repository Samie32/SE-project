# ClinicCare Web (bản gộp)

Xem [hướng dẫn chạy mock](./HUONG-DAN-MOCK.md) để thử giao diện chỉ với Node.js và npm.

ClinicCare Web phục vụ các vai trò trong một ứng dụng, theo [hợp đồng API](../docs/api/integration-contract.md). Docker Compose build frontend từ thư mục này.

```bash
npm ci
npm run dev        # nối backend thật (proxy /api → API_PROXY_TARGET, mặc định http://localhost:8080)
npm run dev:mock   # chạy không cần backend, có chọn tài khoản demo
npm run typecheck && npm test && npm run build
```
Sao chép `.env.example` → `.env` để chỉnh Keycloak và các cờ `VITE_BACKEND_*`.
