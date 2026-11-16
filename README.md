# Clinic Telehealth System

**Đề tài:** Hệ thống quản lý phòng khám ngoại trú, đặt lịch và khám từ xa.

Hệ thống gồm chín phân hệ, hỗ trợ quản lý lịch khám, tiếp đón bệnh nhân, khám trực tiếp và từ xa, hồ sơ bệnh án, đơn thuốc, thông báo và kiểm soát truy cập.

- Công nghệ: React + TypeScript, Java Spring Boot, MySQL.
- Backend: đã bổ sung hàng đợi, khám bệnh, bệnh án, đơn thuốc, nhắc lịch, audit và signaling từ xa. [Hướng dẫn và giới hạn tích hợp](docs/backend-completion.md).
- Tài liệu: [Danh mục tài liệu đồ án](docs/README.md).

Quy mô nhóm: **6 thành viên**, thời gian thực hiện: **8 tuần**. [Phân công nhiệm vụ và kế hoạch tiến độ](docs/project-plan.md).

## Chạy backend

Yêu cầu Java 21+ và Docker Desktop đang chạy:

```powershell
.\scripts\run-backend.ps1
```

Script khởi động hạ tầng và backend. Swagger: http://localhost:8080/swagger-ui/index.html.
[API và các luồng khám](docs/backend-completion.md).

## Tài liệu các giai đoạn trước

- [Hướng dẫn chạy backend và môi trường local](docs/running.md).
- [API đã triển khai và tích hợp frontend](docs/api/implementation.md).
- [Kết quả thực hiện và kiểm chứng](docs/week-03-04.md).
- [Frontend bệnh nhân, Docker và tích hợp API](docs/frontend-patient.md).
- [Hồ sơ, đơn thuốc và video chờ backend bổ sung](docs/frontend-patient.md#11-các-chức-năng-chờ-tích-hợp-và-nghiệm-thu).

Chạy từ thư mục gốc SE-project:

~~~powershell
./scripts/setup-local.ps1
docker compose up -d --build
.\scripts\apply-login-theme.ps1
~~~

Cổng bệnh nhân: http://localhost:5173. Đăng nhập qua Keycloak bằng tài khoản patient hoặc patient2, mật khẩu DEMO_PASSWORD trong .env do script setup sinh. Frontend gọi API qua proxy; backend quản lý kết nối MySQL.
