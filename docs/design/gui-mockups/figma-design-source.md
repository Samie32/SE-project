# Nguồn thiết kế Figma ClinicCare

Ngày đối chiếu: **17/11/2026**.

- [Bắt đầu: Nguồn thiết kế desktop](https://www.figma.com/design/jT5Oqtd2kzmcT3jloN92Lk/ClinicCare?node-id=195-2).
- [Bảng màn hình, route, quyền, API và trạng thái](https://www.figma.com/design/jT5Oqtd2kzmcT3jloN92Lk/ClinicCare?node-id=202-520).
- [Màn hình kiểm toán đã đồng bộ](https://www.figma.com/design/jT5Oqtd2kzmcT3jloN92Lk/ClinicCare?node-id=199-183).

## Phạm vi sử dụng

Trang **00 · NGUỒN THIẾT KẾ · Desktop 17.11.2026** là nguồn tham chiếu UI cho phạm vi hiện tại: 21 route ứng dụng đã đăng nhập và trang đăng nhập, cùng các trạng thái nghiệp vụ tiêu biểu. `/callback` là trạng thái chuyển tiếp OIDC; các route có `:appointmentId` là biến thể chi tiết. Dashboard `/staff` có hai biến thể menu theo vai trò. `#reception` và tiền tố `state:` trong tên frame chỉ là khóa phân biệt trong Figma, không phải route cần thêm vào React.

Nguồn này phục vụ báo cáo, trao đổi thiết kế và đối chiếu triển khai. Các bố cục được chuẩn hóa theo ClinicCare; không yêu cầu thay lại frontend theo từng pixel hoặc thay luồng ứng dụng để giống prototype. Khi có khác biệt về hành vi, ưu tiên mã nguồn hiện tại và [hợp đồng tích hợp](../../api/integration-contract.md), ghi rõ thay đổi thiết kế trước khi mở rộng phạm vi.

Giữ frontend, backend, Keycloak, API và responsive hiện có. Không phát sinh công việc triển khai giao diện điện thoại riêng hoặc bottom navigation. Trang mobile cũ được giữ làm tham khảo, ngoài phạm vi bàn giao hiện tại.

## Những điểm đã đồng bộ

- Năm vai trò theo `frontend/src/core/permissions.ts`. ADMINISTRATOR đơn thuần không xem audit; muốn xem phải có thêm AUDITOR.
- Menu theo `frontend/src/layouts/nav.ts`; không có hộp thông báo cá nhân cho bệnh nhân/bác sĩ và không có luồng lễ tân đặt lịch hộ trong nguồn chính.
- Đặt lịch theo ba bước; đổi/hủy theo điều kiện hiện có. Timeout chưa rõ kết quả khác với thành công hoặc xung đột slot.
- Ca khám gồm chọn ca, bắt đầu, bệnh án, đơn thuốc và lịch sử. Hồ sơ DRAFT/FINAL, đơn DRAFT/ISSUED và hoàn tất ca khám là các thao tác riêng.
- Hồ sơ có triệu chứng, chỉ số sinh tồn, chẩn đoán, hướng điều trị/lời dặn, ghi chú. Đơn thuốc có đủ năm trường: tên, liều, đường dùng, tần suất, thời gian dùng.
- Lịch làm việc phản ánh thao tác thêm ca và thời gian nghỉ đang có; không đưa sửa/xóa hoặc quy trình duyệt nghỉ mới vào phạm vi.
- Thông báo là màn hình theo dõi tác vụ gửi và chi tiết. Hệ thống tự thử lại; không có nút gửi lại thủ công hoặc kênh SMS bắt buộc trong nguồn chính.
- Audit dùng ngày giờ đầy đủ, tác nhân, đối tượng, hành động, kết quả, correlation; lọc theo actorId/resourceId/thời gian. Dùng trước/sau, không giả định tổng trang. CSV và lọc action ngoài phạm vi hiện tại.
- Bổ sung các màn hình Chuyên khoa, Phân quyền và Tài khoản đã có trong code.
- Đăng nhập chuyển Keycloak; React không thu mật khẩu và không cho người dùng tự chọn vai trò.

## Ánh xạ nguồn

| Màn hình / route | Vai trò | Mã nguồn |
|---|---|---|
| `/patient` | PATIENT | `frontend/src/features/patient/Dashboard.tsx` |
| `/patient/booking` | PATIENT | `frontend/src/features/patient/Booking.tsx` |
| `/patient/appointments` | PATIENT | `frontend/src/features/patient/Appointments.tsx` |
| `/patient/records` | PATIENT | `frontend/src/features/patient/Records.tsx` |
| `/patient/telehealth` | PATIENT | `frontend/src/features/patient/Telehealth.tsx` |
| `/doctor` | DOCTOR | `frontend/src/features/doctor/Home.tsx` |
| `/doctor/schedule` | DOCTOR | `frontend/src/features/doctor/Schedule.tsx` |
| `/doctor/appointments` | DOCTOR | `frontend/src/features/doctor/Appointments.tsx` |
| `/doctor/queue` | DOCTOR | `frontend/src/features/doctor/Queue.tsx` |
| `/doctor/consultation[/:appointmentId]` | DOCTOR phụ trách | `frontend/src/features/doctor/Consultation.tsx` |
| `/doctor/telehealth[/:appointmentId]` | DOCTOR phụ trách | `frontend/src/features/doctor/Telehealth.tsx` |
| `/staff` | RECEPTIONIST / ADMINISTRATOR | `frontend/src/features/staff/Dashboard.tsx` |
| `/staff/reception` | RECEPTIONIST | `frontend/src/features/staff/Reception.tsx` |
| `/staff/queue` | RECEPTIONIST | `frontend/src/features/staff/Queue.tsx` |
| `/staff/notifications` | RECEPTIONIST / ADMINISTRATOR | `frontend/src/features/staff/Notifications.tsx` |
| `/admin/doctors` | ADMINISTRATOR | `frontend/src/features/admin/Doctors.tsx` |
| `/admin/specialties` | ADMINISTRATOR | `frontend/src/features/admin/Specialties.tsx` |
| `/admin/schedules` | ADMINISTRATOR | `frontend/src/features/admin/Schedules.tsx` |
| `/admin/permissions` | ADMINISTRATOR | `frontend/src/features/admin/Permissions.tsx` |
| `/audit` | AUDITOR | `frontend/src/features/staff/Audit.tsx` |
| `/account` | Đã đăng nhập | `frontend/src/features/account/Account.tsx` |
| `/login`, `/callback` | OIDC | `frontend/src/auth/LoginPage.tsx` |

Các API tương ứng nằm trong `frontend/src/api/{appointments,catalog,schedule,operations}.ts`. Bảng Figma ghi API theo nhóm; đường dẫn, payload, quyền và vòng đời chính xác theo các adapter này và hợp đồng tích hợp.

## Đọc prototype và trạng thái

Mở Present và chọn Bắt đầu, Bệnh nhân, Bác sĩ, Lễ tân, Quản trị hoặc Kiểm toán. Logo ClinicCare trong các frame nguồn đưa về trang hướng dẫn; menu điều hướng trong phạm vi vai trò. Các màn hình dùng chung có biến thể menu theo vai trò. Nút trên hình mô tả trạng thái, không gọi API hoặc xác thực. Form là minh họa, không phải nhập liệu động; một số điều khiển được giữ tĩnh.

Bảng bàn giao quy định loading, rỗng, lỗi tải/thử lại, disabled, 401/403, 409/phiên bản cũ, thiếu dữ liệu, kết quả giao dịch chưa rõ, thiết bị media và phiên đóng. Những trạng thái chưa có frame riêng dùng lại UI hiện có; không tạo công việc thiết kế hoặc phát triển mới chỉ để tăng số lượng frame.

## Lịch sử và kiểm chứng

Các trang 90–93 là desktop/mobile prototype, ma trận và QA lịch sử. Link gốc tới section kiểm toán vẫn được giữ và có chỉ dẫn mở nguồn desktop mới. Số đếm QA ngày 12/11 không áp dụng cho trang nguồn mới.

Kiểm chứng đợt này gồm đọc lại cấu trúc editable, font Inter, cỡ chữ tối thiểu 12px, đích điều hướng và ảnh render tiêu biểu (hướng dẫn, bàn giao, audit, chuyên khoa, bệnh án). Không nhập screenshot làm nội dung UI. Kết quả kiểm tra cấu trúc sau cùng ghi trong phần bàn giao công việc.

Kết quả đọc lại trang nguồn: **59 frame nguồn**, **339 điều khiển có liên kết**, **6 điểm bắt đầu prototype**; đủ 22 route tham chiếu chính. Không phát hiện đích mất, font khác Inter, chữ dưới 12px, ảnh thay UI, nội dung vượt container hoặc frame cấp cao chồng nhau trong kiểm tra cấu trúc. Đây là kiểm tra artifact, không phải kiểm thử người dùng hay chạy mọi thao tác prototype.

Không thay đổi mã ứng dụng và không chạy lại bộ test ứng dụng chỉ vì cập nhật Figma/tài liệu. Đây không phải bằng chứng E2E Keycloak–API–MySQL, kiểm thử accessibility, media thật hoặc TURN. Các vấn đề tích hợp tiếp tục theo [backlog hiện có](../../api/integration-backlog.md) và [hướng dẫn WebRTC](../../webrtc-client.md).
