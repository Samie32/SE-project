# Danh mục ca kiểm thử

Trạng thái: **Chưa thực thi**. Mỗi ca kiểm thử gồm tình huống A và tình huống B, tương ứng với các điều kiện và kết quả mong đợi trong tiêu chí chấp nhận.

| ID | Tiền điều kiện và thao tác A | Kết quả mong đợi A | Tình huống B và kết quả mong đợi | Loại |
|---|---|---|---|---|
| TC-01 | IdP xác thực đúng người dùng đang đang hoạt động; người dùng hoàn tất đăng nhập | tạo phiên đúng danh tính và quyền | IdP lỗi hoặc tài khoản bị khóa → không tạo phiên; hiển thị lỗi có thể thử lại | Chức năng / Tích hợp |
| TC-02 | bệnh nhân A có phiên hợp lệ; A yêu cầu hồ sơ của B | từ chối và không trả nội dung hồ sơ | token hết hạn → trả 401; không thực hiện tác vụ | Bảo mật / Tích hợp |
| TC-03 | quản trị có quyền và chuyên khoa tồn tại; lưu bác sĩ với thông tin hợp lệ | hiển thị bác sĩ ở danh mục đúng chuyên khoa | chuyên khoa không tồn tại → từ chối; không lưu tham chiếu sai | Chức năng / Tích hợp |
| TC-04 | bác sĩ không có lịch tương lai còn hiệu lực; quản trị ngừng nhận lịch | bác sĩ không xuất hiện trong kết quả có thể đặt | bác sĩ còn lịch tương lai → trả xung đột và giữ trạng thái hiện tại | Chức năng / Tích hợp |
| TC-05 | bác sĩ có quyền sửa lịch của mình; lưu 09:00–10:00 với khung giờ 20 phút | có 3 khung giờ không chồng lấn | end không lớn hơn start hoặc thời lượng không dương → từ chối dữ liệu | Chức năng / Tích hợp |
| TC-06 | khoảng nghỉ không có lịch hẹn; lưu khoảng nghỉ | khung giờ trong khoảng không còn được đặt | đã có lịch hẹn trong khoảng → trả xung đột; không tự động hủy lịch hẹn | Chức năng / Tích hợp |
| TC-07 | có khung giờ trống và khung giờ đã đặt; lọc lịch theo ngày | chỉ nhận các khung giờ hợp lệ và múi giờ hiển thị rõ | không có khung giờ phù hợp → trả danh sách rỗng có hướng dẫn đổi bộ lọc | Chức năng / Tích hợp |
| TC-08 | hai bệnh nhân chọn cùng khung giờ trống; hai yêu cầu đặt lịch chạy đồng thời | chỉ một yêu cầu thành công; yêu cầu còn lại nhận mã lỗi 409 | cùng bệnh nhân đặt khung giờ khác nhưng trùng giờ → từ chối; không tạo lịch thứ hai | Tích hợp / Đồng thời |
| TC-09 | lịch CONFIRMED thuộc bệnh nhân, còn ít nhất 2 giờ trước thời điểm bắt đầu và khung giờ mới trống; bệnh nhân đổi lịch | cập nhật lịch và giải phóng khung giờ cũ sau khi giao dịch được xác nhận | khung giờ mới vừa bị đặt → trả 409; lịch cũ giữ nguyên | Tích hợp / Đồng thời |
| TC-10 | lịch còn CONFIRMED thuộc bệnh nhân, còn ít nhất 2 giờ trước thời điểm bắt đầu; bệnh nhân xác nhận hủy | lịch CANCELLED, khung giờ được giải phóng và tác vụ nhắc cũ bị bỏ | lịch đã IN_PROGRESS → trả 409; không hủy | Chức năng / Tích hợp |
| TC-11 | lịch trực tiếp CHECKED_IN của bác sĩ; bác sĩ bắt đầu khám | lịch IN_PROGRESS và phiếu chờ IN_SERVICE | yêu cầu chuyển COMPLETED về CONFIRMED → từ chối thay đổi | Chức năng / Tích hợp |
| TC-12 | bác sĩ có quyền với bệnh nhân; mở lịch sử khám | trả dữ liệu được phép và có nhật ký kiểm toán READ | bác sĩ không được phân công → từ chối; không tiết lộ dữ liệu | Bảo mật / Tích hợp |
| TC-13 | lần khám IN_PROGRESS của bác sĩ; lưu bản nháp rồi hoàn tất hồ sơ | lưu phiên bản và tác giả; bản đã hoàn tất không được ghi đè | yêu cầu dùng phiên bản cũ → trả 409; giữ bản mới hơn | Chức năng / Tích hợp |
| TC-14 | đơn bản nháp của lần khám được phân công có đủ dữ liệu; bác sĩ phát hành | đơn ISSUED có tác giả/thời điểm và bệnh nhân được xem | đơn rỗng hoặc thiếu trường bắt buộc → trả 422; vẫn DRAFT | Chức năng / Tích hợp |
| TC-15 | tác vụ nhắc thuộc phiên bản hiện tại của lịch CONFIRMED; bộ xử lý nền xử lý tác vụ | gửi nội dung tối thiểu và ghi trạng thái gửi | lịch đã hủy hoặc đổi phiên bản → bỏ tác vụ; không gửi thông tin cũ | Chức năng / Tích hợp |
| TC-16 | giao dịch lịch hẹn đã được xác nhận và tác vụ đang PENDING; nhà cung cấp dịch vụ timeout | lịch giữ nguyên; tác vụ được xếp thử lại theo chính sách | thử lại vượt giới hạn cấu hình → tác vụ FAILED và hiển thị cho người có quyền | Chức năng / Tích hợp |
| TC-17 | yêu cầu truy cập hồ sơ hợp lệ; yêu cầu được xử lý | có actor, action, resource, timestamp, result, correlation ID | kho nhật ký kiểm toán không ghi được → không trả dữ liệu nhạy cảm; giao dịch ghi bị hoàn tác | Bảo mật / Tích hợp |
| TC-18 | kiểm toán viên có quyền đọc nhật ký kiểm toán; lọc khoảng ngày và actor | trả đúng tập bản ghi có phân trang | tài khoản ứng dụng yêu cầu sửa/xóa nhật ký kiểm toán → từ chối ở lớp dữ liệu | Bảo mật / Tích hợp |
| TC-19 | lịch trực tiếp hợp lệ và đã xác minh bệnh nhân; lễ tân gửi check-in hai lần | trả cùng một phiếu chờ, không tăng số thứ tự lần hai | lịch từ xa hoặc CANCELLED → trả 409; không có phiếu chờ | Tích hợp / Đồng thời |
| TC-20 | có hai phiếu chờ WAITING cùng hàng; hai yêu cầu gọi tiếp chạy đồng thời | không trả cùng một phiếu chờ cho hai lần gọi thành công | hàng không có phiếu chờ WAITING → trả kết quả hết hàng; không tạo thêm phiếu chờ | Tích hợp / Đồng thời |
| TC-21 | phiếu chờ đang CALLED; lễ tân bỏ lượt có lý do | phiếu chờ WAITING với thứ tự mới và có nhật ký kiểm toán | phiếu chờ đã IN_SERVICE → từ chối bỏ lượt | Chức năng / Tích hợp |
| TC-22 | lịch từ xa CONFIRMED thuộc bệnh nhân trong cửa sổ tham gia; bệnh nhân mở phòng chờ | có một session và kiểm tra camera/micro trước khi tham gia | lịch trực tiếp hoặc đã hủy → từ chối tạo phòng | Chức năng / Tích hợp |
| TC-23 | bác sĩ phụ trách và bệnh nhân đúng lịch trong phòng chờ; bác sĩ bắt đầu và hai bên tham gia | phiên ACTIVE, lịch IN_PROGRESS | người ngoài có session ID → từ chối cấp token và ghi nhật ký kiểm toán | Bảo mật / Tích hợp |
| TC-24 | phiên ACTIVE có hồ sơ bản nháp đã lưu; mất mạng rồi nối lại trước khi kết thúc | phiên tiếp tục, hồ sơ đã lưu giữ nguyên | callback ACTIVE đến sau ENDED → bỏ callback cũ; không mở lại phiên | Chức năng / Tích hợp |

