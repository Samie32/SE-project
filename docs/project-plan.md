# Phân công nhiệm vụ và kế hoạch tiến độ

## 1. Thông tin chung

**Đề tài:** Hệ thống quản lý phòng khám ngoại trú, đặt lịch và khám từ xa.  
**Quy mô:** 6 thành viên.  
**Thời gian:** 8 tuần, gồm 4 sprint, mỗi sprint kéo dài 2 tuần.  
**Công nghệ:** React + TypeScript, Java Spring Boot, MySQL.

Kế hoạch phân biệt công việc đã thực hiện với nhiệm vụ được phân công cho giai đoạn tiếp theo. Các mốc tuần là thời gian tương đối, không xác nhận thời gian thực tế đã sử dụng.

## 2. Danh sách thành viên

| MSSV | Họ và tên | Vai trò giai đoạn tiếp theo |
|---|---|---|
| 52400243 | Vũ Trần Khắc Thuận | Frontend bệnh nhân |
| 52400052 | Nguyễn Huỳnh Anh Kiệt | Frontend bác sĩ |
| 52400220 | Nguyễn Hiếu Nhân | Frontend lễ tân, quản trị và kiểm toán |
| 52400238 | Vũ Đức Thắng | Kiểm thử API, tích hợp và toàn trình |
| 52400225 | Vòng Kỷ Phong | Toàn bộ backend, MySQL, môi trường và thiết kế kỹ thuật |
| 52400244 | Nguyễn Thường | Dữ liệu thử nghiệm, tổng hợp báo cáo, slide, kịch bản demo và thiết kế kỹ thuật |

## 3. Công việc đã thực hiện

| Hạng mục | Người thực hiện | Sản phẩm hiện có |
|---|---|---|
| Tổ chức dự án | Vũ Trần Khắc Thuận | Cấu trúc thư mục và hệ thống tài liệu |
| Phân tích yêu cầu | Vòng Kỷ Phong, Nguyễn Thường | Phạm vi, SRS, FR/NFR, quy tắc nghiệp vụ, user stories và tiêu chí chấp nhận |
| Phân tích nghiệp vụ | Vòng Kỷ Phong, Nguyễn Thường  | Quy trình nghiệp vụ, đặc tả ca sử dụng |
| Thiết kế hệ thống | Vòng Kỷ Phong, Nguyễn Thường  | Kiến trúc, UML, ERD, từ điển dữ liệu MySQL và ma trận phân quyền |
| Thiết kế giao diện và API | Vòng Kỷ Phong | Đặc tả màn hình, wireframe và hợp đồng OpenAPI |
| Lập kế hoạch kiểm thử | Vòng Kỷ Phong | Test plan, test cases và ma trận truy vết |
| Lập kế hoạch dự án | Vòng Kỷ Phong | Phân công và kế hoạch tám tuần |
| Backend tuần 3–4 | Vòng Kỷ Phong | M01–M04, migration MySQL, audit nền tảng và thông báo xác nhận |
| Môi trường và kiểm thử backend tuần 3–4 | Vòng Kỷ Phong | Docker Compose, dữ liệu demo, Maven Wrapper, kiểm thử MySQL/JWT và cấu hình CI |
| Backend nghiệp vụ tuần 5–6 | Vòng Kỷ Phong | M05: lần khám, bệnh án DRAFT/FINAL, bản bổ sung và đơn thuốc; M08: check-in, hàng đợi FIFO, gọi/bỏ lượt; đồng bộ trạng thái lịch hẹn, lần khám và phiếu chờ trong giao dịch |
| Thông báo, bảo mật và kiểm toán bổ sung | Vòng Kỷ Phong | M06: nhắc lịch trước 30 phút, bỏ tác vụ cũ và retry; M07: tra cứu audit theo quyền, mã liên kết request, mã hóa dữ liệu lâm sàng và kết quả idempotency; bảo vệ bệnh án FINAL và đơn ISSUED khỏi sửa/xóa |
| Backend phiên khám từ xa | Vòng Kỷ Phong | M09: tạo/tham gia/bắt đầu/kết thúc phiên, đồng ý tham gia, token 5 phút, thu hồi token và signaling WebRTC OFFER/ANSWER/ICE; hỗ trợ nối lại phiên. Chưa nghiệm thu video/audio đầu cuối và media/TURN |
| Kiểm thử và bàn giao API backend bổ sung | Vòng Kỷ Phong | Build sạch đạt 49 test trên MySQL 8.4/Testcontainers và JWT; hai kiểm tra bổ sung về mốc nhắc lịch 30 phút và hợp đồng API đạt. Smoke test Keycloak → API → MySQL → Mailpit đạt; OpenAPI có 46 thao tác trên 38 đường dẫn. [Tài liệu bàn giao](backend-completion.md) |
| Frontend bác sĩ tuần 3–4 | Nguyễn Huỳnh Anh Kiệt | Giao diện lịch làm việc/lịch nghỉ (M03), danh sách lịch hẹn (M04), phòng gọi CallingRoom dùng chung; cấu hình proxy và API service sẵn sàng tích hợp |
| Frontend bệnh nhân và cổng dịch vụ | Vũ Trần Khắc Thuận | Giao diện ClinicCare; đăng nhập Keycloak; tổng quan, tra cứu và tích hợp API đặt/đổi/hủy lịch; đóng gói Docker và cấu hình CI. 18 test frontend, build và đăng nhập thật đạt. API hồ sơ/đơn thuốc và signaling đã được bổ sung; frontend chờ tích hợp và nghiệm thu cuộc gọi đầu cuối. [Chi tiết](frontend-patient.md) |
| Giao diện Frontend Staff cho hệ thống Clinic Telehealth. Thiết lập môi trường và cấu hình đăng nhập Keycloak. Các chức năng giao diện dành cho quản trị viên, lễ tân và kiểm toán. | Nguyễn Hiếu Nhân | frontend/frontend_staff. Giao diện quản trị, lễ tân và kiểm toán|
| Nội dung dữ liệu mô phỏng, công cụ và tài liệu demo — cập nhật 18/11/2026 | Nguyễn Thường — 52400244 | Đã bàn giao [bộ nạp demo dùng chung](../data_demo/README.md) và xác minh nạp qua API vào MySQL local. Có lịch trực tiếp, từ xa, đổi, hủy và ca đã khám. 16 nhóm fixtures thiết kế được lưu riêng; 47 ví dụ phủ 46 API và 40 test công cụ/dữ liệu đạt. Nghiệm thu video khác mạng còn mở. [Checklist](contributions/52400244_NguyenThuong/CHECKLIST.md) |
| Chuẩn hóa và bàn giao hợp đồng tích hợp BE–FE 1.0.0 | Nguyễn Thường — 52400244 (tổng hợp theo backend hiện có) | 46 thao tác/38 đường dẫn/48 schema, ví dụ request/response, header/quyền và truy vết FR-01…24; checker và 7 test hợp đồng. Không đồng nghĩa đã sửa BE-01…04 hoặc hoàn thành tích hợp FE. [Hợp đồng](api/integration-contract.md) |

