# Đặc tả ca sử dụng

Các ca sử dụng mô tả tương tác giữa người dùng, hệ thống và dịch vụ tích hợp. Ngoại trừ đăng nhập, các thao tác được bảo vệ yêu cầu phiên xác thực hợp lệ và quyền phù hợp. Các trường hợp từ chối truy cập được mô tả trong luồng ngoại lệ.

## UC-01 — Đăng nhập

**Yêu cầu liên quan:** FR-01

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Người dùng hệ thống |
| Mục tiêu | Truy cập tài khoản được xác thực |
| Tiền điều kiện | Tài khoản tồn tại và có trạng thái hoạt động. |
| Kích hoạt | Người dùng yêu cầu đăng nhập. |

**Luồng chính**

1. Người dùng lựa chọn chức năng đăng nhập.
2. Dịch vụ danh tính xác thực tài khoản và trả kết quả xác thực.
3. Hệ thống kiểm tra trạng thái tài khoản, xác lập danh tính và quyền truy cập.
4. Hệ thống chuyển người dùng đến giao diện phù hợp.

**Ngoại lệ:** IdP lỗi hoặc tài khoản bị khóa → không tạo phiên; hiển thị lỗi có thể thử lại.

**Hậu điều kiện:** Phiên đăng nhập gắn với đúng danh tính và quyền nội bộ.

## UC-02 — Phân quyền

**Yêu cầu liên quan:** FR-02

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Người dùng hệ thống |
| Mục tiêu | Giới hạn tác vụ theo vai trò |
| Tiền điều kiện | Người dùng yêu cầu truy cập một chức năng hoặc tài nguyên được bảo vệ. |
| Kích hoạt | Hệ thống tiếp nhận yêu cầu truy cập. |

**Luồng chính**

1. Người dùng yêu cầu truy cập chức năng hoặc tài nguyên được bảo vệ.
2. Hệ thống kiểm tra phiên đăng nhập, vai trò và quan hệ với tài nguyên.
3. Hệ thống cho phép thực hiện thao tác khi đáp ứng đầy đủ điều kiện.

**Ngoại lệ:** Thiếu quyền hoặc bệnh nhân truy cập hồ sơ của người khác: từ chối và không trả dữ liệu. Mã truy cập hết hạn: trả 401.

**Hậu điều kiện:** Yêu cầu hợp lệ được xử lý theo đúng phạm vi quyền.

## UC-03 — Danh mục bác sĩ/chuyên khoa

**Yêu cầu liên quan:** FR-03

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Quản trị |
| Mục tiêu | Quản lý danh mục phục vụ tìm lịch |
| Tiền điều kiện | Quản trị có quyền và chuyên khoa tồn tại |
| Kích hoạt | Lưu bác sĩ với thông tin hợp lệ |

**Luồng chính**

1. Quản trị viên nhập hoặc cập nhật thông tin bác sĩ và chuyên khoa.
2. Hệ thống kiểm tra dữ liệu bắt buộc và tính hợp lệ của chuyên khoa.
3. Hệ thống lưu thông tin và cập nhật danh mục bác sĩ.

**Ngoại lệ:** chuyên khoa không tồn tại → từ chối; không lưu tham chiếu sai.

**Hậu điều kiện:** hiển thị bác sĩ ở danh mục đúng chuyên khoa.

## UC-04 — Ngừng nhận lịch

**Yêu cầu liên quan:** FR-04

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Quản trị |
| Mục tiêu | Ngừng lịch mới mà giữ lịch sử khám |
| Tiền điều kiện | Bác sĩ không có lịch tương lai còn hiệu lực |
| Kích hoạt | Quản trị ngừng nhận lịch |

**Luồng chính**

1. Quản trị viên lựa chọn bác sĩ cần ngừng tiếp nhận lịch.
2. Hệ thống kiểm tra các lịch hẹn tương lai còn hiệu lực.
3. Nếu không có lịch cần xử lý, hệ thống vô hiệu hóa việc nhận lịch mới và bảo toàn lịch sử khám.

