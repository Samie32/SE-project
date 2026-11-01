# Hệ thống quản lý phòng khám ngoại trú, đặt lịch và khám từ xa

Bản triển khai tuần 3–4 của **Vòng Kỷ Phong — 52400225**, gồm backend Spring Boot, MySQL và môi trường phát triển. Mã nguồn được tích hợp vào cấu trúc SE-project cùng bộ tài liệu phân tích và thiết kế.

## Phạm vi đã triển khai

- M01: kiểm tra JWT từ OAuth2/OIDC, ánh xạ tài khoản và vai trò nội bộ, kiểm tra quyền tài nguyên.
- M02: danh mục chuyên khoa, tạo/cập nhật bác sĩ, chặn ngừng nhận lịch khi còn lịch hẹn hiệu lực.
- M03: khoảng làm việc, lịch nghỉ, sinh khung giờ, tìm lịch trống.
- M04: đặt/đổi/hủy và danh sách lịch theo quyền; khóa giao dịch, phiên bản và idempotency.
- Nền tảng audit nguyên tử với giao dịch và thông báo xác nhận qua transactional outbox.
- MySQL/Flyway, dữ liệu mô phỏng, Docker Compose, Maven Wrapper và CI kiểm thử.

Hồ sơ bệnh án, kê đơn, hàng đợi, video và nhắc lịch định kỳ thuộc giai đoạn sau. Frontend nghiệp vụ do các thành viên frontend triển khai.

## Cấu trúc

~~~text
backend/                  Spring Boot, migration và kiểm thử MySQL
infra/keycloak/           Cấu hình danh tính local
scripts/                  Chuẩn bị môi trường và kiểm tra toàn luồng
docs/                     API, hướng dẫn tích hợp và tiến độ tuần 3–4
.github/workflows/        Build và kiểm thử backend
compose.yaml             MySQL, Keycloak, Mailpit, backend
~~~

## Chạy bằng Docker Desktop

Yêu cầu Docker Desktop dùng Linux containers và PowerShell. Từ thư mục gốc:

~~~powershell
./scripts/setup-local.ps1
docker compose up -d --build
~~~

Lần đầu có thể mất vài phút để tải image và dependency. Kiểm tra bằng docker compose ps và docker compose logs backend.

| Dịch vụ | Địa chỉ |
|---|---|
| API | http://localhost:8080/api |
| Health | http://localhost:8080/actuator/health |
| Swagger UI | http://localhost:8080/swagger-ui/index.html |
| OpenAPI | http://localhost:8080/v3/api-docs |
| Keycloak | http://localhost:8180 |
| Mailpit | http://localhost:8025 |
| MySQL | localhost:3307, database clinic |

Script tạo .env và realm runtime với mật khẩu ngẫu nhiên; không ghi đè .env đã tồn tại. Không đưa hai file này vào Git. Keycloak có các tài khoản mô phỏng admin, doctor, patient, patient2, receptionist, auditor; mật khẩu người dùng là DEMO_PASSWORD trong .env. Mật khẩu quản trị Keycloak là KEYCLOAK_ADMIN_PASSWORD, khác tài khoản admin của ứng dụng.

Email local được Mailpit hứng lại. Realm local có client clinic-local-cli dành riêng cho script kiểm thử; frontend dùng clinic-web với Authorization Code + PKCE. Cấu hình start-dev và HTTP chỉ phục vụ local, không phải cấu hình triển khai công khai.

## Chạy backend ngoài Docker

Yêu cầu JDK 21 hoặc 25; Maven Wrapper tự tải Maven.

~~~powershell
docker compose up -d mysql keycloak mailpit
./scripts/run-backend.ps1
~~~

Không chạy đồng thời backend local và container trên cùng cổng 8080. Dừng container backend bằng docker compose stop backend trước khi chạy local.

## Kiểm thử

Docker phải đang hoạt động. Bộ test tự tạo MySQL riêng bằng Testcontainers, không dùng hoặc xóa dữ liệu demo:

~~~powershell
cd backend
./mvnw.cmd verify
~~~

Báo cáo: backend/target/surefire-reports và backend/target/site/jacoco/index.html.

Khi toàn bộ Compose đã chạy, dùng Python 3 để kiểm tra đăng nhập và API thực tế:

~~~powershell
python scripts/smoke.py
~~~

Script tạo lịch thử rồi hủy, kiểm tra email trong Mailpit và xuất hợp đồng API vào docs/api/openapi.json. Script không in token hoặc mật khẩu. Các bản ghi lịch đã hủy và audit được giữ làm lịch sử thử nghiệm.

## Tài liệu

- [API và tích hợp frontend](api/implementation.md)
- [Thiết kế backend và dữ liệu](backend-design.md)
- [Tiến độ tuần 3–4](week-03-04.md)

Tắt môi trường bằng docker compose down; dữ liệu MySQL được giữ trong named volume.
