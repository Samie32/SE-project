# Dữ liệu và demo cho backend tuần 3–4

Nguồn được ghim tại [source.json](source.json): `main@b10e096`. [openapi.snapshot.json](openapi.snapshot.json) là bản contract đã có trong Git của backend, không phải kết quả API vừa chạy ở workspace này. Đối chiếu quy tắc nghiệp vụ từ controller/service và migration V1; OpenAPI không mô tả đủ mọi điều kiện nghiệp vụ.

## 1. Chuẩn bị clone có backend

Workspace này đã được thay bằng clone thật của `main@b10e096`, trên nhánh local `docs/52400244-demo-data`, kèm phần đóng góp và bản sửa. Có thể chạy từ root workspace hiện tại; không cần clone lại. Đoạn lệnh dưới đây chỉ dành cho việc chuẩn bị một clone khác trên máy mới, sau khi bản cập nhật nhánh được push.

```powershell
git clone https://github.com/Samie32/SE-project.git SE-project-integration
cd SE-project-integration
git switch docs/52400244-demo-data
git merge origin/main
```

Giải quyết xung đột nếu Git báo có, rồi copy **thư mục đóng góp 52400244 đã sửa** vào cùng đường dẫn của clone. Xem `tracking/how-to-merge.md`. Backend/migration/môi trường giữ theo main. Sau đó dùng lệnh của backend (Docker Desktop Linux containers phải đang chạy):

```powershell
./scripts/setup-local.ps1
docker compose up -d --build
docker compose ps
python scripts/smoke.py
```

`setup-local.ps1` tạo cấu hình và mật khẩu demo local. Không commit `.env` hay realm runtime. `scripts/smoke.py` là kiểm tra runtime **của backend**, tự đăng nhập OIDC, kiểm JWT/quyền, đặt/đổi/hủy, Mailpit và xuất OpenAPI. Script có tác dụng tạo/hủy lịch và lưu audit; chỉ chạy trên môi trường demo.

## 2. Tài khoản và mapping

[accounts.json](accounts.json) đối chiếu `DemoData.java` và `infra/keycloak/realm-template.json`:

| Account | Vai trò nội bộ | Dùng cho |
| --- | --- | --- |
| admin | ADMINISTRATOR | Danh mục, lịch làm việc/nghỉ, quyền, notification jobs |
| doctor | DOCTOR | Lịch làm việc/nghỉ của chính mình, lịch được gán |
| patient / patient2 | PATIENT | Tự đặt/đổi/hủy, danh sách lịch của mình |
| receptionist | RECEPTIONIST | Danh sách lịch và notification jobs |
| auditor | AUDITOR | Có tài khoản, chưa có endpoint tra cứu audit |

Seed chỉ có **một bác sĩ / một chuyên khoa**. Không cần nhập 16 nhóm fixtures để chạy demo tuần 3–4. `/api/me` trả ID tài khoản nội bộ; role từ DB, không cấp quyền bằng role claim JWT. Với account mới, backend tự tạo PATIENT. Muốn thêm bác sĩ thứ hai: tạo account trong IdP → account gọi `/api/me` → admin dùng `userId` thực tế trong `POST /api/doctors` với `specialtyIds` hợp lệ. API tạo doctor tự thêm role DOCTOR; không cấp DOCTOR trước khi có profile.

Backend tự sinh slot qua availability và sinh lịch qua booking. Không gửi `patientId`, `doctorId`, status, snapshot thời gian hoặc UUID fixture trong request đặt lịch. Body chỉ có `slotId`.

## 3. Sinh bộ request của 52400244

Từ root clone đã copy bản sửa:

```powershell
python -m pip install -r docs/contributions/52400244_NguyenThuong/tools/requirements-contract.txt
python docs/contributions/52400244_NguyenThuong/tools/backend_demo.py --check
python docs/contributions/52400244_NguyenThuong/tools/backend_demo.py
```

Mặc định chọn ngày mai theo UTC+7, bỏ Chủ nhật. Có thể dùng `--date YYYY-MM-DD` với ngày tương lai thứ Hai–thứ Bảy. Tạo availability trực tiếp 13:00–14:00 và REMOTE 14:00–15:00, bước 20 phút, tránh seed mặc định 08:00–12:00. Nếu DB đã có availability chồng nhau, GET lịch hiện tại trước; 409 không đồng nghĩa môi trường sạch hoặc có thể tự ghi đè.