**Ngoại lệ:** bác sĩ còn lịch tương lai → trả xung đột và giữ trạng thái hiện tại.

**Hậu điều kiện:** bác sĩ không xuất hiện trong kết quả có thể đặt.

## UC-05 — Lịch làm việc

**Yêu cầu liên quan:** FR-05

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Bác sĩ |
| Mục tiêu | Công bố thời gian nhận khám |
| Tiền điều kiện | Bác sĩ có quyền sửa lịch của mình |
| Kích hoạt | Bác sĩ yêu cầu lưu lịch làm việc. |

**Luồng chính**

1. Bác sĩ xác định khoảng làm việc, hình thức khám và thời lượng mỗi khung giờ.
2. Hệ thống kiểm tra thời gian bắt đầu, kết thúc và thời lượng.
3. Hệ thống lưu lịch làm việc và tạo các khung giờ không chồng lấn.

**Ngoại lệ:** end không lớn hơn start hoặc thời lượng không dương → từ chối dữ liệu.

**Hậu điều kiện:** Các khung giờ được tạo đúng khoảng làm việc và thời lượng.

## UC-06 — Lịch nghỉ

**Yêu cầu liên quan:** FR-06

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Bác sĩ |
| Mục tiêu | Chặn nhận lịch khi nghỉ |
| Tiền điều kiện | Khoảng nghỉ không có lịch hẹn |
| Kích hoạt | Lưu khoảng nghỉ |

**Luồng chính**

1. Bác sĩ nhập khoảng thời gian nghỉ.
2. Hệ thống kiểm tra các lịch hẹn chịu ảnh hưởng.
3. Nếu không có xung đột, hệ thống ghi nhận lịch nghỉ và ngừng cung cấp các khung giờ tương ứng.

**Ngoại lệ:** đã có lịch hẹn trong khoảng → trả xung đột; không tự động hủy lịch hẹn.

**Hậu điều kiện:** khung giờ trong khoảng không còn được đặt.

## UC-07 — Tìm lịch trống

**Yêu cầu liên quan:** FR-07

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Bệnh nhân |
| Mục tiêu | Chọn giờ khám phù hợp |
| Tiền điều kiện | Thông tin bác sĩ và lịch làm việc đã được thiết lập. |
| Kích hoạt | Lọc lịch theo ngày |

**Luồng chính**

1. Bệnh nhân lựa chọn chuyên khoa, bác sĩ, ngày và hình thức khám.
2. Hệ thống đối chiếu lịch làm việc, lịch nghỉ và các lịch hẹn đã có.
3. Hệ thống trả về các khung giờ còn khả dụng kèm thông tin múi giờ.

**Ngoại lệ:** không có khung giờ phù hợp → trả danh sách rỗng có hướng dẫn đổi bộ lọc.

**Hậu điều kiện:** chỉ nhận các khung giờ hợp lệ và múi giờ hiển thị rõ.

## UC-08 — Đặt lịch

**Yêu cầu liên quan:** FR-08

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Bệnh nhân |
| Mục tiêu | Có một lịch khám xác nhận |
| Tiền điều kiện | Bệnh nhân đã đăng nhập và lựa chọn một khung giờ nhận khám trong tương lai. |
| Kích hoạt | Bệnh nhân xác nhận đặt lịch. |

**Luồng chính**

1. Bệnh nhân chọn khung giờ và xác nhận đặt lịch.
2. Hệ thống kiểm tra quyền, thời gian, lịch làm việc và xung đột của bác sĩ, bệnh nhân.
3. Hệ thống tạo lịch CONFIRMED, ghi nhật ký và tác vụ thông báo trong cùng giao dịch.
4. Sau khi giao dịch thành công, hệ thống trả xác nhận đặt lịch và xử lý thông báo.

