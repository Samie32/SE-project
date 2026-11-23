# Yêu cầu chức năng

Các yêu cầu được đặc tả theo điều kiện kích hoạt và hành vi của hệ thống.

| ID | Phân hệ | Nguồn | Yêu cầu hệ thống (EARS) |
|---|---|---|---|
| FR-01 | M01 | Đề bài | Khi IdP xác thực hợp lệ (tài khoản/email mật khẩu tối thiểu 8 ký tự hoặc Google OAuth2), hệ thống phải tạo phiên PKCE S256 gắn đúng danh tính UUIDv3(issuer\|subject) và quyền nội bộ, tự cấp vai trò `PATIENT` khi đăng nhập lần đầu, khóa tạm sau 5 lần nhập sai trong 15 phút (60–900 giây), hỗ trợ đặt lại/đổi mật khẩu qua email (khi cấu hình SMTP) với thông báo trung tính, hiển thị thông tin liên hệ giải mã cho chính chủ và yêu cầu xác thực OTP 6 chữ số (TTL 300 giây, cooldown 30 giây, tối đa 5 lần nhập sai và 5 lượt/giờ/email đích) khi đổi sang email nhận thông báo mới. |
| FR-02 | M01 | Phạm vi cụ thể hóa hoặc mở rộng | Khi nhận yêu cầu được bảo vệ, hệ thống phải kiểm tra vai trò và quyền trên tài nguyên trước xử lý; khi người dùng đăng nhập lại bằng tài khoản có vai trò khác với URL lưu từ phiên trước, giao diện tự điều hướng về trang chủ đúng vai trò thay vì báo lỗi 403, đồng thời giữ nguyên từ chối 403 cho mọi truy cập trực tiếp trái quyền. |
| FR-03 | M02 | Phạm vi cụ thể hóa hoặc mở rộng | Khi quản trị tạo hoặc sửa bác sĩ, hệ thống phải lưu hồ sơ, chuyên khoa và trạng thái nhận lịch. |
| FR-04 | M02 | Phạm vi cụ thể hóa hoặc mở rộng | Khi ngừng hoạt động bác sĩ, hệ thống phải chặn nếu còn lịch tương lai chưa xử lý và giữ các hồ sơ lịch sử. |
| FR-05 | M03 | Đề bài | Khi lưu khoảng làm việc, hệ thống phải kiểm tra start/end, thời lượng khung giờ và tạo danh sách khung giờ trong khoảng. |
| FR-06 | M03 | Đề bài và phạm vi cụ thể hóa | Khi thêm lịch nghỉ, hệ thống phải chặn cập nhật nếu có lịch hẹn còn hiệu lực bị ảnh hưởng. |
| FR-07 | M03 | Đề bài | Khi tìm lịch, hệ thống phải chỉ trả khung giờ còn nhận lịch theo bác sĩ, ngày, chuyên khoa và hình thức khám. |
| FR-08 | M04 | Đề bài | Khi đặt khung giờ còn trống, hệ thống phải tạo lịch CONFIRMED và chống trùng bác sĩ/bệnh nhân trong cùng giao dịch. |
| FR-09 | M04 | Phạm vi cụ thể hóa hoặc mở rộng | Khi đổi lịch CONFIRMED còn ít nhất 2 giờ trước thời điểm bắt đầu, hệ thống phải cập nhật khung giờ trong một giao dịch nguyên tử, giữ lịch cũ nếu khung giờ mới không còn hợp lệ. |
| FR-10 | M04 | Phạm vi cụ thể hóa hoặc mở rộng | Khi hủy lịch CONFIRMED còn ít nhất 2 giờ trước thời điểm bắt đầu, hệ thống phải lưu lý do, chuyển CANCELLED và ngăn thông báo nhắc lịch cũ gửi tiếp. |
| FR-11 | M04 | Phạm vi cụ thể hóa hoặc mở rộng | Khi cập nhật tiến trình, hệ thống phải chỉ chấp nhận chuyển trạng thái và vai trò theo BR-07/08. |
| FR-12 | M05 | Đề bài | Khi bác sĩ có quan hệ điều trị truy cập lịch sử, hệ thống phải trả các bản được phép xem và ghi nhật ký kiểm toán trước phản hồi. |
| FR-13 | M05 | Đề bài | Khi bác sĩ lưu hồ sơ của lần khám, hệ thống phải kiểm tra quyền, phiên bản và giữ bản đã hoàn tất bất biến. |
| FR-14 | M05 | Đề bài | Khi bác sĩ phát hành đơn, hệ thống phải yêu cầu ít nhất một dòng thuốc đủ tên, mô tả liều dùng, đường dùng, tần suất và thời gian dùng. |
| FR-15 | M06 | Đề bài yêu cầu Email/SMS. Phạm vi phiên bản này dùng email. | Khi đến hạn nhắc, hệ thống phải gửi Email cho lịch còn CONFIRMED theo các mốc thời gian trong quy tắc nghiệp vụ. |
| FR-16 | M06 | Cụ thể hóa yêu cầu đề bài | Nếu nhà cung cấp lỗi tạm thời, hệ thống phải thử lại có giới hạn và hiển thị thất bại mà không hoàn tác giao dịch lịch hẹn đã hoàn thành. |
| FR-17 | M07 | Đề bài | Khi đọc/ghi dữ liệu nhạy cảm, đổi quyền, xuất biên bản kiểm toán (`AUDIT_EXPORT`), kiểm chứng toàn vẹn (`AUDIT_INTEGRITY_VERIFIED`) hoặc niêm phong lưu trữ (`AUDIT_ARCHIVE_CREATED`), hệ thống phải ghi nhật ký kiểm toán nối chuỗi băm mật mã `HMAC-SHA256-CHAIN-V1` (`chain_seq`, `prev_hash`, `event_hash`) theo BR-13/16. |
| FR-18 | M07 | Đề bài | Khi người kiểm toán (`AUDITOR`) tra cứu nhật ký kiểm toán, hệ thống phải hỗ trợ lọc server-side theo thời gian/tác nhân/tài nguyên/kết quả/hành động/nhóm/loại tác nhân/`correlationId`/ẩn nhiễu đọc, phân trang con trỏ tránh trôi trang, trả nhãn tác nhân an toàn không lộ email/SĐT/PHI, thống kê tóm tắt, xuất CSV UTF-8 có BOM chống CSV injection (tối đa 5.000 dòng), kiểm chứng toàn vẹn chuỗi băm, quản trị chính sách lưu trữ & niêm phong lô bất biến (`365/1.825` ngày) và cấm sửa/xóa từ ứng dụng. |
| FR-19 | M08 | Phạm vi cụ thể hóa hoặc mở rộng | Khi check-in lịch trực tiếp CONFIRMED, hệ thống phải tạo đúng một phiếu chờ và đổi lịch sang CHECKED_IN trong một giao dịch nguyên tử. |
| FR-20 | M08 | Phạm vi cụ thể hóa hoặc mở rộng | Khi gọi tiếp, hệ thống phải lấy phiếu chờ WAITING đầu hàng của bác sĩ/ngày và chỉ cho một thao tác nhận phiếu chờ đó. |
| FR-21 | M08 | Phạm vi cụ thể hóa hoặc mở rộng | Khi trả phiếu chờ CALLED về hàng chờ, hệ thống phải ghi lý do và đặt cuối hàng mà không tạo phiếu chờ mới. |
| FR-22 | M09 | Phạm vi cụ thể hóa hoặc mở rộng | Khi lịch từ xa còn hiệu lực đến cửa sổ tham gia, hệ thống phải tạo hoặc lấy một phiên riêng gắn lịch. |
| FR-23 | M09 | Phạm vi cụ thể hóa hoặc mở rộng | Khi cấp quyền tham gia, hệ thống phải kiểm tra danh tính, lịch và trạng thái phiên trước cấp token ngắn hạn. |
| FR-24 | M09 | Phạm vi cụ thể hóa hoặc mở rộng | Nếu luồng âm thanh, hình ảnh bị ngắt, hệ thống phải cho phép nối lại phiên còn mở; khi bác sĩ kết thúc phải thu hồi quyền tham gia. |
| FR-25 | M06 | Phạm vi mở rộng | Khi lễ tân báo chậm cho lịch đủ điều kiện, hệ thống phải tạo một tác vụ email trên mỗi phiên bản lịch, kèm giờ dự kiến nếu có. Giờ hẹn và trạng thái được giữ. |
| FR-26 | M04/M06 | Phạm vi mở rộng | Khi người phụ trách ghi nhận vắng hẹn hợp lệ, hệ thống phải lưu lý do nếu được chọn và chỉ gửi email mời đặt lại khi người thao tác yêu cầu. |
| FR-27 | M01/M07 | Phạm vi mở rộng | Khi quản trị tra cứu chính xác theo mã tài khoản (UUID), email hoặc số điện thoại (khớp 100% qua chỉ mục mù HMAC-SHA256, cấm tìm theo tên/gần đúng), hệ thống chỉ trả mã, tên hiển thị và trạng thái (`409` nếu nhiều tài khoản dùng chung SĐT). Khóa hoặc mở khóa cần lý do hợp lệ và phải ghi audit cùng giao dịch. |

