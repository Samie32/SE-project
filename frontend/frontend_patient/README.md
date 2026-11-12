# ClinicCare — Cổng bệnh nhân
**Vũ Trần Khắc Thuận — 52400243**

Giao diện chính thức từ bản Figma, đã điều chỉnh cho các API đang có trong đồ án. Không có nút tải mã nguồn hay chế độ đăng nhập giả.

Xem [hướng dẫn chạy, Docker và tích hợp](../../docs/frontend-patient.md) và [các tính năng chờ backend](../../docs/frontend-patient-pending.md).

~~~powershell
npm ci
npm run dev
npm test
npm run build
~~~

Frontend cần backend/Keycloak đang chạy. Docker Compose tại gốc dự án phục vụ frontend ở http://localhost:5173 và proxy /api tới Spring Boot. MySQL chỉ được backend truy cập.