- `test-data/generated/backend-YYYY-MM-DD/requests.json`: **19 operations riêng biệt, 20 ví dụ** (hai mode availability). UUID slot/appointment và user mới trong catalog là **mẫu schema**, không phải ID đã seed. Không chạy nguyên catalog như một batch.
- `demo.http`: luồng nhỏ chạy bằng VS Code REST Client: kiểm danh tính/danh mục → availability → slot trống → đặt → replay → đổi → hủy → xem lịch/thông báo. ID slot, ID lịch và version lấy từ phản hồi trước. File dùng `CLINIC_ADMIN_TOKEN`, `CLINIC_PATIENT_TOKEN` từ môi trường của **tiến trình VS Code**.

Để lấy token local mà không lưu mật khẩu trong file (chạy PowerShell riêng; đọc mật khẩu DEMO_PASSWORD local và nhập vào prompt):

```powershell
$demoCredential = Get-Credential -UserName 'demo' -Message 'Nhập DEMO_PASSWORD của môi trường local'
$demoTokenUrl = 'http://localhost:8180/realms/clinic/protocol/openid-connect/token'
$demoTokens = @{}
foreach ($demoUser in @('admin','patient')) {
    $demoForm = @{
        grant_type = 'password'
        client_id = 'clinic-local-cli'
        username = $demoUser
        password = $demoCredential.GetNetworkCredential().Password
    }
    $demoTokens[$demoUser] = (Invoke-RestMethod -Method Post -Uri $demoTokenUrl -Body $demoForm).access_token
}
$env:CLINIC_ADMIN_TOKEN = $demoTokens['admin']
$env:CLINIC_PATIENT_TOKEN = $demoTokens['patient']
$demoForm.Clear()
$demoTokens.Clear()
Remove-Variable demoCredential
```

Đóng toàn bộ VS Code trước, rồi mở lại từ PowerShell đã đặt biến để VS Code nhận được môi trường mới. Không in token, không copy token vào file tracked. Token hết hạn thì lấy lại và khởi động lại tiến trình VS Code. Client `clinic-local-cli` chỉ dành cho local; frontend dùng `clinic-web` và Authorization Code + PKCE.

Chạy từng request, kiểm HTTP và response trước khi tiếp tục. Cần ít nhất hai slot IN_PERSON còn trống trong kết quả `slots`. Đừng chạy lại `slots` giữa book/replay/đổi: chỉ số mảng có thể thay đổi. Các thao tác mới dùng khóa mới bằng cách sinh lại bundle; gửi lại do lỗi mạng phải giữ khóa và body cũ.

Kỳ vọng: book CONFIRMED/version 0, replay cùng lịch và cùng response, đổi version tăng, hủy CANCELLED với version tiếp tục tăng. Booking/đổi/hủy hiện trả HTTP 200. Hạn đổi/hủy: lịch CONFIRMED, còn ít nhất 2 giờ. Lấy version response, không dùng version cố định của catalog.

Sau demo, hủy lịch đã tạo nếu luồng dừng giữa chừng bằng ID/version mới nhất ở danh sách lịch. Availability, lịch đã hủy, audit và outbox còn trong DB demo; không có API xóa/reset và công cụ không tự xóa dữ liệu.

## 4. Kiểm tra khi backend đổi

```powershell
python docs/contributions/52400244_NguyenThuong/tools/backend_demo.py --check --spec docs/api/openapi.json
```

Tham số `--spec` kiểm thêm bộ request với bản JSON backend trong clone. Snapshot luôn giữ SHA/hash nguồn để có thể truy vết. Các lệnh trên kiểm schema và tham số; không xác nhận HTTP, quyền, transaction, Mailpit, race condition hoặc 24 TC đã đạt.

Phản hồi lỗi triển khai dùng ProblemDetail: validation DTO 400; thiếu/sai token 401; sai role 403; lịch người khác không được phép đổi/hủy trả 404; trùng lịch/stale/hạn đổi 409; nghiệp vụ thời gian 422. Không dựa vào `code/message/correlationId` của contract thiết kế để đọc lỗi runtime.
