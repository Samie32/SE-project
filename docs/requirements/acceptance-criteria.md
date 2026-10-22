# Tiêu chí chấp nhận (Gherkin)

Các kịch bản Gherkin xác định hành vi mong đợi của hệ thống. Dữ liệu sử dụng là dữ liệu mô phỏng; điều kiện xác thực và phân quyền được nêu theo từng tình huống.

## AC-01 — Đăng nhập

Truy vết: US-01, FR-01, TC-01.

```gherkin
Scenario: Đăng nhập - tình huống chính
  Given IdP xác thực đúng người dùng đang đang hoạt động
  When người dùng hoàn tất đăng nhập
  Then tạo phiên đúng danh tính và quyền

Scenario: Đăng nhập - ngoại lệ
  Given IdP lỗi hoặc tài khoản bị khóa
  When người dùng hoặc hệ thống thực hiện tác vụ đăng nhập
  Then không tạo phiên; hiển thị lỗi có thể thử lại
```

## AC-02 — Phân quyền

Truy vết: US-02, FR-02, TC-02.

```gherkin
Scenario: Phân quyền - tình huống chính
  Given bệnh nhân A có phiên hợp lệ
  When A yêu cầu hồ sơ của B
  Then từ chối và không trả nội dung hồ sơ

Scenario: Phân quyền - ngoại lệ
  Given token hết hạn
  When người dùng hoặc hệ thống thực hiện tác vụ phân quyền
  Then trả 401; không thực hiện tác vụ
```

## AC-03 — Danh mục bác sĩ/chuyên khoa

Truy vết: US-03, FR-03, TC-03.

```gherkin
Scenario: Danh mục bác sĩ/chuyên khoa - tình huống chính
  Given quản trị có quyền và chuyên khoa tồn tại
  When lưu bác sĩ với thông tin hợp lệ
  Then hiển thị bác sĩ ở danh mục đúng chuyên khoa

Scenario: Danh mục bác sĩ/chuyên khoa - ngoại lệ
  Given chuyên khoa không tồn tại
  When người dùng hoặc hệ thống thực hiện tác vụ danh mục bác sĩ/chuyên khoa
  Then từ chối; không lưu tham chiếu sai
```

## AC-04 — Ngừng nhận lịch

Truy vết: US-04, FR-04, TC-04.

```gherkin
Scenario: Ngừng nhận lịch - tình huống chính
  Given bác sĩ không có lịch tương lai còn hiệu lực
  When quản trị ngừng nhận lịch
  Then bác sĩ không xuất hiện trong kết quả có thể đặt

Scenario: Ngừng nhận lịch - ngoại lệ
  Given bác sĩ còn lịch tương lai
  When người dùng hoặc hệ thống thực hiện tác vụ ngừng nhận lịch
  Then trả xung đột và giữ trạng thái hiện tại
```

## AC-05 — Lịch làm việc

Truy vết: US-05, FR-05, TC-05.

```gherkin
Scenario: Lịch làm việc - tình huống chính
  Given bác sĩ có quyền sửa lịch của mình
  When lưu 09:00–10:00 với khung giờ 20 phút
  Then có 3 khung giờ không chồng lấn

Scenario: Lịch làm việc - ngoại lệ
  Given end không lớn hơn start hoặc thời lượng không dương
  When người dùng hoặc hệ thống thực hiện tác vụ lịch làm việc
  Then từ chối dữ liệu
```

## AC-06 — Lịch nghỉ

Truy vết: US-06, FR-06, TC-06.

```gherkin
Scenario: Lịch nghỉ - tình huống chính
  Given khoảng nghỉ không có lịch hẹn
  When lưu khoảng nghỉ
  Then khung giờ trong khoảng không còn được đặt

Scenario: Lịch nghỉ - ngoại lệ
  Given đã có lịch hẹn trong khoảng
  When người dùng hoặc hệ thống thực hiện tác vụ lịch nghỉ
  Then trả xung đột; không tự động hủy lịch hẹn
```

## AC-07 — Tìm lịch trống

Truy vết: US-07, FR-07, TC-07.

```gherkin
Scenario: Tìm lịch trống - tình huống chính
  Given có khung giờ trống và khung giờ đã đặt
  When lọc lịch theo ngày
  Then chỉ nhận các khung giờ hợp lệ và múi giờ hiển thị rõ

Scenario: Tìm lịch trống - ngoại lệ
  Given không có khung giờ phù hợp
  When người dùng hoặc hệ thống thực hiện tác vụ tìm lịch trống
  Then trả danh sách rỗng có hướng dẫn đổi bộ lọc
```

