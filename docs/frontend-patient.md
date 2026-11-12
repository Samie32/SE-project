# Frontend bệnh nhân — báo cáo thực hiện và hướng dẫn chạy

**Thành viên phụ trách:** Vũ Trần Khắc Thuận — MSSV 52400243.

**Ngày cập nhật báo cáo:** 08/11/2026.

**Mốc kiểm chứng được tổng hợp:** 06/11/2026.

**Phạm vi:** giao diện bệnh nhân, tích hợp các API đã có, giao diện đăng nhập dùng chung và cấu hình đóng gói phục vụ frontend.

## 1. Mục tiêu và sản phẩm bàn giao

Xây dựng cổng bệnh nhân ClinicCare trên React 18, TypeScript và Vite theo thiết kế giao diện đã thống nhất. Sản phẩm được điều chỉnh theo nghiệp vụ phòng khám và hợp đồng API thực thi của nhóm, thay cho frontend bệnh nhân cũ.

Mã nguồn chính nằm tại `frontend/frontend_patient/`. Sản phẩm gồm trang tổng quan, đặt lịch, quản lý lịch hẹn, khung giao diện hồ sơ/đơn thuốc và chuẩn bị khám từ xa; kèm giao diện đăng nhập ClinicCare trên Keycloak, cấu hình Docker/Nginx, kiểm thử và hướng dẫn sử dụng.

## 2. Công việc đã thực hiện

| Hạng mục | Nội dung thực hiện | Kết quả và giới hạn |
|---|---|---|
| Xây lại giao diện | Xây dựng giao diện cổng bệnh nhân theo thiết kế; điều chỉnh màu sắc, chữ tiếng Việt, kích thước chữ, menu mobile, biểu mẫu và trạng thái tải/lỗi/rỗng; bỏ mục “Tải mã nguồn” | Đã có mã nguồn và build production; đã kiểm tra trực quan màn hình đăng nhập. Chưa nghiệm thu khả năng sử dụng toàn bộ màn hình trên nhiều thiết bị |
| Đăng nhập — M01 | Tự mở trang tài khoản/mật khẩu ClinicCare; dùng Keycloak Authorization Code + PKCE; giữ access token trong bộ nhớ; xử lý hết hạn/401 và kiểm tra vai trò PATIENT qua `/api/me` | Đã xác thực tài khoản demo qua form, trao đổi code + PKCE và gọi API thật với vai trò PATIENT |
| Giao diện đăng nhập dùng chung | Tạo theme ClinicCare theo mẫu; có tài khoản/email, mật khẩu, ghi nhớ đăng nhập và hướng dẫn quên mật khẩu | Đã áp dụng cho realm `clinic`. Khi chưa bật khôi phục mật khẩu, mục quên mật khẩu chỉ hướng dẫn liên hệ quản trị |
| Trang tổng quan | Hiển thị lịch sắp tới, thống kê từ lịch hẹn, đồng hồ/đếm ngược và truy cập nhanh | Dùng dữ liệu trả từ API, không tạo số liệu hoặc thông báo giả |
| Tra cứu — M02/M03 | Lấy chuyên khoa, bác sĩ và khung giờ; lọc theo chuyên khoa/bác sĩ/ngày/hình thức; hiển thị thời gian `Asia/Ho_Chi_Minh` | Đã nối API và xử lý không có lịch/lỗi tải. Không triển khai chức năng quản trị danh mục hoặc tạo lịch làm việc |
| Đặt lịch — M04 | Gửi `slotId` và `Idempotency-Key`; chỉ báo thành công khi API xác nhận; gặp 409 tải lại lịch trống, giữ bộ lọc | Đã kiểm thử thành phần với API mô phỏng; chưa nghiệm thu luồng đặt lịch từ trình duyệt đến MySQL |
| Đổi lịch — M04 | Gọi endpoint reschedule cho lịch hiện có, gửi `version` và khóa chống lặp; chọn slot mới của cùng bác sĩ/hình thức | Đã kiểm thử endpoint/payload phía frontend; không tạo một lịch mới để thay cho thao tác đổi |
| Hủy lịch — M04 | Hộp thoại xác nhận, lý do tối đa 1.000 ký tự, gửi `version` và khóa chống lặp; chỉ cho đổi/hủy CONFIRMED còn ít nhất 2 giờ | Đã kiểm thử lý do, phiên bản, khóa và mốc thời gian phía frontend; backend vẫn kiểm tra lại quyền và điều kiện |
| Danh sách lịch hẹn | Bộ lọc, tìm theo mã/bác sĩ/chuyên khoa, làm mới; tải đủ các trang API, mỗi trang 100 dòng | Đã kiểm thử đọc tiếp trang thứ hai để tránh bỏ sót lịch |
| Hồ sơ/đơn thuốc — M05 | Dựng khung lịch sử và chi tiết theo thiết kế; lấy lịch COMPLETED từ API lịch hẹn | Chờ API hồ sơ FINAL/đơn đã phát hành. Chưa có dữ liệu bệnh án, chẩn đoán hoặc đơn thuốc thật |
| Chuẩn bị khám từ xa — M09 | Chọn lịch REMOTE còn hiệu lực; kiểm tra camera/micro qua `getUserMedia`, xem camera và bật/tắt track | Có xử lý thiết bị phía client. Nút tham gia bị vô hiệu; admission, token phòng, video/audio hai bên và reconnect chờ backend/provider |
| Đóng gói frontend | Dockerfile nhiều stage, Nginx phục vụ SPA và proxy `/api` đến backend, healthcheck và service trong Compose | Đã build image và cập nhật container frontend trên Docker local |
| Kiểm thử và tài liệu | 18 test Vitest/Testing Library; script kiểm chứng đăng nhập thật; workflow CI frontend; hướng dẫn chạy và danh sách chờ tích hợp | Kết quả local đã ghi nhận; chưa xác nhận workflow chạy thành công trên GitHub |

