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

làm tiếp những cái gì thì bổ sung ở đây

## 4. Phân công giai đoạn triển khai

| Thành viên | Phạm vi trách nhiệm | Sản phẩm bàn giao |
|---|---|---|
| **Vòng Kỷ Phong** | Backend của cả chín phân hệ; xác thực, phân quyền, logic nghiệp vụ, giao dịch chống trùng lịch, audit, kết nối Email/SMS/video phía máy chủ; toàn bộ MySQL từ cài đặt, cấu hình, schema, migration đến sao lưu/phục hồi; toàn bộ môi trường phát triển, kiểm thử, trình diễn và triển khai, cấu hình dịch vụ, đóng gói và CI/CD | Backend Spring Boot, API, migration, kiểm thử đơn vị logic nghiệp vụ, MySQL và các môi trường hoạt động, cấu hình đóng gói/CI/CD, quy trình sao lưu/phục hồi, OpenAPI và tài liệu kỹ thuật cập nhật |
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

Tuần 1–2 tương ứng với khối lượng phân tích và thiết kế hiện có do Vòng Kỷ Phong thực hiện. Chưa ghi nhận đóng góp của năm thành viên còn lại trong giai đoạn này. Từ tuần 3 là kế hoạch triển khai.

| Tuần | Vòng Kỷ Phong | Vũ Trần Khắc Thuận | Nguyễn Huỳnh Anh Kiệt | Nguyễn Hiếu Nhân | Vũ Đức Thắng | Nguyễn Thường |
|---|---|---|---|---|---|---|
| 1 | Phạm vi, SRS, FR/NFR, quy tắc, user stories và quy trình nghiệp vụ | — | — | — | — | Phạm vi, SRS, FR/NFR, quy tắc, user stories và quy trình nghiệp vụ |
| 2 | UML, kiến trúc, MySQL, phân quyền, màn hình, OpenAPI, test plan và kế hoạch nhóm | — | — | — | — | UML, kiến trúc, MySQL |
| 3 | Khởi tạo backend, migration, M01–M03, nền tảng audit và API lịch trống; thiết lập MySQL, môi trường phát triển/kiểm thử và CI cơ bản | Khởi tạo frontend, đăng nhập dùng chung, tra cứu bác sĩ/lịch trống | Giao diện lịch làm việc/lịch nghỉ | Bố cục nhân viên, danh mục và quản lý quyền | Thiết lập bộ kiểm thử API; kiểm tra xác thực, danh mục | Chuẩn bị nội dung dữ liệu mô phỏng và đề cương báo cáo |
| 4 | M04: đặt/đổi/hủy, khóa giao dịch, phiên bản và quyền; thông báo xác nhận cơ bản; tích hợp môi trường frontend/backend, đóng gói và nạp dữ liệu kiểm thử | Tích hợp đặt/đổi/hủy và lịch bệnh nhân | Tích hợp lịch làm việc và lịch hẹn bác sĩ | Hoàn thiện danh mục, quyền hiển thị; chuẩn bị tiếp đón | Kiểm thử lịch hẹn, tranh chấp, thời hạn và quyền tài nguyên | Bổ sung dữ liệu đặt lịch và tài liệu sử dụng các chức năng đã hoàn thành |
| 5 | M05, M08; hoàn thiện M06, M07: hồ sơ/đơn, hàng đợi, nhắc lịch và audit; thiết lập và kiểm tra sao lưu/phục hồi MySQL | Xem hồ sơ và đơn thuốc | Biểu mẫu khám, kê đơn, gọi lượt và bắt đầu khám | Check-in/hàng đợi, thông báo và audit | Kiểm thử hồ sơ, đơn thuốc, hàng đợi và nhắc lịch | Chuẩn bị dữ liệu khám trực tiếp và tổng hợp báo cáo giữa kỳ |
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

Điều kiện bàn giao: các tiêu chí chấp nhận đạt; không còn lỗi cản trở luồng chính; kiểm thử chống trùng lịch và phân quyền đạt; độ bao phủ kiểm thử đơn vị logic nghiệp vụ tối thiểu 60%.

## 7. Theo dõi tiến độ thực tế

| Hạng mục | Người thực hiện hoặc phụ trách | Thời hạn kế hoạch | Trạng thái hiện tại |
|---|---|---|---|
| Cấu trúc dự án, yêu cầu và quy tắc nghiệp vụ | Vòng Kỷ Phong | Tuần 1 | Đã có |
| Mô hình, kiến trúc, dữ liệu và hợp đồng API | Vòng Kỷ Phong | Tuần 2 | Đã có tài liệu |
| Đặc tả màn hình, kế hoạch kiểm thử và phân công | Vòng Kỷ Phong | Tuần 2 | Đã có tài liệu |
| Backend của chín phân hệ | Vòng Kỷ Phong | Tuần 3–6 | Chưa triển khai |
| Frontend bệnh nhân | Vũ Trần Khắc Thuận | Tuần 3–6 | Chưa triển khai |
| Frontend bác sĩ | Nguyễn Huỳnh Anh Kiệt | Tuần 3–6 | Chưa triển khai |
| Frontend lễ tân, quản trị và kiểm toán | Nguyễn Hiếu Nhân | Tuần 3–6 | Chưa triển khai |
| Bộ kiểm thử tự động và kiểm thử hệ thống | Vũ Đức Thắng | Tuần 3–8 | Chưa thực thi |
| MySQL, các môi trường, nạp dữ liệu, sao lưu/phục hồi, đóng gói và CI/CD | Vòng Kỷ Phong | Tuần 3–8 | Chưa triển khai |
| Nội dung dữ liệu mô phỏng và tài liệu sử dụng | Nguyễn Thường | Tuần 3–8 | Chưa hoàn thành |
| Báo cáo tổng hợp, slide và bàn giao | Nguyễn Thường tổng hợp; cả nhóm cung cấp nội dung | Tuần 7–8 | Chưa hoàn thành |

Tiến độ thực tế được ghi nhận theo sản phẩm bàn giao và kết quả kiểm tra. Việc có kế hoạch hoặc tài liệu không đồng nghĩa với hoàn thành triển khai. Các thay đổi tiếp theo được ghi nhận cùng người thực hiện, kết quả và thời hạn điều chỉnh.