## AC-08 — Đặt lịch

Truy vết: US-08, FR-08, TC-08.

```gherkin
Scenario: Đặt lịch - tình huống chính
  Given hai bệnh nhân chọn cùng khung giờ trống
  When hai yêu cầu đặt lịch chạy đồng thời
  Then chỉ một yêu cầu thành công; yêu cầu còn lại nhận mã lỗi 409

Scenario: Đặt lịch - ngoại lệ
  Given cùng bệnh nhân đặt khung giờ khác nhưng trùng giờ
  When người dùng hoặc hệ thống thực hiện tác vụ đặt lịch
  Then từ chối; không tạo lịch thứ hai
```

## AC-09 — Đổi lịch

Truy vết: US-09, FR-09, TC-09.

```gherkin
Scenario: Đổi lịch - tình huống chính
  Given lịch CONFIRMED thuộc bệnh nhân, còn ít nhất 2 giờ trước thời điểm bắt đầu và khung giờ mới trống
  When bệnh nhân đổi lịch
  Then cập nhật lịch và giải phóng khung giờ cũ sau khi giao dịch được xác nhận

Scenario: Đổi lịch - ngoại lệ
  Given khung giờ mới vừa bị đặt
  When người dùng hoặc hệ thống thực hiện tác vụ đổi lịch
  Then trả 409; lịch cũ giữ nguyên
```

## AC-10 — Hủy lịch

Truy vết: US-10, FR-10, TC-10.

```gherkin
Scenario: Hủy lịch - tình huống chính
  Given lịch còn CONFIRMED thuộc bệnh nhân, còn ít nhất 2 giờ trước thời điểm bắt đầu
  When bệnh nhân xác nhận hủy
  Then lịch CANCELLED, khung giờ được giải phóng và tác vụ nhắc cũ bị bỏ

Scenario: Hủy lịch - ngoại lệ
  Given lịch đã IN_PROGRESS
  When người dùng hoặc hệ thống thực hiện tác vụ hủy lịch
  Then trả 409; không hủy
```

## AC-11 — Vòng đời lịch

Truy vết: US-11, FR-11, TC-11.

```gherkin
Scenario: Vòng đời lịch - tình huống chính
  Given lịch trực tiếp CHECKED_IN của bác sĩ
  When bác sĩ bắt đầu khám
  Then lịch IN_PROGRESS và phiếu chờ IN_SERVICE

Scenario: Vòng đời lịch - ngoại lệ
  Given yêu cầu chuyển COMPLETED về CONFIRMED
  When người dùng hoặc hệ thống thực hiện tác vụ vòng đời lịch
  Then từ chối thay đổi
```

## AC-12 — Lịch sử khám

Truy vết: US-12, FR-12, TC-12.

```gherkin
Scenario: Lịch sử khám - tình huống chính
  Given bác sĩ có quyền với bệnh nhân
  When mở lịch sử khám
  Then trả dữ liệu được phép và có nhật ký kiểm toán READ

Scenario: Lịch sử khám - ngoại lệ
  Given bác sĩ không được phân công
  When người dùng hoặc hệ thống thực hiện tác vụ lịch sử khám
  Then từ chối; không tiết lộ dữ liệu
```

## AC-13 — Ghi hồ sơ khám

Truy vết: US-13, FR-13, TC-13.

```gherkin
Scenario: Ghi hồ sơ khám - tình huống chính
  Given lần khám IN_PROGRESS của bác sĩ
  When lưu bản nháp rồi hoàn tất hồ sơ
  Then lưu phiên bản và tác giả; bản đã hoàn tất không được ghi đè

Scenario: Ghi hồ sơ khám - ngoại lệ
  Given yêu cầu dùng phiên bản cũ
  When người dùng hoặc hệ thống thực hiện tác vụ ghi hồ sơ khám
  Then trả 409; giữ bản mới hơn
```

## AC-14 — Phát hành đơn thuốc

Truy vết: US-14, FR-14, TC-14.

```gherkin
Scenario: Phát hành đơn thuốc - tình huống chính
  Given đơn bản nháp của lần khám được phân công có đủ dữ liệu
  When bác sĩ phát hành
  Then đơn ISSUED có tác giả/thời điểm và bệnh nhân được xem

Scenario: Phát hành đơn thuốc - ngoại lệ
  Given đơn rỗng hoặc thiếu trường bắt buộc
  When người dùng hoặc hệ thống thực hiện tác vụ phát hành đơn thuốc
  Then trả 422; vẫn DRAFT
```