**Ngoại lệ:** Khung giờ không còn khả dụng hoặc trùng lịch bác sĩ/bệnh nhân: trả 409, không tạo lịch. Khi nhiều yêu cầu cùng tranh chấp một khung giờ, chỉ một yêu cầu được ghi nhận.

**Hậu điều kiện:** Một lịch hẹn CONFIRMED được tạo cho bệnh nhân.

## UC-09 — Đổi lịch

**Yêu cầu liên quan:** FR-09

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Bệnh nhân |
| Mục tiêu | Đổi giờ mà không mất lịch đang có |
| Tiền điều kiện | Lịch CONFIRMED thuộc bệnh nhân, còn ít nhất 2 giờ trước thời điểm bắt đầu và khung giờ mới trống |
| Kích hoạt | Bệnh nhân đổi lịch |

**Luồng chính**

1. Bệnh nhân chọn lịch hiện có và khung giờ thay thế.
2. Hệ thống kiểm tra quyền sở hữu, trạng thái, giới hạn đổi lịch và tính khả dụng của khung giờ mới.
3. Hệ thống cập nhật lịch trong một giao dịch nguyên tử và giải phóng khung giờ cũ.
4. Hệ thống ghi nhận thay đổi và gửi thông báo cập nhật.

**Ngoại lệ:** khung giờ mới vừa bị đặt → trả 409; lịch cũ giữ nguyên.

**Hậu điều kiện:** cập nhật lịch và giải phóng khung giờ cũ sau commit.

## UC-10 — Hủy lịch

**Yêu cầu liên quan:** FR-10

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Bệnh nhân |
| Mục tiêu | Giải phóng lịch không thể tham gia |
| Tiền điều kiện | Lịch còn CONFIRMED thuộc bệnh nhân, còn ít nhất 2 giờ trước thời điểm bắt đầu |
| Kích hoạt | Bệnh nhân xác nhận hủy |

**Luồng chính**

1. Bệnh nhân nhập lý do và xác nhận hủy lịch.
2. Hệ thống kiểm tra quyền sở hữu, trạng thái và giới hạn thời gian hủy.
3. Hệ thống chuyển lịch sang CANCELLED, giải phóng khung giờ và vô hiệu hóa tác vụ nhắc lịch cũ.

**Ngoại lệ:** lịch đã IN_PROGRESS → trả 409; không hủy.

**Hậu điều kiện:** lịch CANCELLED, khung giờ được giải phóng và tác vụ nhắc cũ bị bỏ.

## UC-11 — Vòng đời lịch

**Yêu cầu liên quan:** FR-11

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Bác sĩ |
| Mục tiêu | Theo dõi tiến trình khám chính xác |
| Tiền điều kiện | Lịch trực tiếp CHECKED_IN của bác sĩ |
| Kích hoạt | Bác sĩ bắt đầu khám |

**Luồng chính**

1. Bác sĩ chọn lịch hẹn và thao tác bắt đầu hoặc hoàn tất khám.
2. Hệ thống kiểm tra phân công, trạng thái hiện tại và điều kiện chuyển trạng thái.
3. Hệ thống cập nhật đồng bộ lịch hẹn, lần khám và phiếu chờ hoặc phiên từ xa liên quan.

**Ngoại lệ:** yêu cầu chuyển COMPLETED về CONFIRMED → từ chối thay đổi.

**Hậu điều kiện:** lịch IN_PROGRESS và phiếu chờ IN_SERVICE.

## UC-12 — Lịch sử khám

**Yêu cầu liên quan:** FR-12

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Bác sĩ |
| Mục tiêu | Xem thông tin phục vụ lần khám được phân công |
| Tiền điều kiện | Bác sĩ có quyền với bệnh nhân |
| Kích hoạt | Mở lịch sử khám |

**Luồng chính**