## 4. Phân công giai đoạn triển khai

| Thành viên | Phạm vi trách nhiệm | Sản phẩm bàn giao |
|---|---|---|
| **Vòng Kỷ Phong** | Backend của cả chín phân hệ; xác thực, phân quyền, logic nghiệp vụ, giao dịch chống trùng lịch, audit, kết nối Email/video phía máy chủ; toàn bộ MySQL từ cài đặt, cấu hình, schema, migration đến sao lưu/phục hồi; toàn bộ môi trường phát triển, kiểm thử, trình diễn và triển khai, cấu hình dịch vụ, đóng gói và CI/CD | Backend Spring Boot, API, migration, kiểm thử đơn vị logic nghiệp vụ, MySQL và các môi trường hoạt động, cấu hình đóng gói/CI/CD, quy trình sao lưu/phục hồi, OpenAPI và tài liệu kỹ thuật cập nhật |
| **Vũ Trần Khắc Thuận** | Giao diện bệnh nhân: đăng nhập, tìm bác sĩ/lịch trống, đặt/đổi/hủy, xem hồ sơ/đơn thuốc, phòng chờ và tham gia khám từ xa | Frontend bệnh nhân, tích hợp API, kiểm thử thành phần và sửa lỗi giao diện |
| **Nguyễn Huỳnh Anh Kiệt** | Giao diện bác sĩ: lịch làm việc/lịch nghỉ, lịch hẹn, gọi lượt, bắt đầu khám, nhập hồ sơ/đơn thuốc, phòng khám từ xa | Frontend bác sĩ, tích hợp API, kiểm thử thành phần và cập nhật đặc tả màn hình |
| **Nguyễn Hiếu Nhân** | Giao diện lễ tân/quản trị: danh mục bác sĩ/chuyên khoa, check-in/hàng đợi, quản lý quyền, theo dõi thông báo và tra cứu audit theo quyền | Frontend lễ tân/quản trị/kiểm toán, tích hợp API và kiểm thử quyền hiển thị |
| **Vũ Đức Thắng** | Kiểm thử hợp đồng API, tích hợp, toàn trình, bảo mật và tải; quản lý lỗi, kiểm thử hồi quy | Bộ kiểm thử tự động, báo cáo kết quả, danh sách lỗi và truy vết cập nhật |
| **Nguyễn Thường** | Chuẩn bị nội dung dữ liệu mô phỏng theo các kịch bản nghiệp vụ; tổng hợp báo cáo, slide, tài liệu sử dụng và kịch bản demo | Bộ dữ liệu mô phỏng để nhập vào hệ thống, báo cáo tổng hợp, slide, tài liệu sử dụng và kịch bản demo |