## 3. Các API đã nối

| Chức năng | API thực thi | Dữ liệu và điều kiện chính |
|---|---|---|
| Danh tính/quyền | `GET /api/me` | Vai trò nội bộ do backend trả về |
| Chuyên khoa | `GET /api/specialties` | Danh mục để lọc bác sĩ |
| Bác sĩ | `GET /api/doctors` | Các dòng chuyên khoa của bác sĩ được xử lý ở frontend |
| Lịch trống | `GET /api/slots` | `date`, `doctorId`, `specialtyId`, `mode` |
| Lịch của bệnh nhân | `GET /api/appointments` | Phân trang `limit`/`offset`; backend giới hạn theo người dùng |
| Đặt lịch | `POST /api/appointments` | `slotId`; header `Idempotency-Key` |
| Đổi lịch | `POST /api/appointments/{id}/reschedule` | `slotId`, `version`; header `Idempotency-Key` |
| Hủy lịch | `POST /api/appointments/{id}/cancel` | `reason`, `version`; header `Idempotency-Key` |

Frontend gửi Bearer token đến backend. Trình duyệt không kết nối MySQL trực tiếp; Spring Boot và cơ chế giao dịch/database hiện có của nhóm đảm nhiệm việc lưu dữ liệu, kiểm tra quyền và chống trùng lịch.

## 4. Kết quả kiểm chứng

Các kết quả dưới đây được ghi nhận trong lần triển khai ngày 06/11/2026, không phải một lần chạy lại vào ngày cập nhật báo cáo.

| Kiểm chứng | Kết quả đã ghi nhận | Phạm vi kết luận |
|---|---|---|
| `npm test` | 18/18 test đạt trong 4 file | Thành phần frontend/API mô phỏng trong 4 file: client, data, login và portal |
| `npm run build` | TypeScript và Vite build thành công | Mã frontend đóng gói được |
| Build Docker frontend | Thành công, container frontend được khởi chạy | Image frontend/Nginx hoạt động trong môi trường local |
| Kiểm tra bằng trình duyệt | Mở cổng bệnh nhân tự đến form ClinicCare; bố cục, ô nhập và nút đăng nhập hiển thị | Kiểm tra trực quan màn hình đăng nhập, chưa phải đánh giá toàn bộ UX |
| `python scripts/verify-login-theme.py` | Form, ghi nhớ đăng nhập, đăng nhập patient, trao đổi code + PKCE và gọi `/api/me` đạt | Kiểm chứng HTTP với Keycloak/backend thật; không phải tự động hóa đăng nhập qua trình duyệt |