## Kiểm thử các thuộc tính chất lượng

TC-N01: đo tải theo NFR-01; ghi nhận p50, p95 và tỷ lệ lỗi.
TC-N02: chạy ma trận vai trò × chủ sở hữu/khác chủ sở hữu/không quan hệ, với token hết hạn và sai audience.
TC-N03: sao lưu và phục hồi dữ liệu trình diễn, kiểm tra số bản ghi, nội dung mẫu và khóa ngoại.
TC-N04: nhật ký kiểm toán storage fault injection, kiểm tra không trả hồ sơ khi thiếu nhật ký kiểm toán và không log PHI/token.
TC-N05: đánh giá giao diện với 5 người dùng; ghi nhận tỷ lệ hoàn thành, thời gian và lỗi thao tác.
TC-N06: mất mạng video, callback trùng/đảo thứ tự, token phòng hết hạn, kết thúc khi client ngắt.
TC-N07: đối chiếu cấu hình mã hóa, phân quyền khóa và backup; kiểm tra truy cập trái quyền bị chặn.
TC-N08: ngắt DB/provider; kiểm tra báo lỗi rõ và không xác nhận giao dịch chưa commit.
TC-N09: kiểm tra OpenAPI/sơ đồ UML/stack và báo cáo coverage package sau triển khai; xác định rõ các thành phần được loại trừ.
TC-N10: kiểm tra dữ liệu trình diễn giả và không có nội dung hồ sơ/token trong SMS, Email hoặc log kỹ thuật.

