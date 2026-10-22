# Ma trận truy vết

Ma trận thể hiện mối liên hệ giữa nguồn yêu cầu, chức năng, ca sử dụng, thiết kế và ca kiểm thử. Trạng thái triển khai và kiểm thử được ghi nhận riêng cho từng yêu cầu.

| Nguồn | FR / Module | Story / AC / UC / Test | Thiết kế | Thao tác API hoặc xử lý nội bộ | Trạng thái triển khai / kiểm thử |
|---|---|---|---|---|---|
| Đề bài | FR-01 / M01 | US-01 / AC-01 / UC-01 / TC-01 | [security](../design/architecture/security.md) | `getMe`; quy tắc tầng dịch vụ | Chưa triển khai / Chưa thực thi |
| Phạm vi cụ thể hóa hoặc mở rộng | FR-02 / M01 | US-02 / AC-02 / UC-02 / TC-02 | [security](../design/architecture/security.md) | `getMe`, `setRoles`, `listAppointments`; quy tắc tầng dịch vụ | Chưa triển khai / Chưa thực thi |
| Phạm vi cụ thể hóa hoặc mở rộng | FR-03 / M02 | US-03 / AC-03 / UC-03 / TC-03 | [class](../design/class-diagram/class-diagram.png) | `listSpecialties`, `createSpecialty`, `listDoctors`, `createDoctor`, `updateDoctor`; quy tắc tầng dịch vụ | Chưa triển khai / Chưa thực thi |
| Phạm vi cụ thể hóa hoặc mở rộng | FR-04 / M02 | US-04 / AC-04 / UC-04 / TC-04 | [class](../design/class-diagram/class-diagram.png) | `updateDoctor`; quy tắc tầng dịch vụ | Chưa triển khai / Chưa thực thi |
| Đề bài | FR-05 / M03 | US-05 / AC-05 / UC-05 / TC-05 | [ERD](../design/database/erd.png) | `createAvailability`; quy tắc tầng dịch vụ | Chưa triển khai / Chưa thực thi |
| Đề bài và phạm vi cụ thể hóa | FR-06 / M03 | US-06 / AC-06 / UC-06 / TC-06 | [ERD](../design/database/erd.png) | `createTimeOff`; quy tắc tầng dịch vụ | Chưa triển khai / Chưa thực thi |
| Đề bài | FR-07 / M03 | US-07 / AC-07 / UC-07 / TC-07 | [ERD](../design/database/erd.png) | `listSlots`; quy tắc tầng dịch vụ | Chưa triển khai / Chưa thực thi |
| Đề bài | FR-08 / M04 | US-08 / AC-08 / UC-08 / TC-08 | [sequence](../design/sequence-diagrams/book-appointment.png), [states](../design/state-diagrams/appointment.png) | `bookAppointment`; quy tắc tầng dịch vụ | Chưa triển khai / Chưa thực thi |
| Phạm vi cụ thể hóa hoặc mở rộng | FR-09 / M04 | US-09 / AC-09 / UC-09 / TC-09 | [sequence](../design/sequence-diagrams/book-appointment.png), [states](../design/state-diagrams/appointment.png) | `rescheduleAppointment`; quy tắc tầng dịch vụ | Chưa triển khai / Chưa thực thi |
| Phạm vi cụ thể hóa hoặc mở rộng | FR-10 / M04 | US-10 / AC-10 / UC-10 / TC-10 | [hủy lịch](../design/sequence-diagrams/cancel-appointment.png), [trạng thái](../design/state-diagrams/appointment.png) | `cancelAppointment`; quy tắc tầng dịch vụ | Chưa triển khai / Chưa thực thi |
| Phạm vi cụ thể hóa hoặc mở rộng | FR-11 / M04 | US-11 / AC-11 / UC-11 / TC-11 | [tiến trình khám](../design/sequence-diagrams/consultation-progress.png), [trạng thái](../design/state-diagrams/appointment.png) | `listAppointments`, `progressAppointment`; quy tắc tầng dịch vụ | Chưa triển khai / Chưa thực thi |
| Đề bài | FR-12 / M05 | US-12 / AC-12 / UC-12 / TC-12 | [clinical sequence](../design/sequence-diagrams/medical-record.png) | `listPatientRecords`; quy tắc tầng dịch vụ | Chưa triển khai / Chưa thực thi |
| Đề bài | FR-13 / M05 | US-13 / AC-13 / UC-13 / TC-13 | [hồ sơ](../design/sequence-diagrams/medical-record.png), [trạng thái hồ sơ](../design/state-diagrams/medical-record.png) | `saveRecord`, `amendRecord`; quy tắc tầng dịch vụ | Chưa triển khai / Chưa thực thi |
| Đề bài | FR-14 / M05 | US-14 / AC-14 / UC-14 / TC-14 | [đơn thuốc](../design/sequence-diagrams/prescription.png) | `createPrescription`, `issuePrescription`, `listPatientPrescriptions`; quy tắc tầng dịch vụ | Chưa triển khai / Chưa thực thi |
| Đề bài | FR-15 / M06 | US-15 / AC-15 / UC-15 / TC-15 | [thông báo](../design/sequence-diagrams/notifications.png) | `listNotificationJobs`; bộ xử lý nền + outbox | Chưa triển khai / Chưa thực thi |
| Cụ thể hóa yêu cầu đề bài | FR-16 / M06 | US-16 / AC-16 / UC-16 / TC-16 | [thông báo](../design/sequence-diagrams/notifications.png) | `listNotificationJobs`; bộ xử lý nền + outbox | Chưa triển khai / Chưa thực thi |
| Đề bài | FR-17 / M07 | US-17 / AC-17 / UC-17 / TC-17 | [security](../design/architecture/security.md) | `setRoles`, `listAuditEvents`; thành phần ghi nhật ký kiểm toán | Chưa triển khai / Chưa thực thi |
| Đề bài | FR-18 / M07 | US-18 / AC-18 / UC-18 / TC-18 | [security](../design/architecture/security.md) | `listAuditEvents`; thành phần ghi nhật ký kiểm toán | Chưa triển khai / Chưa thực thi |
| Phạm vi cụ thể hóa hoặc mở rộng | FR-19 / M08 | US-19 / AC-19 / UC-19 / TC-19 | [queue sequence](../design/sequence-diagrams/checkin-and-queue.png) | `checkIn`; quy tắc tầng dịch vụ | Chưa triển khai / Chưa thực thi |
| Phạm vi cụ thể hóa hoặc mở rộng | FR-20 / M08 | US-20 / AC-20 / UC-20 / TC-20 | [queue sequence](../design/sequence-diagrams/checkin-and-queue.png) | `callNext`; quy tắc tầng dịch vụ | Chưa triển khai / Chưa thực thi |
| Phạm vi cụ thể hóa hoặc mở rộng | FR-21 / M08 | US-21 / AC-21 / UC-21 / TC-21 | [bỏ lượt](../design/sequence-diagrams/skip-ticket.png), [hàng đợi](../design/state-diagrams/queue-ticket.png) | `skipTicket`; quy tắc tầng dịch vụ | Chưa triển khai / Chưa thực thi |
| Phạm vi cụ thể hóa hoặc mở rộng | FR-22 / M09 | US-22 / AC-22 / UC-22 / TC-22 | [remote sequence](../design/sequence-diagrams/telehealth.png), [states](../design/state-diagrams/telehealth.png) | `prepareSession`; quy tắc tầng dịch vụ | Chưa triển khai / Chưa thực thi |
| Phạm vi cụ thể hóa hoặc mở rộng | FR-23 / M09 | US-23 / AC-23 / UC-23 / TC-23 | [remote sequence](../design/sequence-diagrams/telehealth.png), [states](../design/state-diagrams/telehealth.png) | `joinSession`, `startSession`; quy tắc tầng dịch vụ | Chưa triển khai / Chưa thực thi |
| Phạm vi cụ thể hóa hoặc mở rộng | FR-24 / M09 | US-24 / AC-24 / UC-24 / TC-24 | [remote sequence](../design/sequence-diagrams/telehealth.png), [states](../design/state-diagrams/telehealth.png) | `endSession`; quy tắc tầng dịch vụ | Chưa triển khai / Chưa thực thi |