## Lượng hóa tham số chức năng chính

Các hàm tính toán chi tiết, miền giá trị và điều kiện biên được đặc tả đầy đủ tại [Công thức và lượng hóa nghiệp vụ](../design/business-formulas-and-quantification.md).

| Nhóm chức năng | Tham số lượng hóa hiện hành | Nguồn mã nguồn |
|---|---|---|
| Mật khẩu & Brute-force (M01) | Tối thiểu 8 ký tự; khóa tạm sau 5 lần sai trong 900 s (`60 s` tăng dần tối đa `900 s`), mở khóa ngay khi đặt lại mật khẩu qua email | `configure-keycloak-registration.py`, `realm-template.json` |
| OTP đổi email liên hệ (M01) | Mã 6 chữ số (`SecureRandom`), TTL `300 s`, cooldown `30 s` theo tác nhân & email đích, tối đa `5` lần nhập sai, tối đa `5 lượt/3600 s`/email đích | `ContactOtpService.java`, `V9__contact_otp.sql` |
| Chuẩn hóa tra cứu liên hệ (M01/M07) | Email $\le 254$ ký tự (chữ thường); SĐT `7–15` chữ số (chuẩn hóa `+84`/`84` $\to$ `0`); blind index HMAC-SHA256 64 ký tự hex | `Access.java`, `Crypto.java` |
| Cửa sổ lịch & slot (M03/M04) | Slot mặc định `20` phút (chia hết khoảng `[start, end)`); đổi/hủy trước $\ge 2$ giờ (`7200 s`); `NO_SHOW` từ `+15` phút (`900 s`); Idempotency TTL `24` giờ (`86400 s`) | `ScheduleService.java`, `AppointmentService.java`, `Idempotency.java` |
| Hàng đợi & Telehealth (M08/M09) | Check-in `[-15 phút, +15 phút)`; mở phòng chờ `[-10 phút, +15 phút)`; token phòng `300 s`; signaling $\le 65536$ ký tự và $\le 300$ tin/người/phòng/phút | `WorkflowService.java`, `TelehealthService.java` |
| Nhắc lịch & thử lại SMTP (M06) | Nhắc trước `30` phút (`1800 s`); thử lại backoff tối đa `3` lần sau `60 s`, `300 s`, `900 s`; lease worker `60 s` | `NotificationStore.java` |
| Kiểm toán, Chuỗi băm & Lưu trữ (M07) | Chuỗi băm `HMAC-SHA256-CHAIN-V1` (`K_audit` tách khóa riêng); xuất CSV tối đa `5.000` dòng/lần kèm BOM & chống formula injection; kiểm chứng tối đa `50.000` bản ghi/lần; lưu trữ nóng `365` ngày / dài hạn `1.825` ngày (`5` năm), cấm `DELETE`/`UPDATE` từ ứng dụng | `Audit.java`, `AuditService.java`, `AuditHashChain.java`, `V12__audit_hardening.sql` |