### Phối hợp thực hiện

- Vòng Kỷ Phong phụ trách toàn bộ backend, MySQL và các môi trường, bao gồm cài đặt, cấu hình dịch vụ, nạp dữ liệu, sao lưu/phục hồi, đóng gói và CI/CD. Nguyễn Thường chuẩn bị nội dung dữ liệu mô phỏng và chuyển cho Vòng Kỷ Phong nạp vào hệ thống.
- Vũ Trần Khắc Thuận phụ trách thành phần đăng nhập dùng chung; Nguyễn Huỳnh Anh Kiệt phụ trách thành phần phòng gọi dùng chung; Nguyễn Hiếu Nhân phụ trách bố cục giao diện nhân viên dùng chung.
- Mỗi thành viên frontend tích hợp API và kiểm thử các màn hình của mình. Vũ Đức Thắng kiểm thử độc lập và chuyển lỗi cho thành viên sở hữu chức năng.
- Nguyễn Thường tổng hợp báo cáo từ nội dung từng thành viên cung cấp.
- Mỗi thành viên cập nhật tài liệu liên quan đến công việc mới của mình. Vòng Kỷ Phong duy trì đặc tả backend và thiết kế kỹ thuật.

## 5. Kế hoạch tám tuần

Tuần 1–2 tương ứng với khối lượng phân tích và thiết kế hiện có; phân công và đóng góp của Vòng Kỷ Phong, Nguyễn Thường được ghi trong bảng dưới và mục 3. Từ tuần 3 là kế hoạch triển khai. Trạng thái hoàn thành thực tế được cập nhật riêng tại mục 7, không thay đổi các mốc kế hoạch ban đầu.