1. Bác sĩ mở lịch sử khám của bệnh nhân được phân công.
2. Hệ thống kiểm tra phạm vi dữ liệu được phép truy cập.
3. Hệ thống ghi nhật ký truy cập trước khi trả dữ liệu.
4. Hệ thống hiển thị các phiên bản hồ sơ phù hợp với quyền của bác sĩ.

**Ngoại lệ:** bác sĩ không được phân công → từ chối; không tiết lộ dữ liệu.

**Hậu điều kiện:** trả dữ liệu được phép và có nhật ký kiểm toán READ.

## UC-13 — Ghi hồ sơ khám

**Yêu cầu liên quan:** FR-13

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Bác sĩ |
| Mục tiêu | Lưu kết quả lần khám |
| Tiền điều kiện | Lần khám IN_PROGRESS của bác sĩ |
| Kích hoạt | Lưu bản nháp rồi hoàn tất hồ sơ |

**Luồng chính**

1. Bác sĩ nhập nội dung lần khám và lựa chọn lưu nháp hoặc hoàn tất hồ sơ.
2. Hệ thống kiểm tra quyền, trạng thái lần khám và phiên bản dữ liệu.
3. Hệ thống lưu nội dung, tác giả, phiên bản và nhật ký thay đổi.
4. Hồ sơ đã hoàn tất được bảo toàn; nội dung sửa đổi được ghi bằng bản bổ sung có lý do.

**Ngoại lệ:** yêu cầu dùng phiên bản cũ → trả 409; giữ bản mới hơn.

**Hậu điều kiện:** lưu phiên bản và tác giả; bản đã hoàn tất không được ghi đè.

## UC-14 — Phát hành đơn thuốc

**Yêu cầu liên quan:** FR-14

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Bác sĩ |
| Mục tiêu | Ghi đơn thuốc để bệnh nhân xem |
| Tiền điều kiện | Đơn bản nháp của lần khám được phân công có đủ dữ liệu |
| Kích hoạt | Bác sĩ phát hành |

**Luồng chính**

1. Bác sĩ lập các dòng thuốc và yêu cầu phát hành đơn.
2. Hệ thống kiểm tra quyền và các trường bắt buộc của từng dòng thuốc.
3. Hệ thống chuyển đơn sang ISSUED, ghi tác giả, thời điểm và nhật ký.
4. Bệnh nhân có thể tra cứu đơn thuốc đã phát hành của mình.

**Ngoại lệ:** đơn rỗng hoặc thiếu trường bắt buộc → trả 422; vẫn DRAFT.

**Hậu điều kiện:** đơn ISSUED có tác giả/thời điểm và bệnh nhân được xem.

## UC-15 — Nhắc lịch

**Yêu cầu liên quan:** FR-15

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Bệnh nhân (người nhận); dịch vụ Email/SMS (tác nhân hỗ trợ) |
| Mục tiêu | Nhận nhắc lịch qua kênh đã chọn |
| Tiền điều kiện | Tác vụ nhắc thuộc phiên bản hiện tại của lịch CONFIRMED |
| Kích hoạt | Đến thời điểm gửi nhắc lịch. |

**Luồng chính**

1. Bộ xử lý nền lấy tác vụ nhắc lịch đến hạn.
2. Hệ thống kiểm tra phiên bản và trạng thái hiện tại của lịch hẹn.
3. Hệ thống gửi thông báo qua kênh đã lựa chọn.
4. Hệ thống ghi nhận kết quả gửi từ dịch vụ tích hợp.

**Ngoại lệ:** lịch đã hủy hoặc đổi phiên bản → bỏ tác vụ; không gửi thông tin cũ.

**Hậu điều kiện:** gửi nội dung tối thiểu và ghi trạng thái gửi.

## UC-16 — Lỗi nhà cung cấp thông báo

**Yêu cầu liên quan:** FR-16

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Dịch vụ Email/SMS; nhân viên điều phối theo dõi kết quả |
| Mục tiêu | Theo dõi thông báo không gửi được |
| Tiền điều kiện | Giao dịch lịch hẹn đã được xác nhận và tác vụ đang PENDING |
| Kích hoạt | Gửi thông báo gặp lỗi tạm thời hoặc quá thời gian phản hồi. |