## Truy vết chất lượng

| NFR | Thiết kế / quy tắc | Kiểm chứng dự kiến |
|---|---|---|
| NFR-01 | Architecture / index | TC-N01 |
| NFR-02 | BR-03/04, giao dịch InnoDB, khóa và kiểm tra xung đột | TC-08/09/20 |
| NFR-03 | Security matrix / BR-01 | TC-N02, TC-02/12/23 |
| NFR-04 | Encryption / backup / key management | TC-N07, TC-N03 |
| NFR-05 | Audit / BR-13/16 | TC-17/18, TC-N04 |
| NFR-06 | Backup/restore dữ liệu trình diễn | TC-N03 |
| NFR-07 | Xử lý lỗi phụ thuộc | TC-N08 |
| NFR-08 | Screen specifications | TC-N05 |
| NFR-09 | Telehealth state machine | TC-N06, TC-24 |
| NFR-10 | Architecture / OpenAPI / model source | TC-N09 |
| NFR-11 | Test plan / coverage | TC-N09 |
| NFR-12 | Dữ liệu giả và kiểm tra log | TC-N10 |

Các quy tắc BR được ánh xạ đến phân hệ trong [quy tắc nghiệp vụ](business-rules.md). G-01 → M02/M03/M04; G-02 → M05; G-03 → M06/M08/M09; G-04 → M01/M07.