| Tuần | Vòng Kỷ Phong | Vũ Trần Khắc Thuận | Nguyễn Huỳnh Anh Kiệt | Nguyễn Hiếu Nhân | Vũ Đức Thắng | Nguyễn Thường |
|---|---|---|---|---|---|---|
| 1 | Phạm vi, SRS, FR/NFR, quy tắc, user stories và quy trình nghiệp vụ | — | — | — | — | Phạm vi, SRS, FR/NFR, quy tắc, user stories và quy trình nghiệp vụ |
| 2 | UML, kiến trúc, MySQL, phân quyền, màn hình, OpenAPI, test plan và kế hoạch nhóm | — | — | — | — | UML, kiến trúc, MySQL |
| 3 | Khởi tạo backend, migration, M01–M03, nền tảng audit và API lịch trống; thiết lập MySQL, môi trường phát triển/kiểm thử và CI cơ bản | Khởi tạo frontend, đăng nhập dùng chung, tra cứu bác sĩ/lịch trống | Giao diện lịch làm việc/lịch nghỉ | Bố cục nhân viên, danh mục và quản lý quyền | Thiết lập bộ kiểm thử API; kiểm tra xác thực, danh mục | Chuẩn bị nội dung dữ liệu mô phỏng và đề cương báo cáo |
| 4 | M04: đặt/đổi/hủy, khóa giao dịch, phiên bản và quyền; thông báo xác nhận cơ bản; tích hợp môi trường frontend/backend, đóng gói và nạp dữ liệu kiểm thử | Tích hợp đặt/đổi/hủy và lịch bệnh nhân | Tích hợp lịch làm việc và lịch hẹn bác sĩ | Hoàn thiện danh mục, quyền hiển thị; chuẩn bị tiếp đón | Kiểm thử lịch hẹn, tranh chấp, thời hạn và quyền tài nguyên | Bổ sung dữ liệu đặt lịch và tài liệu sử dụng các chức năng đã hoàn thành |
| 5 | M05, M08; hoàn thiện M06, M07: hồ sơ/đơn, hàng đợi, nhắc lịch và audit; thiết lập và kiểm tra sao lưu/phục hồi MySQL | Xem hồ sơ và đơn thuốc | Biểu mẫu khám, kê đơn, gọi lượt và bắt đầu khám | Check-in/hàng đợi, thông báo và audit | Kiểm thử hồ sơ, đơn thuốc, hàng đợi và nhắc lịch | Chuẩn bị dữ liệu khám trực tiếp |
| 6 | M09: vòng đời phiên, quyền vào phòng và tích hợp lịch hẹn/hồ sơ; cấu hình dịch vụ ngoài, môi trường demo và nạp dữ liệu trình diễn | Phòng chờ và tích hợp phòng gọi bệnh nhân | Thành phần phòng gọi, bắt đầu/kết thúc phiên bác sĩ | Hoàn thiện luồng lễ tân/quản trị và xử lý lỗi | Kiểm thử phiên từ xa, quyền, mất mạng và toàn trình | Chuẩn bị nội dung dữ liệu trình diễn, kịch bản demo và tài liệu sử dụng |
| 7 | Sửa lỗi backend, kiểm thử đơn vị, tối ưu truy vấn và giao dịch; kiểm tra đóng gói, CI/CD và môi trường triển khai | Kiểm thử, sửa lỗi giao diện bệnh nhân | Kiểm thử, sửa lỗi giao diện bác sĩ | Kiểm thử, sửa lỗi giao diện nhân viên | Kiểm thử hệ thống, tải, bảo mật và hồi quy; tổng hợp lỗi | Tổng hợp báo cáo, bản thảo slide và rà soát tài liệu sử dụng |
| 8 | Hoàn thiện backend, API, migration và tài liệu kỹ thuật; đóng gói bàn giao và hoàn thiện môi trường trình diễn/triển khai | Hoàn thiện demo bệnh nhân và tài liệu giao diện | Hoàn thiện demo bác sĩ và nội dung trình bày | Hoàn thiện demo lễ tân/quản trị và nội dung trình bày | Kiểm thử cuối, tổng hợp kết quả và tiêu chí chấp nhận | Hoàn thiện báo cáo, slide, tài liệu sử dụng và tổ chức chạy thử kịch bản demo |

## 6. Mốc hoàn thành theo sprint

| Sprint | Thời gian | Kết quả cần đạt | Phân công |
|---|---|---|---|
| 1 | Tuần 1–2 | Bộ yêu cầu, mô hình nghiệp vụ, thiết kế, API và kế hoạch kiểm thử | Đã có bộ tài liệu |
| 2 | Tuần 3–4 | Đăng nhập, danh mục, lịch làm việc, đặt/đổi/hủy; kiểm tra chống trùng lịch và quyền | backend; năm thành viên còn lại thực hiện các phần việc tương ứng |
| 3 | Tuần 5–6 | Khám trực tiếp/từ xa, hồ sơ, đơn thuốc, hàng đợi, thông báo và audit | Cả nhóm theo phạm vi phụ trách |
| 4 | Tuần 7–8 | Kiểm thử, sửa lỗi, đóng gói, báo cáo và trình diễn | Cả nhóm theo phạm vi phụ trách |

Đối chiếu cập nhật ngày 15/11/2026: phần backend nghiệp vụ của sprint 3 đã có API và kiểm thử; M09 mới hoàn thành vòng đời phiên, phân quyền và signaling. Chưa đánh dấu toàn bộ sprint 3 hoặc sprint 4 hoàn tất vì còn tích hợp frontend, media/TURN, kiểm thử toàn trình và các hạng mục bàn giao.

Điều kiện bàn giao: các tiêu chí chấp nhận đạt; không còn lỗi cản trở luồng chính; kiểm thử chống trùng lịch và phân quyền đạt; độ bao phủ kiểm thử đơn vị logic nghiệp vụ tối thiểu 60%.

## 7. Theo dõi tiến độ thực tế

