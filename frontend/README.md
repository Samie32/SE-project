# ClinicCare Web (bản gộp)

**Chạy bản mock từ ZIP:** xem [HUONG-DAN-MOCK.md](./HUONG-DAN-MOCK.md) trong chính thư mục này. Chỉ cần Node.js/npm; không cần backend hoặc Keycloak.

Frontend chính từ `frontend-unified.zip`, đã chỉnh theo hợp đồng BE–FE 1.0.0.
Xem [hướng dẫn chạy và giới hạn](../docs/frontend-unified.md) và [hợp đồng API](../docs/api/integration-contract.md).

FE cũ được lưu riêng tại [archive/frontend/](../archive/frontend/README.md). Thư mục này chỉ chứa ứng dụng gộp; Compose build ngay tại đây.

```bash
npm ci
npm run dev        # nối backend thật (proxy /api → API_PROXY_TARGET, mặc định http://localhost:8080)
npm run dev:mock   # chạy không cần backend, có chọn tài khoản demo
npm run typecheck && npm test && npm run build
```
Sao chép `.env.example` → `.env` để chỉnh Keycloak và các cờ `VITE_BACKEND_*`.
