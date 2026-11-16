# ClinicCare Web (bản gộp)

Frontend chính từ `frontend-unified.zip`, đã chỉnh theo hợp đồng BE–FE 1.0.0.
Xem [hướng dẫn chạy và giới hạn](../docs/frontend-unified.md) và [hợp đồng API](../docs/api/integration-contract.md).

Các thư mục `frontend_patient`, `frontend_doctor` cũ chỉ giữ đối chiếu; Compose mới build ngay tại thư mục này.

```bash
npm ci
npm run dev        # nối backend thật (proxy /api → API_PROXY_TARGET, mặc định http://localhost:8080)
npm run dev:mock   # chạy không cần backend, có chọn tài khoản demo
npm run typecheck && npm test && npm run build
```
Sao chép `.env.example` → `.env` để chỉnh Keycloak và các cờ `VITE_BACKEND_*`.