## AC-15 — Nhắc lịch

Truy vết: US-15, FR-15, TC-15.

```gherkin
Scenario: Nhắc lịch - tình huống chính
  Given tác vụ nhắc thuộc phiên bản hiện tại của lịch CONFIRMED
  When bộ xử lý nền xử lý tác vụ
  Then gửi nội dung tối thiểu và ghi trạng thái gửi

Scenario: Nhắc lịch - ngoại lệ
  Given lịch đã hủy hoặc đổi phiên bản
  When người dùng hoặc hệ thống thực hiện tác vụ nhắc lịch
  Then bỏ tác vụ; không gửi thông tin cũ
```

## AC-16 — Lỗi nhà cung cấp thông báo

Truy vết: US-16, FR-16, TC-16.

```gherkin
Scenario: Lỗi nhà cung cấp thông báo - tình huống chính
  Given giao dịch lịch hẹn đã được xác nhận và tác vụ đang PENDING
  When nhà cung cấp dịch vụ timeout
  Then lịch giữ nguyên; tác vụ được xếp thử lại theo chính sách

Scenario: Lỗi nhà cung cấp thông báo - ngoại lệ
  Given thử lại vượt giới hạn cấu hình
  When người dùng hoặc hệ thống thực hiện tác vụ lỗi nhà cung cấp thông báo
  Then tác vụ FAILED và hiển thị cho người có quyền
```

## AC-17 — Audit

Truy vết: US-17, FR-17, TC-17.

```gherkin
Scenario: Audit - tình huống chính
  Given yêu cầu truy cập hồ sơ hợp lệ
  When yêu cầu được xử lý
  Then có actor, action, resource, timestamp, result, correlation ID

Scenario: Audit - ngoại lệ
  Given kho nhật ký kiểm toán không ghi được
  When người dùng hoặc hệ thống thực hiện tác vụ nhật ký kiểm toán
  Then không trả dữ liệu nhạy cảm; giao dịch ghi bị hoàn tác
```

## AC-18 — Bảo vệ nhật ký kiểm toán

Truy vết: US-18, FR-18, TC-18.

```gherkin
Scenario: Bảo vệ nhật ký kiểm toán - tình huống chính
  Given kiểm toán viên có quyền đọc nhật ký kiểm toán
  When lọc khoảng ngày và actor
  Then trả đúng tập bản ghi có phân trang

Scenario: Bảo vệ nhật ký kiểm toán - ngoại lệ
  Given tài khoản ứng dụng yêu cầu sửa/xóa nhật ký kiểm toán
  When người dùng hoặc hệ thống thực hiện tác vụ bảo vệ nhật ký kiểm toán
  Then từ chối ở lớp dữ liệu
```

## AC-19 — Check-in

Truy vết: US-19, FR-19, TC-19.

```gherkin
Scenario: Check-in - tình huống chính
  Given lịch trực tiếp hợp lệ và đã xác minh bệnh nhân
  When lễ tân gửi check-in hai lần
  Then trả cùng một phiếu chờ, không tăng số thứ tự lần hai

Scenario: Check-in - ngoại lệ
  Given lịch từ xa hoặc CANCELLED
  When người dùng hoặc hệ thống thực hiện tác vụ check-in
  Then trả 409; không có phiếu chờ
```

## AC-20 — Gọi bệnh nhân

Truy vết: US-20, FR-20, TC-20.

```gherkin
Scenario: Gọi bệnh nhân - tình huống chính
  Given có hai phiếu chờ WAITING cùng hàng
  When hai yêu cầu gọi tiếp chạy đồng thời
  Then không trả cùng một phiếu chờ cho hai lần gọi thành công

Scenario: Gọi bệnh nhân - ngoại lệ
  Given hàng không có phiếu chờ WAITING
  When người dùng hoặc hệ thống thực hiện tác vụ gọi bệnh nhân
  Then trả kết quả hết hàng; không tạo thêm phiếu chờ
```

## AC-21 — Bỏ lượt và tiếp tục hàng chờ

Truy vết: US-21, FR-21, TC-21.

```gherkin
Scenario: Bỏ lượt và tiếp tục hàng chờ - tình huống chính
  Given phiếu chờ đang CALLED
  When lễ tân bỏ lượt có lý do
  Then phiếu chờ WAITING với thứ tự mới và có nhật ký kiểm toán

Scenario: Bỏ lượt và tiếp tục hàng chờ - ngoại lệ
  Given phiếu chờ đã IN_SERVICE
  When người dùng hoặc hệ thống thực hiện tác vụ bỏ lượt và tiếp tục hàng chờ
  Then từ chối bỏ lượt
```