| Hạng mục | Người thực hiện hoặc phụ trách | Thời hạn kế hoạch | Trạng thái hiện tại |
|---|---|---|---|
| Cấu trúc dự án, yêu cầu và quy tắc nghiệp vụ | Vòng Kỷ Phong | Tuần 1 | Đã có |
| Mô hình, kiến trúc, dữ liệu và hợp đồng API | Vòng Kỷ Phong | Tuần 2 | Đã có tài liệu |
| Đặc tả màn hình, kế hoạch kiểm thử và phân công | Vòng Kỷ Phong | Tuần 2 | Đã có tài liệu |
| Backend của chín phân hệ | Vòng Kỷ Phong | Tuần 3–6 | Cập nhật 15/11/2026: đã có API nghiệp vụ M01–M08, gồm tiến trình khám, hồ sơ/đơn thuốc, hàng đợi, nhắc lịch qua email và tra cứu audit. M09 đã có vòng đời phiên, token và signaling WebRTC; media/TURN và nghiệm thu cuộc gọi đầu cuối còn lại. [Chi tiết](backend-completion.md) |
| Kiểm thử và hợp đồng API backend | Vòng Kỷ Phong | Tuần 3–8 | Build sạch đạt 49/49 test, không bỏ qua test; hai kiểm tra bổ sung về nhắc lịch đúng 30 phút và OpenAPI đạt. Smoke test OIDC thật, phân quyền, check-in, audit, đặt/đổi/hủy và email đạt. OpenAPI xuất lại: 46 thao tác, 38 đường dẫn; health UP và Swagger HTTP 200 tại lần kiểm tra 15/11/2026 |
| Frontend bệnh nhân | Vũ Trần Khắc Thuận | Tuần 3–6 | Đã xây lại giao diện bệnh nhân ClinicCare, nối API bệnh nhân thuộc M01–M04 và cấu hình theme đăng nhập/đóng gói frontend. 18 test đạt; build production và image Docker đạt; form đăng nhập → PKCE → /api/me thật đạt. Hồ sơ/đơn thuốc chờ nối API đã có; video chờ tích hợp signaling/media và nghiệm thu đầu cuối. Chưa nghiệm thu toàn trình đặt/đổi/hủy qua UI với MySQL. Báo cáo frontend cập nhật 08/11/2026, tổng hợp kiểm chứng 06/11/2026; trạng thái phụ thuộc backend cập nhật 15/11/2026 |
| Frontend bác sĩ | Nguyễn Huỳnh Anh Kiệt | Tuần 3–6 | Đã hoàn thành giao diện tuần 3–4 (lịch làm việc, lịch hẹn) và sẵn sàng tích hợp API; đã chuẩn bị trước tuần 5–6 |
| Frontend lễ tân, quản trị và kiểm toán | Nguyễn Hiếu Nhân | Tuần 3–6 | Chưa triển khai |
| Kiểm thử độc lập, toàn trình, tải và bảo mật hệ thống | Vũ Đức Thắng | Tuần 3–8 | Chưa ghi nhận kết quả kiểm thử độc lập của thành viên; bộ test backend do Vòng Kỷ Phong thực hiện được ghi riêng ở trên |
| MySQL, các môi trường, nạp dữ liệu, sao lưu/phục hồi, đóng gói và CI/CD | Vòng Kỷ Phong | Tuần 3–8 | Đã có migration V1/V2, trigger bảo vệ dữ liệu, MySQL local/test và dữ liệu demo trực tiếp/từ xa; script run-backend tự khởi động MySQL/Keycloak/Mailpit. Build backend và smoke test local đạt; đã có cấu hình đóng gói/CI. CI trên GitHub, môi trường production và sao lưu/phục hồi chưa nghiệm thu |
| Nội dung dữ liệu mô phỏng và tài liệu sử dụng | Nguyễn Thường | Tuần 3–8 | Cập nhật 18/11/2026: đã nạp và đọc lại dữ liệu trong MySQL local, xác minh chạy lại cùng tham số giữ nguyên lịch. Hướng dẫn, tài khoản và trình nạp nằm ở [data_demo](../data_demo/README.md). Kiểm tra video hai phía và nghiệm thu trên môi trường bàn giao còn mở. [Checklist](contributions/52400244_NguyenThuong/CHECKLIST.md) |
| Báo cáo tổng hợp, slide và bàn giao | Nguyễn Thường tổng hợp; cả nhóm cung cấp nội dung | Tuần 7–8 | Chưa hoàn thành báo cáo tổng hợp/slide; chưa có bản DOCX/PPTX được bàn giao. Đã bàn giao riêng gói dữ liệu/tài liệu demo, không dùng việc này để đánh dấu báo cáo/slide hoàn tất |

Tiến độ thực tế được ghi nhận theo sản phẩm bàn giao và kết quả kiểm tra. Việc có kế hoạch hoặc tài liệu không đồng nghĩa với hoàn thành triển khai. Các thay đổi tiếp theo được ghi nhận cùng người thực hiện, kết quả và thời hạn điều chỉnh.

