# Runbook demo – lập kế hoạch, KHÔNG phải kết quả chạy

## Demo với backend hiện tại (main@b10e096, tuần 3–4)

Ưu tiên luồng này khi demo bản backend đang có. Các luồng B/C và kiểm toán hồ sơ phía dưới là kế hoạch cho giai đoạn sau; chưa có endpoint thực thi.

1. Trong clone có main, chạy môi trường theo [hướng dẫn backend](../test-data/backend/README.md). Xác minh health, `/api/me`, danh mục và seed.
2. Sinh request bằng `python docs/contributions/52400244_NguyenThuong/tools/backend_demo.py`; không cần rebase/import fixtures thiết kế.
3. Chạy `demo.http` từng request. Tạo availability nếu chưa có; xem slot trống; patient đặt lịch; replay cùng khóa/body phải trả lại kết quả cũ; đổi dùng version từ book; hủy dùng version từ đổi.
4. Kiểm danh sách lịch theo patient/doctor/receptionist; admin hoặc receptionist xem notification jobs. Email xác nhận qua Mailpit; chưa demo nhắc lịch -30 phút.
5. Ghi status/body thực tế, SHA, ngày giờ, người chạy. Nếu dừng giữa luồng thì hủy lịch đã tạo bằng ID/version hiện tại. Availability/audit/outbox/lịch đã hủy vẫn được giữ.

HTTP 200 và status/version là kỳ vọng theo controller/service, chưa phải kết quả chạy tại workspace này. Không trình bày fixture clinical hoặc mockup video như chức năng đã hoàn thành.

## BẮT BUỘC TRƯỚC NGÀY DEMO – TRÁNH DÙNG LỊCH QUÁ KHỨ

Fixtures lịch đặt mới ban đầu ngày **10–11/11/2026**. Khi buổi demo diễn ra sau mốc đó, **không được nạp thẳng lịch cũ vào kịch bản đặt lịch**.

Từ thư mục gốc repository `SE-project/`, chạy:

```powershell
python docs/contributions/52400244_NguyenThuong/tools/rebase_demo_dates.py --auto-next-business-day
```

Hoặc chỉ định **ngày tương lai thứ Hai–thứ Sáu**:

```powershell
python docs/contributions/52400244_NguyenThuong/tools/rebase_demo_dates.py --base-date 2026-11-17
```

Đầu ra ở `docs/contributions/52400244_NguyenThuong/test-data/generated/YYYY-MM-DD/`, không ghi đè dữ liệu gốc. **Kiểm tra lại ngày lịch, múi giờ Asia/Ho_Chi_Minh, ngày nghỉ và reset database test trước khi chạy.** Thời gian đặt mới phải trong tương lai, còn check-in / join chỉ được thực hiện trong cửa sổ thời gian cho phép; muốn demo hai chức năng này cần đồng hồ thử nghiệm được nhóm cấu hình hoặc tạo lịch sát giờ hiện tại. **Rebase không tự biến các lịch mới thành lịch đang đủ điều kiện check-in.**

## Điều kiện

- Backend, migration, IdP, frontend và provider mocks phải được các thành viên xác nhận chạy trên môi trường test. Nếu chưa có, **chỉ trình bày mô hình JSON và sơ đồ**.
- Các mốc check-in, mở phòng từ xa phải gần giờ hiện tại trong môi trường test được cấu hình phù hợp; fixtures lịch sử dùng cho **xem hồ sơ**, không để check-in mới.
- Dữ liệu thử là giả lập; không đưa token, bệnh án người thật hoặc mật khẩu lên slide/ảnh.

## Luồng A – xem lịch và đặt lịch