Chưa công bố coverage frontend, kiểm thử tải, bảo mật toàn hệ thống hoặc kết quả CI trên GitHub. Kết quả frontend không thay thế kiểm thử backend/MySQL của thành viên phụ trách và không chứng minh đã hoàn thành chín phân hệ.

## 5. Phần cấu hình dùng chung đã phối hợp thay đổi

| Thành phần | Thay đổi trong phạm vi công việc | Ảnh hưởng cần trao đổi với nhóm |
|---|---|---|
| `compose.yaml` | Thêm frontend bệnh nhân ở cổng 5173, biến cấu hình build và mount theme Keycloak | Không chạy thêm Vite/frontend khác trên cùng cổng. Nếu dùng cổng khác cần thống nhất CORS/redirect URI/origin |
| `infra/keycloak/themes/cliniccare/` | Giao diện form đăng nhập | Các frontend dùng cùng realm `clinic` có thể thấy theme mới |
| `infra/keycloak/realm-template.json` | Chọn theme, bật tùy chọn remember-me cho realm mới | Là cấu hình dùng chung; không đổi vai trò tài khoản |
| Script áp dụng theme | Cập nhật theme/remember-me trên realm local hiện có | Theme đã được copy vào container đang chạy để tránh tạo lại realm |
| `.github/workflows/patient-frontend.yml` | Cấu hình install/typecheck/test/build và build image frontend | Workflow mới được cấu hình; chưa xác nhận lần chạy trên GitHub |

Không sửa mã Java, API nghiệp vụ, schema/migration MySQL, mật khẩu hoặc phân quyền tài khoản trong lần xây lại frontend này. Việc kiểm chứng đăng nhập có gọi API thật và có thể tạo audit theo cơ chế sẵn có.

## 6. Công việc tiếp theo và phối hợp

- Vòng Kỷ Phong cung cấp API hồ sơ, đơn thuốc và vòng đời/admission phiên từ xa theo hợp đồng được thống nhất; Thuận nối các màn hình tương ứng khi API sẵn sàng.
- Phối hợp Nguyễn Huỳnh Anh Kiệt về phòng gọi dùng chung và provider/SDK; không coi kiểm tra thiết bị local là đã hoàn thành video call.
- Phối hợp Vũ Đức Thắng kiểm thử toàn trình đặt → đổi → hủy, tồn tại dữ liệu sau tải lại/đăng nhập lại, tranh chấp slot, quyền patient/patient2 và email Mailpit.
- Rà soát đa kích thước màn hình, lỗi thiết bị, phiên hết hạn, khả năng sử dụng và kết quả CI sau khi push.

Các phần chưa hoàn tất và kế hoạch phối hợp được tổng hợp ở mục 11. Hướng dẫn chạy, cấu hình và kiểm tra được trình bày từ mục 7 đến mục 10; mật khẩu không được ghi vào báo cáo.

## 7. Chạy toàn hệ thống bằng Docker
Yêu cầu Docker Desktop (Linux containers). Từ thư mục chứa compose.yaml:

~~~powershell
./scripts/setup-local.ps1
docker compose up -d --build
docker compose ps
~~~
Mở **http://localhost:5173**. Trang tài khoản/mật khẩu ClinicCare mở tự động, không có bước bấm “Đăng nhập an toàn”. Nginx phục vụ frontend, chuyển /api sang backend:8080 trong mạng Docker; backend kết nối MySQL. Frontend không truy cập database trực tiếp và không chứa mật khẩu database.

Keycloak: http://localhost:8180. Dùng tài khoản `patient` hoặc `patient2`; mật khẩu là `DEMO_PASSWORD` trong file `.env` do script setup sinh. Không đưa .env lên Git.