## AC-22 — Chuẩn bị phiên từ xa

Truy vết: US-22, FR-22, TC-22.

```gherkin
Scenario: Chuẩn bị phiên từ xa - tình huống chính
  Given lịch từ xa CONFIRMED thuộc bệnh nhân trong cửa sổ tham gia
  When bệnh nhân mở phòng chờ
  Then có một session và kiểm tra camera/micro trước khi tham gia

Scenario: Chuẩn bị phiên từ xa - ngoại lệ
  Given lịch trực tiếp hoặc đã hủy
  When người dùng hoặc hệ thống thực hiện tác vụ chuẩn bị phiên từ xa
  Then từ chối tạo phòng
```

## AC-23 — Tham gia video/audio

Truy vết: US-23, FR-23, TC-23.

```gherkin
Scenario: Tham gia video/audio - tình huống chính
  Given bác sĩ phụ trách và bệnh nhân đúng lịch trong phòng chờ
  When bác sĩ bắt đầu và hai bên tham gia
  Then phiên ACTIVE, lịch IN_PROGRESS

Scenario: Tham gia video/audio - ngoại lệ
  Given người ngoài có session ID
  When người dùng hoặc hệ thống thực hiện tác vụ tham gia video/audio
  Then từ chối cấp token và ghi nhật ký kiểm toán
```

## AC-24 — Mất kết nối và kết thúc phiên

Truy vết: US-24, FR-24, TC-24.

```gherkin
Scenario: Mất kết nối và kết thúc phiên - tình huống chính
  Given phiên ACTIVE có hồ sơ bản nháp đã lưu
  When mất mạng rồi nối lại trước khi kết thúc
  Then phiên tiếp tục, hồ sơ đã lưu giữ nguyên

Scenario: Mất kết nối và kết thúc phiên - ngoại lệ
  Given callback ACTIVE đến sau ENDED
  When người dùng hoặc hệ thống thực hiện tác vụ mất kết nối và kết thúc phiên
  Then bỏ callback cũ; không mở lại phiên
```

## Tiêu chí biên bổ sung

Các điều kiện biên bổ sung cho các tiêu chí chấp nhận tương ứng:
- AC-09/10: lịch bắt đầu 10:00 được đổi/hủy đến hết 08:00; sau 08:00 trả 409 và giữ lịch.
- AC-19: lịch bắt đầu 10:00 được check-in từ 09:45 đến trước 10:15; ngoài cửa sổ phải từ chối.
- AC-15/16: nhắc lúc 09:30 cho lịch 10:00 nếu đã đặt trước đó; thử lại thêm tối đa 3 lần sau 1, 5 và 15 phút; bỏ tác vụ sai version/trạng thái.
- AC-22/23: phòng chờ mở lúc 09:50 cho lịch 10:00; bác sĩ chỉ bắt đầu từ 10:00 đến trước 10:15; token có hạn 5 phút và không cấp lại khi ENDED.

## Tiêu chí đồng bộ vòng đời

- AC-11-D: bệnh nhân đã CHECKED_IN đúng giờ vẫn được gọi và bắt đầu khám sau start +15 phút; không được ghi NO_SHOW cho lịch này.
- AC-11-E: hoàn tất hồ sơ chỉ tạo FINAL. Lệnh hoàn tất lần khám yêu cầu FINAL và phiên từ xa ENDED nếu có; cập nhật Encounter, lịch và phiếu chờ nguyên tử.
- AC-13-D: bản bổ sung FINAL có lý do, tham chiếu bản FINAL gần nhất; hai yêu cầu bổ sung đồng thời không tạo nhánh từ cùng bản gốc.
- AC-19/21-D: check-in và bỏ lượt đồng thời trong cùng hàng không cấp trùng position; bỏ lượt giữ nguyên ticket ID.
- AC-22-D: khi lịch CONFIRMED được ghi NO_SHOW, phiên CREATED/WAITING chuyển CANCELLED, không cấp token và gửi tác vụ đóng phòng nếu đã có phòng.
- AC-24-D: người tham gia hợp lệ được nối lại ACTIVE/RECONNECTING sau start +15 phút; không cấp token khi ENDED/CANCELLED.
- AC-24-E: lỗi đóng phòng tại nhà cung cấp không làm mất tác vụ thu hồi; hệ thống tiếp tục thử lại và không mở lại phiên.
