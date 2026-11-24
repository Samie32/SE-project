# Quy tắc nghiệp vụ

Các quy tắc xác định điều kiện xử lý và ràng buộc nghiệp vụ theo phạm vi chức năng của đồ án.

| Mã | Quy tắc | Phân hệ |
|---|---|---|
| BR-01 | Xác thực không thay thế phân quyền. Mỗi yêu cầu phải kiểm tra vai trò và quan hệ với tài nguyên | M01/M07 |
| BR-02 | Dùng khoảng [start,end), start < end; các khoảng liền kề không trùng. Lưu thời điểm DATETIME(6) theo UTC; UI chuyển đổi và hiển thị giờ Asia/Ho_Chi_Minh | M03/M04 |
| BR-03 | Một bác sĩ và một bệnh nhân không có hai lịch còn hiệu lực trùng thời gian. Giao dịch có khóa và kiểm tra xung đột bảo đảm tính nhất quán khi có nhiều yêu cầu đồng thời | M04 |
| BR-04 | Đặt/đổi lịch phải tái kiểm tra lịch trống trong giao dịch; đổi thất bại giữ nguyên lịch cũ | M03/M04 |
| BR-05 | Không ngừng hoạt động bác sĩ hay tạo lịch nghỉ làm vô hiệu lịch đang có; phải xử lý xung đột trước | M02/M03 |
| BR-06 | Check-in chỉ cho lịch trực tiếp CONFIRMED; tối đa một phiếu chờ cho mỗi lịch hẹn; gọi FIFO trong phạm vi bác sĩ/ngày | M08 |
| BR-07 | Lịch trực tiếp CONFIRMED → CHECKED_IN → IN_PROGRESS → COMPLETED. Lịch từ xa CONFIRMED → IN_PROGRESS → COMPLETED | M04 |
| BR-08 | Chỉ CONFIRMED và còn ít nhất 2 giờ trước thời điểm bắt đầu được đổi/hủy; CONFIRMED → NO_SHOW từ 15 phút sau thời điểm bắt đầu, do lễ tân (trực tiếp) hoặc bác sĩ (từ xa) ghi nhận. COMPLETED/CANCELLED/NO_SHOW là trạng thái kết thúc | M04 |
| BR-09 | Chỉ bác sĩ phụ trách được ghi/phát hành hồ sơ; bản đã hoàn tất không được ghi đè. Bản bổ sung tham chiếu phiên bản cũ và lý do | M05 |
| BR-10 | Mỗi lịch hẹn tương ứng với tối đa một lần khám; đơn thuốc có ít nhất một dòng trước phát hành; không tự động đề xuất thuốc hoặc liều dùng | M05 |
| BR-11 | Gửi thông báo sau khi giao dịch được xác nhận; lỗi gửi không hoàn tác lịch. Trước gửi thông báo nhắc lịch phải kiểm tra phiên bản/trạng thái hiện tại để bỏ tác vụ cũ | M06 |
| BR-12 | Không đưa chẩn đoán, nội dung đơn thuốc, token phòng hoặc token đăng nhập vào Email hay log kỹ thuật | M06/M07 |
| BR-13 | Sự kiện kiểm toán gồm tác nhân (kèm nhãn an toàn không lộ email/SĐT/PHI), thao tác, mã tài nguyên, thời điểm (micro giây UTC), kết quả, mã liên kết yêu cầu và liên kết chuỗi băm mật mã (`chain_seq`, `prev_hash`, `event_hash` bằng `HMAC-SHA256-CHAIN-V1`); không lưu toàn bộ bệnh án hay token trong log. | M07 |
| BR-14 | Chỉ bệnh nhân của lịch và bác sĩ được phân công được vào phiên từ xa đang hợp lệ; mã truy cập có thời hạn ngắn, gắn với phiên khám và người tham gia | M09 |
| BR-15 | Mất luồng âm thanh, hình ảnh không tự hoàn tất khám. Kết thúc phiên và hoàn tất lần khám là hai hành động riêng, có kiểm tra quyền/trạng thái | M09/M05 |
| BR-16 | Nhật ký của thao tác ghi được lưu trong cùng giao dịch dữ liệu. Đối với thao tác đọc dữ liệu nhạy cảm, nhật ký phải được lưu thành công trước khi trả dữ liệu; lỗi ghi nhật ký được phản hồi bằng lỗi dịch vụ | M07 |
| BR-17 | Báo chậm giữ giờ hẹn chính thức và chỉ gửi cho lịch đủ điều kiện còn chờ. Mỗi phiên bản có tối đa một tác vụ. Khi gửi, bỏ tác vụ đã lỗi thời hoặc lịch không còn đủ điều kiện. | M06 |
| BR-18 | Giữ quyền và mốc ghi nhận vắng theo BR-08. Lý do dùng mã định sẵn, có trường hợp chưa rõ. Email mời đặt lại là tùy chọn. Vắng hẹn giữ nguyên quyền truy cập tài khoản. | M04/M06 |
| BR-19 | Chỉ quản trị được tra cứu chính xác tài khoản bệnh nhân theo mã UUID, email hoặc số điện thoại (qua chỉ mục mù HMAC-SHA256, không tìm theo tên hay chuỗi gần đúng) và khóa/mở tài khoản. Nếu nhiều tài khoản gia đình dùng chung một SĐT, trả 409 yêu cầu nhập mã UUID. Màn hình mặc định trống; phản hồi tối thiểu gồm mã, tên hiển thị và trạng thái. Thao tác giữ lịch sử nghiệp vụ, yêu cầu lý do và ghi audit. Backend chặn tài khoản bị khóa ngay cả khi token đang dùng còn hạn. | M01/M07 |

