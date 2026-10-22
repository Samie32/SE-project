# Đặc tả yêu cầu phần mềm (SRS)

**Đề tài:** Outpatient Clinic Telehealth & Appointment Scheduling System

## 1. Mục đích

Tài liệu xác định các yêu cầu đối với hệ thống quản lý phòng khám ngoại trú, bao gồm quản lý lịch làm việc, đặt lịch, tiếp đón, khám trực tiếp và từ xa, hồ sơ bệnh án, đơn thuốc và thông báo. Các yêu cầu là cơ sở cho thiết kế hệ thống và xây dựng tiêu chí kiểm thử.

## 2. Tổng quan và ràng buộc

Hệ thống phục vụ một phòng khám với năm vai trò: bệnh nhân, bác sĩ, lễ tân, quản trị viên và kiểm toán viên. Chức năng và giới hạn của chín phân hệ được xác định trong [phạm vi hệ thống](scope.md).

Nền tảng công nghệ gồm React + TypeScript, Java Spring Boot và MySQL. Các dịch vụ xác thực, Email/SMS và hội nghị trực tuyến được tích hợp thông qua lớp kết nối độc lập với nhà cung cấp.

Phiên bản tài liệu này bao gồm phân tích và thiết kế, chưa bao gồm kết quả triển khai.

## 3. Đặc tả yêu cầu

- [Yêu cầu chức năng](functional-requirements.md): hành vi của chín phân hệ, được mô tả theo điều kiện kích hoạt và phản hồi của hệ thống.
- [Yêu cầu phi chức năng](non-functional-requirements.md): chất lượng hệ thống, chỉ số đánh giá và phương pháp kiểm chứng.
- [Quy tắc nghiệp vụ](business-rules.md): điều kiện xử lý, giới hạn thời gian, phân quyền và chuyển trạng thái.
- [User stories](user-stories.md) và [tiêu chí chấp nhận](acceptance-criteria.md): nhu cầu của người dùng và kết quả mong đợi.
- [Đặc tả ca sử dụng](../analysis/use-cases.md): tác nhân, tiền điều kiện, luồng xử lý, ngoại lệ và hậu điều kiện.

## 4. Giao diện và dữ liệu

[Giao diện người dùng](../design/gui-mockups/screen-specifications.md) mô tả các màn hình và hành vi tương tác. Giao diện lập trình được đặc tả bằng [OpenAPI](../api/openapi.yaml), sử dụng HTTPS và JSON.

[Mô hình dữ liệu](../design/database/data-dictionary.md) xác định các thực thể, quan hệ và ràng buộc toàn vẹn. Email/SMS chỉ chứa thông tin thông báo cần thiết; nội dung hồ sơ bệnh án và mã truy cập không được đưa vào thông báo. Dữ liệu âm thanh và hình ảnh của phiên khám không được lưu trong MySQL.

## 5. Truy vết và kiểm chứng

[Ma trận truy vết](traceability-matrix.md) liên kết nguồn yêu cầu, yêu cầu hệ thống, ca sử dụng, thiết kế và ca kiểm thử. [Kế hoạch kiểm thử](../testing/test-plan.md) xác định phạm vi, phương pháp và điều kiện đánh giá.

Thay đổi quy tắc nghiệp vụ được phản ánh đồng bộ trong đặc tả yêu cầu, mô hình thiết kế, hợp đồng API và ca kiểm thử liên quan.

## 6. Thuật ngữ

| Thuật ngữ | Diễn giải |
|---|---|
| Appointment | Lịch hẹn khám |
| Availability | Khoảng thời gian bác sĩ nhận khám |
| Slot | Khung giờ có thể đặt lịch |
| Encounter | Lần khám thực tế |
| Medical record | Hồ sơ ghi nhận thông tin của lần khám |
| Prescription | Đơn thuốc |
| Queue phiếu chờ | Phiếu chờ khám |
| Telehealth session | Phiên khám từ xa |
| Audit event | Sự kiện ghi nhận truy cập hoặc thay đổi dữ liệu |