| Bước | Vai trò | Dữ liệu | Kết quả kỳ vọng |
| --- | --- | --- | --- |
| 1 | PAT_A | `AV_A_FUT_S2` | Tra cứu slot trống của DOC_A |
| 2 | PAT_A | `create_booking.json` | Lịch mới CONFIRMED, tránh slot đã đặt S1 |
| 3 | PAT_B | cùng `AV_A_FUT_S2` | Trả xung đột 409 sau khi PAT_A thành công |
| 4 | PAT_A | `change_booking.json` (phiên bản hiện tại) | Đổi sang S3 khi còn >=2h, nếu chưa bị đặt |
| 5 | PAT_A | `cancel_booking.json` | Hủy lịch theo quy tắc nếu còn >=2h |

## Luồng B – hồ sơ và đơn thuốc LỊCH SỬ

1. DOC_A (được phân công) xem lịch APT_A_DONE, Encounter ENC_A_DONE và bản ghi MedicalRecord FINAL giả lập đã được backend mã hóa.
2. Bác sĩ xem đơn `RX_A_ISSUED` đã phát hành; bệnh nhân PAT_A chỉ được xem đơn ISSUED của mình. Dữ liệu đơn chỉ có placeholder không phải khuyến cáo y tế.
3. Với môi trường reset của TC-14, backend tạo Encounter IN_PROGRESS hợp lệ và thực hiện `create_prescription.json`, tiếp đến `issue_prescription.json`. Kiểm tra trường hợp `create_prescription_empty.json` không được phát hành; `create_prescription_missing_field.json` bị từ chối theo schema/validation.

## Luồng C – khám từ xa

1. Dùng AV_A_REMOTE_FUT_S1 tạo lịch từ xa phù hợp (ngày/giờ demo phải thay nếu đã qua).
2. Bệnh nhân vào phòng chờ trong [-10,+15) phút; bác sĩ bắt đầu không sớm hơn giờ khám.
3. Mô phỏng mất kết nối, nối lại trong phiên ACTIVE/RECONNECTING; kết thúc phiên không tự hoàn tất lần khám.
4. Xác nhận không cấp token sau ENDED, chỉ kết thúc Encounter khi hồ sơ đã FINAL và phiên ENDED.

## Bằng chứng cần thu

- [ ] Build SHA, ngày giờ, URL môi trường test, người chạy.
- [ ] Request/response đã được xóa token/PHI; nguồn fixture commit tương ứng.
- [ ] Video/ảnh **ứng dụng chạy thật**, không lấy mockup làm bằng chứng code.
- [ ] Kết quả `PASS/FAIL/BLOCKED/NOT RUN`, liên kết test report/bug/PR theo TC.
- [ ] Tách rõ kiểm tra tĩnh fixtures với API integration thực tế.

## Luồng kiểm toán bổ sung – TC-12 / TC-17

1. Dùng `AUD_READ_A` trong `audit-events.json` để đối chiếu các trường `actor_id`, `action=READ_MEDICAL_RECORD`, `resource_id`, `timestamp`, `result` và `correlation_id`.
2. Khi backend đã triển khai, bác sĩ được phân công mở hồ sơ hợp lệ. Chỉ ghi PASS nếu audit được **lưu thành công trước khi dữ liệu nhạy cảm được trả về**.
3. Mock kho audit ghi thất bại và xác minh backend trả lỗi dịch vụ, không lộ hồ sơ (BR-16); kết quả phải ghi trong báo cáo QA, không thể suy ra từ fixture JSON.
4. Kiểm tra tài khoản không được phân công không đọc được hồ sơ (AC-12). Nếu chính sách triển khai có ghi nhận cả truy cập bị từ chối thì đối chiếu thêm bản ghi lỗi; đặc tả không bắt buộc tạo sẵn audit DENIED trong fixture.

## Tra cứu ví dụ API chính xác

- `test-data/scenarios/api-catalog.json`: danh sách **tất cả** operationId; tham số path/query/header bắt buộc và body hợp lệ.
- `test-data/scenarios/api-no-body.http`: các thao tác GET hoặc POST **không có request body** (check-in, queue/next, prepareSession).
- `test-data/api-examples/*.json`: JSON request body, **không** phải response API. Những file `*_missing_field.json` là negative sample.