**Luồng chính**

1. Hệ thống ghi nhận lỗi tạm thời hoặc quá thời gian phản hồi của dịch vụ thông báo.
2. Bộ xử lý nền lập lịch gửi lại theo giới hạn số lần và thời gian chờ.
3. Trước mỗi lần gửi, hệ thống kiểm tra lại tính hợp lệ của lịch hẹn.
4. Người có quyền điều phối theo dõi trạng thái gửi và các trường hợp thất bại.

**Ngoại lệ:** thử lại vượt giới hạn cấu hình → tác vụ FAILED và hiển thị cho người có quyền.

**Hậu điều kiện:** lịch giữ nguyên; tác vụ được xếp thử lại theo chính sách.

## UC-17 — Ghi nhật ký kiểm toán

**Yêu cầu liên quan:** FR-17

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Người dùng thực hiện thao tác cần ghi nhật ký |
| Mục tiêu | Truy vết truy cập hồ sơ |
| Tiền điều kiện | Yêu cầu truy cập hồ sơ hợp lệ |
| Kích hoạt | Phát sinh thao tác đọc, ghi dữ liệu nhạy cảm hoặc thay đổi quyền. |

**Luồng chính**

1. Người dùng thực hiện thao tác đọc, ghi dữ liệu nhạy cảm hoặc thay đổi quyền.
2. Hệ thống xác định tác nhân, thao tác, tài nguyên, thời điểm, kết quả và mã liên kết yêu cầu.
3. Sự kiện được lưu theo nguyên tắc BR-16 trước khi trả dữ liệu nhạy cảm hoặc cùng giao dịch ghi dữ liệu.

**Ngoại lệ:** kho nhật ký kiểm toán không ghi được → không trả dữ liệu nhạy cảm; giao dịch ghi bị rollback.

**Hậu điều kiện:** có actor, action, resource, timestamp, result, correlation ID.

## UC-18 — Tra cứu và bảo vệ nhật ký kiểm toán

**Yêu cầu liên quan:** FR-18

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Kiểm toán viên |
| Mục tiêu | Tra cứu dấu vết mà không làm đổi lịch sử |
| Tiền điều kiện | Kiểm toán viên có quyền đọc audit |
| Kích hoạt | Lọc khoảng ngày và actor |

**Luồng chính**

1. Kiểm toán viên nhập bộ lọc thời gian, tác nhân hoặc tài nguyên.
2. Hệ thống kiểm tra quyền tra cứu nhật ký.
3. Hệ thống trả về các sự kiện phù hợp dưới dạng danh sách có phân trang.

**Ngoại lệ:** tài khoản ứng dụng yêu cầu sửa/xóa nhật ký kiểm toán → từ chối ở lớp dữ liệu.

**Hậu điều kiện:** trả đúng tập bản ghi có phân trang.

## UC-19 — Check-in

**Yêu cầu liên quan:** FR-19

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Lễ tân |
| Mục tiêu | Đưa bệnh nhân đã đến vào hàng chờ |
| Tiền điều kiện | Lịch trực tiếp ở trạng thái CONFIRMED, bệnh nhân đã được xác minh và thời điểm hiện tại nằm trong khoảng cho phép check-in. |
| Kích hoạt | Lễ tân xác nhận bệnh nhân đến khám. |

**Luồng chính**

1. Lễ tân xác minh bệnh nhân và chọn lịch hẹn cần check-in.
2. Hệ thống kiểm tra hình thức khám, trạng thái và khoảng thời gian check-in.
3. Hệ thống tạo một phiếu chờ duy nhất và chuyển lịch sang CHECKED_IN trong cùng giao dịch.
4. Hệ thống hiển thị số thứ tự của bệnh nhân; yêu cầu lặp trả lại phiếu đã có.

