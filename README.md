# Clinic Telehealth System

**Đề tài:** Hệ thống quản lý phòng khám ngoại trú, đặt lịch và khám từ xa.

Hệ thống gồm chín phân hệ, hỗ trợ quản lý lịch khám, tiếp đón bệnh nhân, khám trực tiếp và từ xa, hồ sơ bệnh án, đơn thuốc, thông báo và kiểm soát truy cập.

- Công nghệ: React + TypeScript, Java Spring Boot, MySQL.
- Giai đoạn: đã có phân tích và thiết kế; backend và môi trường local tuần 3–4 đã triển khai.
- Tài liệu: [Danh mục tài liệu đồ án](docs/README.md).

Quy mô nhóm: **6 thành viên**, thời gian thực hiện: **8 tuần**. [Phân công nhiệm vụ và kế hoạch tiến độ](docs/project-plan.md).

## Triển khai tuần 3–4

- [Hướng dẫn chạy backend và môi trường local](docs/running.md).
- [API đã triển khai và tích hợp frontend](docs/api/implementation.md).
- [Kết quả thực hiện và kiểm chứng](docs/week-03-04.md).

Chạy từ thư mục gốc SE-project:

~~~powershell
./scripts/setup-local.ps1
docker compose up -d --build
~~~