Dữ liệu backend demo có một bác sĩ và lịch trực tiếp trong những ngày tới (trừ Chủ nhật). Ngày mặc định là hôm nay; chọn ngày có availability để thấy slot. Không có slot từ xa cho đến khi bác sĩ/quản trị tạo lịch REMOTE.

Dừng môi trường: `docker compose down` (giữ volume MySQL). Không chạy Vite đồng thời với frontend Docker trên cổng 5173.

## 8. Phát triển frontend riêng
Node.js **22.12+ (nhánh 22), hoặc 24+** và npm. Khi chạy backend bằng Compose:

~~~powershell
docker compose up -d --build mysql keycloak mailpit backend
cd frontend/frontend_patient
npm ci
npm run dev
~~~
Mở http://localhost:5173. Đường dẫn chính:

- /patient: tổng quan
- /patient/booking: đặt lịch
- /patient/appointments: danh sách/đổi/hủy
- /patient/records: lịch khám hoàn tất, hồ sơ/đơn chờ tích hợp
- /patient/telehealth: lịch từ xa và kiểm tra thiết bị; cuộc gọi chờ tích hợp
- /callback: OIDC callback; khi chưa xác thực mọi đường dẫn hiển thị đăng nhập

Có thể sao chép .env.example thành .env.local trong frontend để đổi VITE_OIDC_AUTHORITY, VITE_OIDC_CLIENT_ID hoặc API_PROXY_TARGET. Những biến VITE là cấu hình công khai; không đặt secret tại đây. Docker mặc định dùng các địa chỉ local khớp realm hiện có; xem Dockerfile/compose nếu cần đổi cấu hình build. Môi trường public cần HTTPS, cập nhật redirect URI/origin của Keycloak và cấu hình backend tương ứng.

## 9. Lệnh kiểm tra và đóng gói

~~~powershell
npm run typecheck
npm test
npm run build
~~~
Test dùng API giả có kiểm soát trong thư mục tests, không bật mock trong sản phẩm. Bao phủ mốc 2 giờ, giờ Việt Nam, lỗi API, idempotency retry, xung đột slot, đổi lịch đúng endpoint, lý do hủy/version và màn hình chờ tích hợp.

## 10. Cấu hình giao diện đăng nhập ClinicCare
Trang tài khoản/mật khẩu được phục vụ bằng theme Keycloak tại infra/keycloak/themes/cliniccare. Frontend đi thẳng vào luồng đăng nhập, vẫn dùng Authorization Code + PKCE. Tùy chọn ghi nhớ do Keycloak xử lý; access token trong React vẫn chỉ giữ trong bộ nhớ.

Môi trường mới tự chọn theme từ realm-template.json. Với Keycloak đã chạy trước khi thêm theme, mount/copy theme rồi chạy scripts/apply-login-theme.ps1. Lần này theme đã được copy vào container đang chạy để tránh tạo lại realm hiện có. Compose đã có volume mount cho các lần khởi chạy sau.

Chức năng “Quên mật khẩu?” hiển thị hướng dẫn liên hệ quản trị khi realm chưa bật đặt lại mật khẩu; khi bật, liên kết dùng luồng khôi phục của Keycloak. Mật khẩu demo vẫn lấy từ DEMO_PASSWORD; giao diện không công bố mật khẩu cố định.

Kiểm tra local bằng python scripts/verify-login-theme.py: xác minh form, đăng nhập tài khoản patient, trao đổi code + PKCE và gọi /api/me. Script không in credential, code hoặc token.

## 11. Các chức năng chờ tích hợp và nghiệm thu

Các hạng mục dưới đây mới có khung giao diện hoặc phần chuẩn bị; tiếp tục tích hợp khi nhóm hoàn tất backend tương ứng.