**Ngoại lệ:** lịch từ xa hoặc CANCELLED → trả 409; không có ticket.

**Hậu điều kiện:** Lịch chuyển sang CHECKED_IN và có một phiếu chờ duy nhất.

## UC-20 — Gọi bệnh nhân

**Yêu cầu liên quan:** FR-20

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Bác sĩ |
| Mục tiêu | Gọi đúng lượt tiếp theo |
| Tiền điều kiện | Bác sĩ có quyền thao tác với hàng đợi trong ngày của mình. |
| Kích hoạt | Bác sĩ yêu cầu gọi lượt tiếp theo. |

**Luồng chính**

1. Bác sĩ yêu cầu gọi lượt tiếp theo trong hàng đợi của mình.
2. Hệ thống lựa chọn phiếu WAITING đầu tiên theo thứ tự FIFO.
3. Hệ thống cập nhật phiếu sang CALLED bằng thao tác có kiểm soát đồng thời.
4. Hệ thống trả thông tin lượt khám được gọi.

**Ngoại lệ:** hàng không có phiếu chờ WAITING → trả kết quả hết hàng; không tạo thêm phiếu chờ.

**Hậu điều kiện:** Phiếu đầu hàng chuyển sang CALLED; các yêu cầu đồng thời không nhận cùng một phiếu.

## UC-21 — Bỏ lượt và tiếp tục hàng chờ

**Yêu cầu liên quan:** FR-21

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Lễ tân |
| Mục tiêu | Xử lý bệnh nhân chưa sẵn sàng |
| Tiền điều kiện | Phiếu chờ đang CALLED |
| Kích hoạt | Lễ tân bỏ lượt có lý do |

**Luồng chính**

1. Lễ tân lựa chọn phiếu đã gọi và nhập lý do bỏ lượt.
2. Hệ thống kiểm tra trạng thái CALLED.
3. Hệ thống chuyển phiếu về WAITING ở cuối hàng và ghi nhật ký.

**Ngoại lệ:** phiếu chờ đã IN_SERVICE → từ chối bỏ lượt.

**Hậu điều kiện:** phiếu chờ WAITING với thứ tự mới và có audit.

## UC-22 — Chuẩn bị phiên từ xa

**Yêu cầu liên quan:** FR-22

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Bệnh nhân |
| Mục tiêu | Vào đúng phòng khám trực tuyến |
| Tiền điều kiện | Lịch từ xa CONFIRMED thuộc bệnh nhân trong cửa sổ tham gia |
| Kích hoạt | Bệnh nhân mở phòng chờ |

**Luồng chính**

1. Bệnh nhân mở phòng chờ của lịch khám từ xa.
2. Hệ thống kiểm tra quyền sở hữu, trạng thái lịch và khoảng thời gian tham gia.
3. Hệ thống tạo hoặc lấy phiên khám duy nhất của lịch hẹn.
4. Bệnh nhân kiểm tra camera, micro và xác nhận tham gia.

**Ngoại lệ:** lịch trực tiếp hoặc đã hủy → từ chối tạo phòng.

**Hậu điều kiện:** có một session và kiểm tra camera/micro trước khi tham gia.

## UC-23 — Tham gia phiên khám từ xa

**Yêu cầu liên quan:** FR-23

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Bác sĩ |
| Mục tiêu | Tư vấn đúng bệnh nhân trong phiên được phân công |
| Tiền điều kiện | Bác sĩ phụ trách và bệnh nhân đúng lịch trong phòng chờ |
| Kích hoạt | Bác sĩ bắt đầu và hai bên tham gia |

**Luồng chính**