## Đồng bộ vòng đời

Phiếu chờ chuyển theo các trạng thái WAITING → CALLED → IN_SERVICE → DONE; CALLED → WAITING khi bỏ lượt có lý do và vị trí mới cuối hàng. Bắt đầu IN_SERVICE đồng thời chuyển lịch hẹn sang IN_PROGRESS, kết thúc khám chuyển lịch hẹn sang COMPLETED và phiếu chờ sang DONE.
Phiên khám từ xa chuyển theo các trạng thái CREATED → WAITING → ACTIVE → ENDED; CREATED/WAITING → CANCELLED khi lịch được ghi nhận NO_SHOW. Hủy lịch chỉ được thực hiện trước thời điểm bắt đầu ít nhất 2 giờ, khi phiên chưa được tạo. ACTIVE → RECONNECTING → ACTIVE hoặc ENDED do bác sĩ quyết định. Callback đến trễ không được mở lại phiên đã ENDED.

## Tham số nghiệp vụ và giới hạn xử lý

- Một phòng khám, múi giờ Asia/Ho_Chi_Minh. Giờ hoạt động mặc định là 08:00–17:00 từ thứ Hai đến thứ Bảy. Quản trị có thể đặt một khoảng mở cửa trong ngày hoặc đánh dấu nghỉ cho từng thứ, đồng thời cấu hình ngày nghỉ lễ hoặc khung giờ đặc biệt theo khoảng ngày (quy tắc ngày lễ ưu tiên trên giờ hoạt động hằng tuần và không được chồng ngày lễ khác). Ca làm việc và thời gian nghỉ mới của bác sĩ phải nằm trong giờ hoạt động hiệu lực của ngày đó. Hệ thống từ chối thay đổi giờ hoạt động hoặc ngày nghỉ lễ nếu có ca đang diễn ra hoặc sắp tới bị xung đột. Mỗi lượt khám mặc định 20 phút và có thể cấu hình số phút nguyên dương.
- Bệnh nhân có tài khoản, chỉ đặt cho mình. Chỉ tiếp nhận lịch hẹn có thời điểm bắt đầu trong tương lai.
- Đổi/hủy khi còn ít nhất 2 giờ trước thời điểm bắt đầu và trạng thái CONFIRMED. Không có ngoại lệ đổi/hủy sau hạn trong phạm vi đồ án.
- Check-in từ 15 phút trước thời điểm bắt đầu đến trước 15 phút sau thời điểm bắt đầu. Từ start +15 phút không nhận check-in mới hoặc bắt đầu phiên từ xa mới; lễ tân/bác sĩ chỉ đánh dấu NO_SHOW khi lịch còn CONFIRMED. Bệnh nhân đã check-in đúng giờ được tiếp tục chờ và bắt đầu khám trực tiếp sau mốc này.
- FIFO theo bác sĩ và ngày, thứ tự theo thời điểm check-in; không hỗ trợ tiếp nhận không có lịch hẹn hoặc ưu tiên cấp cứu. Bỏ lượt đưa phiếu chờ về cuối hàng.
- Bác sĩ có lịch được phân công ở CONFIRMED, CHECKED_IN hoặc IN_PROGRESS được đọc các hồ sơ FINAL trước đó của bệnh nhân; chỉ sửa hồ sơ của lần khám mình phụ trách. Sau COMPLETED chỉ đọc lại lần khám mình thực hiện và lập bản bổ sung có lý do.
- Giữ dữ liệu bệnh án và nhật ký kiểm toán theo chính sách chỉ ghi nối tiếp (`APPEND_ONLY_NO_APP_DELETE`), lưu trữ trực tuyến `365` ngày và mục tiêu lưu trữ dài hạn `1.825` ngày (`5` năm); kiểm toán viên có thể niêm phong lô lưu trữ bất biến (`audit_archive_batch` có trigger cấm sửa/xóa và mã băm `batch_hash`) và xuất biên bản CSV kiểm toán tối đa `5.000` dòng/lần (không chứa nội dung bệnh án hay token); không có chức năng xóa vĩnh viễn bệnh án hoặc xuất nội dung hồ sơ bệnh án hàng loạt. Dữ liệu được sử dụng là dữ liệu mô phỏng.
- Gửi xác nhận sau đặt/đổi/hủy. Nhắc trước thời điểm bắt đầu 30 phút; nếu đặt khi còn ít hơn 30 phút thì chỉ gửi xác nhận. Bỏ thông báo nhắc lịch nếu lịch đổi phiên bản hoặc không còn CONFIRMED.
- Khi nhà cung cấp dịch vụ lỗi tạm thời, thử lại thêm tối đa 3 lần sau 1, 5 và 15 phút; mỗi lần kiểm tra lại lịch. Khi hết số lần cho phép, tác vụ chuyển sang FAILED.
- Mở phòng chờ từ 10 phút trước thời điểm bắt đầu đến trước thời điểm bắt đầu +15 phút. Bác sĩ bắt đầu không sớm hơn thời điểm bắt đầu. Phiên ACTIVE được tiếp tục đến khi bác sĩ kết thúc; mất mạng không tự hoàn tất khám.
- Token tham gia phòng hết hạn sau 5 phút; muốn cấp lại phải kiểm tra quyền và trạng thái. Kết thúc phiên thu hồi quyền vào phòng. Không ghi âm/ghi hình; bệnh nhân xác nhận tham gia trước khi cấp token.
- Khi kết nối hình ảnh gặp lỗi, hai bên có thể chuyển sang âm thanh trong cùng phiên; nếu không tiếp tục được, bác sĩ ghi nhận lý do trong hồ sơ và bệnh nhân đặt lịch mới.
- Bản ghi chống xử lý lặp được lưu trong 24 giờ (`86.400 s`). Đăng nhập dùng OAuth2/OIDC Authorization Code + PKCE S256; access token giữ trong bộ nhớ client, hết hạn thì đăng nhập lại. Khi vừa hoàn tất đăng nhập với tài khoản mới mà URL đích của phiên trước vượt quyền vai trò hiện tại, frontend chuyển về trang chủ của vai trò mới thay vì dừng ở trang 403.
- Chính sách xác thực Keycloak: mật khẩu tối thiểu 8 ký tự; bật `registrationAllowed`, `loginWithEmailAllowed` và đăng nhập/đăng ký nhanh Google OAuth2 (`trustEmail: true`); hỗ trợ quên mật khẩu qua email khi có SMTP với thông báo trung tính không tiết lộ sự tồn tại tài khoản; bật khóa tạm thời (`permanentLockout: false`) sau 5 lần nhập sai trong 15 phút (`900 s`), thời gian khóa tăng từ `60 s` tới tối đa `900 s` và tự mở khóa khi đặt lại mật khẩu qua email.
- Dữ liệu liên hệ (`email`, `phone`) và thông tin cá nhân bổ sung (`hometown`, `permanentAddress`) được mã hóa AES-256-GCM; `email` và `phone` băm chỉ mục mù bằng khóa HMAC-SHA256 dẫn xuất riêng (`cliniccare:blind-index:v1`), chủ tài khoản được giải mã xem trong `/api/me/profile`. Khi đổi sang email nhận thông báo mới, phải xác thực OTP 6 chữ số (TTL `300 s`, cooldown `30 s` theo tác nhân và theo email đích, tối đa `5` lần nhập sai và `5 lượt/3600 s`/email đích); cập nhật chỉ số điện thoại không cần OTP. Cho phép nhiều tài khoản dùng chung SĐT; SĐT hợp lệ chỉ nhận **số di động Việt Nam 10 chữ số** (`03/05/07/08/09` + 8 số sau chuẩn hóa `+84`/`84` $\to$ `0`). Thông tin cá nhân (`birthDate`, `hometown`, `permanentAddress`) nhập lúc đăng ký được đồng bộ về tài khoản; bổ sung trường còn trống không bị giới hạn, nhưng thay đổi thông tin nhân thân đã điền bị giới hạn **1 lần mỗi 90 ngày**.
- Gateway HTTPS (Caddy) và Nginx frontend áp dụng header bảo mật: HSTS `max-age=31536000; includeSubDomains` (HTTPS), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin`, `Permissions-Policy: camera=(self), microphone=(self)` và `Content-Security-Policy` có `frame-ancestors 'none'`, `object-src 'none'`. Xem chi tiết biểu thức tại [công thức và lượng hóa nghiệp vụ](../design/business-formulas-and-quantification.md).

## Điều kiện đồng bộ và xử lý đồng thời

- Bắt đầu khám trực tiếp yêu cầu lịch CHECKED_IN và phiếu CALLED; cập nhật phiếu IN_SERVICE, lịch IN_PROGRESS và tạo Encounter trong cùng giao dịch.
- Bắt đầu khám từ xa yêu cầu phiên WAITING, bệnh nhân đã được cấp quyền vào phòng và bác sĩ được phân công; cập nhật phiên ACTIVE, lịch IN_PROGRESS và tạo Encounter trong cùng giao dịch.
- Hoàn tất hồ sơ chuyển bản ghi sang FINAL, chưa tự động hoàn tất lần khám. Bác sĩ yêu cầu hoàn tất lần khám riêng; hệ thống yêu cầu hồ sơ FINAL và, đối với khám từ xa, phiên ENDED. Encounter và lịch hẹn chuyển COMPLETED, phiếu chờ chuyển DONE trong cùng giao dịch.
- Bản bổ sung được tạo thành bản FINAL mới, có lý do và tham chiếu bản FINAL gần nhất. Không sửa bản gốc hoặc tạo nhiều nhánh bổ sung từ cùng một bản. Khóa Encounter bảo vệ việc cấp phiên bản và kiểm tra bản mới nhất.
- Mọi thao tác thay đổi hàng đợi khóa bản ghi Doctor trước khi đọc và cập nhật hàng của bác sĩ/ngày. Check-in và bỏ lượt cấp vị trí bằng MAX(position) + 1 trong phạm vi này, giữ các phiếu cũ để không tái sử dụng số thứ tự.
- Phiên ACTIVE/RECONNECTING được cấp lại token cho đúng người tham gia kể cả sau cửa sổ vào phòng ban đầu. Khi ENDED/CANCELLED, hệ thống ngừng cấp token và lưu tác vụ đóng phòng bền vững; lỗi nhà cung cấp được thử lại và theo dõi đến khi xác nhận đóng phòng.
- Sự kiện callback được xác minh chữ ký, loại trùng theo nhà cung cấp/event ID và kiểm tra chuyển trạng thái trong cùng giao dịch với audit. Callback không mở lại phiên kết thúc.
- Audit do người dùng thực hiện có actor_id; audit của tác vụ nền dùng actor_type SYSTEM và actor_label xác định dịch vụ, không gán giả một tài khoản người dùng.