## Kiểm thử giá trị biên

- TC-09/10-C: đổi/hủy đúng start -2 giờ được xử lý; sau mốc đó 1 giây trả 409 và giữ lịch.
- TC-19-C: thử check-in trước thời điểm bắt đầu -15 phút, đúng start -15 phút và đúng start +15 phút; chỉ trường hợp giữa hợp lệ.
- TC-15/16-C: kiểm tra nhắc trước 30 phút, bỏ tác vụ cũ và thử lại thêm tối đa 3 lần.
- TC-22/23-C: kiểm tra cửa sổ phòng chờ, thời gian bắt đầu, token hết 5 phút và cấp lại sau ENDED.

- TC-08-D: hai bệnh nhân đặt cùng khung giờ khi chưa có lịch nào; trên MySQL chỉ một yêu cầu thành công.
- TC-08-E: một bệnh nhân đồng thời đặt hai bác sĩ trong hai khoảng thời gian giao nhau; chỉ một lịch được tạo.
- TC-06/08-F: thêm lịch nghỉ đồng thời với đặt lịch của cùng bác sĩ; giao dịch thực hiện sau phải kiểm tra lại kết quả giao dịch trước và từ chối nếu xung đột.
- TC-N03-B: lưu một thời điểm UTC bằng DATETIME(6), đọc lại và chuyển sang Asia/Ho_Chi_Minh; thời điểm và ngày phục vụ phải nhất quán.

## Kiểm thử đồng bộ mô hình

Các ca dưới đây chưa thực thi, dùng để kiểm chứng thiết kế đã bổ sung.

| ID | Tình huống | Kết quả mong đợi |
|---|---|---|
| TC-11-D | Gọi và bắt đầu khám cho bệnh nhân check-in đúng giờ nhưng đã qua start +15 phút | Được bắt đầu từ phiếu CALLED; không cho chuyển CHECKED_IN thành NO_SHOW |
| TC-11-E | Hoàn tất hồ sơ; sau đó yêu cầu hoàn tất lần khám từ xa khi phiên còn ACTIVE | Hồ sơ FINAL, lịch vẫn IN_PROGRESS; từ chối hoàn tất lần khám đến khi phiên ENDED |
| TC-11-F | Gây lỗi audit khi bắt đầu/kết thúc khám | Không cập nhật một phần Encounter, Appointment, QueueTicket hoặc TelehealthSession |
| TC-13-D | Hai yêu cầu bổ sung đồng thời cùng bản FINAL | Một bản kế tiếp được tạo; yêu cầu còn lại xung đột; bản gốc không đổi |
| TC-19/21-D | Check-in nhiều bệnh nhân đồng thời với bỏ lượt trong cùng hàng | position duy nhất, phiếu bỏ lượt ở vị trí cuối theo thứ tự giao dịch |
| TC-22-D | Chuẩn bị phòng trễ đồng thời với ghi NO_SHOW | Không cấp token; phiên CANCELLED; phòng đã tạo được đưa vào tác vụ đóng |
| TC-24-D | Nối lại ACTIVE/RECONNECTING sau start +15 phút | Đúng người được cấp lại token; ENDED/CANCELLED bị từ chối |
| TC-24-E | Nhà cung cấp lỗi khi đóng phòng | Tác vụ thu hồi vẫn tồn tại, được thử lại; không cấp token mới; không báo nhà cung cấp đã đóng khi chưa có xác nhận |
| TC-24-F | Callback trùng hoặc ACTIVE sau trạng thái kết thúc | Chỉ xử lý event ID một lần; không mở lại phiên |
| TC-08/09/10-G | Gửi lại cùng idempotency key hoặc đổi payload với cùng key | Cùng yêu cầu trả kết quả cũ; payload khác trả 409; không lặp tác dụng phụ |