| Phần | Hiện trạng giao diện | Điều kiện để hoàn tất |
|---|---|---|
| Hồ sơ bệnh án | Giữ thiết kế lịch sử khám/chi tiết; lịch COMPLETED lấy từ API hiện có. Không sinh chẩn đoán mẫu | API đọc hồ sơ FINAL theo bệnh nhân, audit đọc, cấu trúc phiên bản/bản bổ sung |
| Đơn thuốc | Khung giao diện, thông báo chưa có dữ liệu | API chỉ trả đơn đã phát hành và các dòng thuốc của bệnh nhân |
| Phiên từ xa | Chọn lịch REMOTE thực tế; kiểm tra camera/micro bằng getUserMedia, xem camera thật và bật/tắt track | API chuẩn bị phiên, trạng thái và admission theo quyền/thời gian/xác nhận tham gia |
| Video/audio | Nút tham gia bị vô hiệu và ghi “Sắp có” | Chốt provider/SDK, token 5 phút, reconnect, thu hồi phòng và kết thúc phiên phía bác sĩ |
| Email/nhắc lịch | Không tạo thông báo/badge giả. Backend đã có outbox xác nhận đặt/đổi/hủy | Backend bổ sung nhắc trước 30 phút và tích hợp nhà cung cấp theo quy tắc dự án |
| Thông tin liên hệ | Chưa có màn hình chỉnh email trong phạm vi giao diện hiện tại | Có sẵn PUT /me/contact; nhóm có thể bổ sung màn hình riêng nếu cần |

### Điểm cần thống nhất khi tích hợp

- Phân biệt OpenAPI thiết kế (docs/api/openapi.yaml) với API thực thi (docs/api/openapi.json).
- Chốt DTO và đường dẫn thực tế trước khi nối hồ sơ/đơn/phiên; không mặc định rằng endpoint trong bản thiết kế đã chạy.
- Bệnh nhân chỉ được đọc hồ sơ FINAL và đơn đã phát hành thuộc mình; không nhận dữ liệu nhạy cảm khi audit đọc thất bại.
- Phòng chờ: từ start -10 phút đến trước start +15 phút; xác nhận tham gia trước khi cấp token.
- ACTIVE/RECONNECTING có thể kết nối lại theo quyền; ENDED/CANCELLED không được mở lại.
- Bệnh nhân rời media không tự hoàn tất lần khám. Kết thúc phiên do bác sĩ; hoàn tất hồ sơ/lần khám là các thao tác riêng.
- Không hiển thị khẳng định HIPAA/mã hóa đầu cuối/tốc độ mạng nếu chưa có bằng chứng tích hợp.
- Kiểm tra thiết bị không chứng minh video từ xa hoạt động; yêu cầu HTTPS hoặc localhost, có quyền camera/micro.

### Kịch bản nghiệm thu toàn trình còn lại

Docker frontend, form đăng nhập và luồng HTTP xác thực/PKCE/API thật đã được kiểm chứng ngày 06/11/2026. Danh sách dưới đây là checklist toàn trình để tiếp tục nghiệm thu, không có nghĩa các bước đặt/đổi/hủy, tranh chấp, email hoặc phiên từ xa đã đạt.

1. Chạy setup và Compose, kiểm tra health backend/frontend và đăng nhập patient qua Keycloak.
2. Chọn ngày demo có lịch trực tiếp; đặt một slot, kiểm tra lịch xuất hiện, tải lại và đăng nhập lại vẫn còn.
3. Đổi lịch; xác nhận chỉ một lịch tồn tại, slot cũ được giải phóng và version tăng.
4. Hủy có lý do; xác nhận CANCELLED và không còn nút đổi/hủy.
5. Dùng patient2 kiểm tra không thấy lịch patient; thử tranh chấp cùng slot.
6. Kiểm tra Mailpit có email xác nhận, không có nội dung hồ sơ/token.
7. Kiểm tra mạng lỗi/401/403/409/5xx không biến thành lịch hoặc hồ sơ giả.
8. Sau khi backend mới hoàn tất, bổ sung test hồ sơ FINAL, đơn phát hành, admission, reconnect và kết thúc phiên.

18 ca tự động frontend hiện dùng fetch/API mô phỏng; script kiểm chứng đăng nhập riêng dùng Keycloak và backend thật. Các bằng chứng này chưa thay cho toàn bộ checklist trên. Kết quả và giới hạn kiểm chứng được ghi ở mục 4.
