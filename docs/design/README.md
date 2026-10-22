# Thiết kế hệ thống

Thiết kế sử dụng React + TypeScript, Spring Boot modular monolith và MySQL. Các sơ đồ mô tả hệ thống dự kiến triển khai, không phải kết quả kiểm thử phần mềm.

## Tài liệu nền tảng

- [Kiến trúc và các góc nhìn 4+1](architecture/architecture.md)
- [Phân quyền, bảo mật và audit](architecture/security.md)
- [Từ điển dữ liệu và ràng buộc](database/data-dictionary.md)
- [Đặc tả màn hình](gui-mockups/screen-specifications.md)
- [Hợp đồng API](../api/openapi.yaml)

## Danh mục sơ đồ

| Nhóm | Sơ đồ PNG |
|---|---|
| activity-diagrams | [booking](activity-diagrams/booking.png) |
| activity-diagrams | [consultation](activity-diagrams/consultation.png) |
| activity-diagrams | [telehealth-consultation](activity-diagrams/telehealth-consultation.png) |
| architecture | [deployment](architecture/deployment.png) |
| architecture | [system-architecture](architecture/system-architecture.png) |
| class-diagram | [class-diagram](class-diagram/class-diagram.png) |
| database | [erd-clinical](database/erd-clinical.png) |
| database | [erd-infrastructure](database/erd-infrastructure.png) |
| database | [erd-scheduling](database/erd-scheduling.png) |
| database | [erd](database/erd.png) |
| sequence-diagrams | [book-appointment](sequence-diagrams/book-appointment.png) |
| sequence-diagrams | [cancel-appointment](sequence-diagrams/cancel-appointment.png) |
| sequence-diagrams | [checkin-and-queue](sequence-diagrams/checkin-and-queue.png) |
| sequence-diagrams | [consultation-progress](sequence-diagrams/consultation-progress.png) |
| sequence-diagrams | [medical-record](sequence-diagrams/medical-record.png) |
| sequence-diagrams | [notifications](sequence-diagrams/notifications.png) |
| sequence-diagrams | [prescription](sequence-diagrams/prescription.png) |
| sequence-diagrams | [skip-ticket](sequence-diagrams/skip-ticket.png) |
| sequence-diagrams | [telehealth](sequence-diagrams/telehealth.png) |
| state-diagrams | [appointment](state-diagrams/appointment.png) |
| state-diagrams | [medical-record](state-diagrams/medical-record.png) |
| state-diagrams | [queue-ticket](state-diagrams/queue-ticket.png) |
| state-diagrams | [telehealth](state-diagrams/telehealth.png) |
| use-case | [use-case-1](use-case/use-case-1.png) |
| use-case | [use-case-2](use-case/use-case-2.png) |
| use-case | [use-case-3](use-case/use-case-3.png) |
| use-case | [use-case-4](use-case/use-case-4.png) |
| use-case | [use-case-diagram](use-case/use-case-diagram.png) |

## Cách đọc mô hình

Use case tổng quan liệt kê các mục tiêu, các bản use-case-1 đến use-case-4 tách nhóm để đưa vào báo cáo. UC-17 là hành vi audit nội bộ; kiểm toán viên tra cứu qua UC-18. Quan hệ include chỉ được dùng cho hành vi bắt buộc, không biểu diễn thứ tự thao tác.

Class diagram thể hiện khái niệm miền nghiệp vụ; ERD thể hiện cấu trúc dữ liệu MySQL. ERD tổng quan và ba góc nhìn đặt lịch, lâm sàng, hạ tầng dùng cùng định nghĩa thực thể. Các ràng buộc liên bảng và điều kiện nghiệp vụ nằm trong từ điển dữ liệu.

Activity mô tả quy trình; sequence mô tả tương tác và ranh giới giao dịch; state diagram mô tả chuyển trạng thái hợp lệ. Nhãn kỹ thuật và mã trạng thái dùng tiếng Anh thống nhất với API; phần giải thích nghiệp vụ dùng tiếng Việt.

Các sơ đồ được lưu ở định dạng PNG để xem và chèn vào báo cáo. Khi thay đổi thiết kế, cập nhật hình ảnh và tài liệu truy vết tương ứng.