## 8. Bàn giao backend của Vòng Kỷ Phong — cập nhật 15/11/2026

**Thành viên:** Vòng Kỷ Phong — **MSSV 52400225**.

| Sản phẩm / minh chứng | Vị trí |
|---|---|
| Mã nguồn backend và các phân hệ bổ sung | [backend/src/main/java/com/clinic](../backend/src/main/java/com/clinic) |
| Migration cho hàng đợi, bệnh án, đơn thuốc và phiên từ xa | [V2__clinical.sql](../backend/src/main/resources/db/migration/V2__clinical.sql) |
| Kiểm thử nghiệp vụ, đồng thời, quyền truy cập và rollback | [SchedulingIntegrationTest.java](../backend/src/test/java/com/clinic/SchedulingIntegrationTest.java) |
| Kiểm thử JWT | [JwtValidationTest.java](../backend/src/test/java/com/clinic/config/JwtValidationTest.java) |
| Kiểm tra tích hợp với Keycloak, API và Mailpit | [scripts/smoke.py](../scripts/smoke.py) |
| Khởi động backend và hạ tầng local | [scripts/run-backend.ps1](../scripts/run-backend.ps1) |
| Hợp đồng API thực thi và hướng dẫn tích hợp | [OpenAPI JSON](api/openapi.json), [backend-completion.md](backend-completion.md) |

Các phần cần tiếp tục theo phân công:

- **Vòng Kỷ Phong:** cấu hình/tích hợp media, STUN/TURN; bổ sung cơ chế đóng phòng/webhook nếu dùng nhà cung cấp media; kiểm chứng sao lưu/phục hồi, CI/CD và môi trường triển khai. Chưa xác nhận đạt ngưỡng coverage 60% chỉ từ số lượng test đã chạy.
- **Các thành viên frontend:** nối API hồ sơ, đơn thuốc, hàng đợi, audit và phiên từ xa; cập nhật JWT, version, Idempotency-Key và payload theo hợp đồng; thay dữ liệu mock trong các luồng tích hợp.
- **Vũ Đức Thắng phối hợp cả nhóm:** kiểm thử toàn trình qua giao diện, cuộc gọi hai trình duyệt, mất mạng/nối lại, tải, bảo mật và nghiệm thu các tiêu chí còn lại.

Kết quả trên xác nhận phần backend và kiểm thử đã thực hiện; chưa xác nhận toàn hệ thống hoặc cuộc gọi video/audio đã hoàn tất đầu cuối.


## 9. Checklist bàn giao Nguyễn Thường — 52400244, cập nhật 18/11/2026

- [x] Chuẩn bị nội dung dữ liệu mô phỏng, mapping seed và request mẫu chuẩn API; không nạp trực tiếp fixtures thiết kế vào DB.
- [x] Bàn giao generator ngày Việt Nam, luồng đặt/đổi/hủy, clinical/queue và vòng đời telehealth; kiểm tra tĩnh và 40 test công cụ/dữ liệu đạt.
- [x] Bàn giao bản hướng dẫn theo source, kịch bản demo, truy vết 24 TC và báo cáo kiểm chứng của bộ dữ liệu.
- [x] Bàn giao hợp đồng BE–FE 1.0.0: 46 thao tác/38 đường dẫn/48 schema, checker và 7 test hợp đồng đạt.
- [x] Nạp vào MySQL local qua API, xác nhận lịch hẹn và dữ liệu ca đã khám, bàn giao trình nạp cùng hướng dẫn sử dụng.
- [ ] Phối hợp thành viên BE/QA chạy lại trên môi trường bàn giao và bổ sung ảnh UI theo phiên bản nghiệm thu.
- [ ] Hoàn thành báo cáo tổng hợp và slide DOCX/PPTX từ minh chứng cả nhóm; chưa có bản bàn giao.
- [ ] Tổ chức chạy thử và nghiệm thu kịch bản demo toàn hệ thống.

Chỉ checklist của 52400244 được cập nhật trong đợt này. Việc kiểm nội dung/công cụ không thay nhiệm vụ nạp DB, kiểm thử độc lập hoặc nghiệm thu phần mềm của các thành viên khác. Xem [checklist chi tiết](contributions/52400244_NguyenThuong/CHECKLIST.md) và [bằng chứng bản đưa lên main](contributions/52400244_NguyenThuong/report/main-handover.md).
