# Phạm vi đồ án

Hệ thống phục vụ một phòng khám ngoại trú, hỗ trợ khám trực tiếp và khám từ xa. Nền tảng công nghệ gồm React + TypeScript, Spring Boot và MySQL.

## Mục tiêu

- G-01: tìm lịch trống, đặt/đổi/hủy lịch.
- G-02: hỗ trợ bác sĩ quản lý lần khám, hồ sơ và đơn thuốc.
- G-03: tiếp đón, nhắc lịch và khám từ xa.
- G-04: phân quyền và ghi nhật ký truy cập/thay đổi.

## Các phân hệ chức năng

| Mã | Phân hệ | Nguồn |
|---|---|---|
| M01 | Xác thực OAuth2 và phân quyền | Xác thực OAuth2 theo đề bài; cơ chế phân quyền được cụ thể hóa trong thiết kế |
| M02 | Bác sĩ và chuyên khoa | Cụ thể hóa chức năng quản lý bác sĩ trong đề bài |
| M03 | Lịch làm việc, lịch nghỉ, khung giờ | Đề gốc |
| M04 | Đặt, đổi, hủy và trạng thái lịch hẹn | Đặt lịch theo đề bài; đổi và hủy lịch thuộc phạm vi mở rộng |
| M05 | Hồ sơ bệnh án, lịch sử khám, đơn thuốc | Đề gốc |
| M06 | Email/SMS và nhắc lịch | Đề gốc |
| M07 | Bảo mật và nhật ký kiểm toán | Đề gốc |
| M08 | Check-in và hàng đợi | Phạm vi mở rộng của đồ án |
| M09 | Phòng video/audio và phiên khám từ xa | Khám từ xa theo định hướng đề tài; quy trình phiên khám được đặc tả trong đồ án |

Vai trò: bệnh nhân, bác sĩ, lễ tân, quản trị và kiểm toán viên. Kiểm toán viên có quyền tra cứu nhật ký phục vụ đối chiếu hoạt động truy cập và thay đổi dữ liệu.

Ngoài phạm vi: thanh toán, bảo hiểm, kho thuốc, xét nghiệm, nội trú, cấp cứu, AI chẩn đoán/kê đơn, tích hợp EHR quốc gia, ghi âm/ghi hình, đa chi nhánh và ứng dụng mobile native.

Dữ liệu sử dụng trong đồ án là dữ liệu mô phỏng. Dịch vụ OAuth2, Email/SMS và video được mô hình hóa qua giao diện tích hợp độc lập nhà cung cấp; các tình huống lỗi được kiểm thử bằng thành phần mô phỏng. Chức năng gửi thông báo và hội nghị trực tuyến được kiểm thử riêng với dịch vụ tích hợp.

## Tổ chức thực hiện

Đồ án được thực hiện bởi nhóm sáu thành viên trong tám tuần. Trách nhiệm từng thành viên, sản phẩm bàn giao và các mốc tiến độ được trình bày trong [kế hoạch thực hiện](../project-plan.md).