1. Bác sĩ yêu cầu bắt đầu phiên khám được phân công.
2. Hệ thống kiểm tra danh tính hai bên, thời gian và trạng thái phiên.
3. Hệ thống chuyển phiên sang ACTIVE, lịch hẹn sang IN_PROGRESS và tạo Encounter trong cùng giao dịch có audit.
4. Bác sĩ yêu cầu mã tham gia ngắn hạn qua joinSession; hệ thống kiểm tra lại quyền và trạng thái trước khi cấp.

**Ngoại lệ:** người ngoài có session ID → từ chối cấp token và ghi audit.

**Hậu điều kiện:** phiên ACTIVE, lịch IN_PROGRESS.

## UC-24 — Mất kết nối và kết thúc phiên

**Yêu cầu liên quan:** FR-24

| Thuộc tính | Nội dung |
|---|---|
| Tác nhân | Bác sĩ |
| Mục tiêu | Xử lý gián đoạn mà giữ hồ sơ khám |
| Tiền điều kiện | Phiên ACTIVE có hồ sơ bản nháp đã lưu |
| Kích hoạt | Kết nối bị gián đoạn hoặc bác sĩ yêu cầu kết thúc phiên. |

**Luồng chính**

1. Hệ thống phát hiện mất kết nối và hiển thị trạng thái gián đoạn.
2. Người dùng kết nối lại khi phiên còn mở; dữ liệu hồ sơ đã lưu được giữ nguyên.
3. Khi bác sĩ kết thúc, hệ thống chuyển phiên sang ENDED và thu hồi quyền tham gia.
4. Việc hoàn tất hồ sơ và lần khám được xử lý riêng theo điều kiện nghiệp vụ.

**Ngoại lệ:** callback ACTIVE đến sau ENDED → bỏ callback cũ; không mở lại phiên.

**Hậu điều kiện:** Phiên được khôi phục nếu còn mở; khi kết thúc, trạng thái là ENDED và quyền tham gia bị thu hồi. Hồ sơ đã lưu được bảo toàn.

## Điều kiện chi tiết của các luồng liên quan

| Ca sử dụng | Điều kiện và kết quả bổ sung |
|---|---|
| UC-02 | Quản trị quản lý vai trò; kiểm tra quyền tài nguyên là điều kiện chung của các ca sử dụng được bảo vệ |
| UC-11 | Khám trực tiếp bắt đầu từ CHECKED_IN với phiếu CALLED; cùng giao dịch tạo Encounter và chuyển phiếu IN_SERVICE. Hoàn tất yêu cầu hồ sơ FINAL và phiên từ xa ENDED nếu có |
| UC-11, UC-22 | NO_SHOW chỉ áp dụng cho CONFIRMED từ start +15 phút; phiên CREATED/WAITING hiện có chuyển CANCELLED và có tác vụ đóng phòng. Người đã check-in tiếp tục chờ khám |
| UC-12 | Bác sĩ xem lịch sử theo quan hệ điều trị; bệnh nhân chỉ đọc hồ sơ FINAL và đơn ISSUED của chính mình. Mọi lần đọc đều ghi audit trước phản hồi |
| UC-13 | Hoàn tất hồ sơ không tự hoàn tất Encounter. Bổ sung tạo bản FINAL mới, tham chiếu bản FINAL gần nhất và có lý do; bản cũ bất biến |
| UC-19/20/21 | Khóa Doctor tuần tự hóa thay đổi hàng đợi theo bác sĩ/ngày; bỏ lượt chuyển cùng phiếu về cuối hàng, không tạo phiếu mới |
| UC-22/23 | prepareSession trả Session; joinSession trả token sau xác nhận; startSession trả Session đã ACTIVE. Bác sĩ gọi joinSession để lấy token sau khi bắt đầu |
| UC-24 | Nối lại ACTIVE/RECONNECTING không bị giới hạn bởi cửa sổ vào phòng ban đầu. Callback được loại trùng; phiên kết thúc không được mở lại |
| UC-17 | Ghi audit là hành vi nội bộ của các dịch vụ, khác với mục tiêu tra cứu audit của kiểm toán viên ở UC-18 |
