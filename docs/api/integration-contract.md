# Hợp đồng tích hợp BE–FE 1.0.0

Chốt ngày **16/11/2026** theo yêu cầu thống nhất BE với frontend gộp. Baseline backend: `main` tại `a04dcb1`. Phạm vi: chín phân hệ, **46 thao tác trên 38 đường dẫn**. Hợp đồng này là chuẩn để triển khai tiếp, không phải biên bản nghiệm thu.

## 1. Nguồn chuẩn và quy tắc thay đổi

1. [openapi.yaml](openapi.yaml): hợp đồng chuẩn 1.0.0, có kiểu request/response, header, quyền và truy vết FR.
2. Tài liệu này: ngữ nghĩa giao dịch, vòng đời và cách FE sử dụng API.
3. [integration-backlog.md](integration-backlog.md): chênh lệch baseline phải sửa và tiêu chí bàn giao.
4. [openapi.json](openapi.json): snapshot sinh từ `/v3/api-docs`, mô tả baseline; không ghi đè YAML bằng snapshot này vì các response Object/Map chưa đủ schema.
5. [archive/openapi-design-0.1.yaml](archive/openapi-design-0.1.yaml): thiết kế cũ 30 thao tác, giữ để đối chiếu fixture lịch sử; không dùng để viết adapter mới.

Khi thay tên trường, endpoint, mã thành công hoặc điều kiện quyền: sửa YAML, ví dụ, kiểm tra contract và backlog cùng một thay đổi. Thay đổi phá tương thích sau 1.0.0 cần phiên bản major mới hoặc kế hoạch chuyển đổi rõ ràng; không để BE và FE tự đổi độc lập. `x-implementation-gaps` trong YAML trỏ đến việc chưa đạt, không được xem như đã chạy thành công.

## 2. Kết nối và xác thực

| Mục | Giá trị chốt |
|---|---|
| API local | `http://localhost:8080/api`; FE gọi đường dẫn tương đối `/api/...` qua proxy |
| FE local | `http://localhost:5173`; một ứng dụng gộp trên cổng này |
| OIDC authority | `http://localhost:8180/realms/clinic` |
| Client public | `clinic-web`, Authorization Code + PKCE S256 |
| Callback / logout | `http://localhost:5173/callback`; trở về `/login` trên cùng origin |
| JWT | `Authorization: Bearer <access_token>`, audience `clinic-api`; token giữ trong bộ nhớ |
| Vai trò | `PATIENT`, `DOCTOR`, `RECEPTIONIST`, `ADMINISTRATOR`, `AUDITOR`; lấy từ database qua `/me`, không lấy quyền từ localStorage/JWT claim để tự cấp quyền |
| Danh tính nghiệp vụ | Dùng **GET `/me/profile`** lấy `patientId`, `doctorId`, `displayName`, `roles`; không dò bác sĩ bằng thử quyền từng lịch |

`id` trong `/me` là user ID nội bộ. Không giả định nó luôn bằng patient ID hoặc doctor ID. `/users` chỉ dành quản trị để tìm tài khoản tạo bác sĩ/cấp quyền. Quản trị không mặc nhiên được đọc bệnh án hoặc vào phòng từ xa. HTTPS là yêu cầu triển khai ngoài local; HTTP ở bảng trên chỉ dùng phát triển.

## 3. Dữ liệu, danh sách và lỗi

- JSON camelCase; ID tài nguyên UUID; `version` là số nguyên không âm. Các enum phân biệt chữ hoa/thường.
- Thời điểm ISO-8601 UTC có `Z`; ngày query `YYYY-MM-DD` theo `Asia/Ho_Chi_Minh`. Lưu khoảng `[startAt,endAt)`; UI chuyển giờ Việt Nam khi hiển thị.
- `mode`: chỉ `IN_PERSON` hoặc `REMOTE`; không dùng `ONLINE`, `OFFLINE` hay `VIRTUAL`.
- Tên chuẩn: **`createdAt`**, **`consent`**, **`targetStatus`**, **`doseText`**, **`durationText`**. Không có alias `timestamp`, `participationConfirmed`, `status` cho progress hoặc `dosage`.
- Danh sách trả **mảng trực tiếp**, không có `{data,total}`. `/appointments`, `/users`, lịch sử record/rx và audit dùng `limit=20&offset=0`, tối đa 100; FE đọc tiếp nếu cần. Không suy tổng số từ một trang.
- Ngoại lệ: `/notification-jobs` trả tối đa 100 job mới nhất, không phân trang; availability/time-off trả tối đa 500; queue trả hàng bác sĩ/ngày; signals trả tối đa 100 message theo cursor. Danh mục/slots không nhận limit/offset trong phiên bản này.
- GET `/doctors` trả một dòng cho mỗi chuyên khoa (`DoctorRow`); FE nhóm theo `id`. Response POST/PUT bác sĩ là `DoctorView` với `userId`, không có tên/chuyên khoa; tải lại danh mục sau ghi.
- Trường BOOLEAN đọc từ JDBC có thể là boolean hoặc số 0/1 (`DbBoolean`); FE chuẩn hóa `true/1` thành true, `false/0` thành false. Không dùng `Boolean("0")`.
- Body request đúng schema; các trường nghiệp vụ không rỗng/không chỉ chứa khoảng trắng. FE không phụ thuộc trường ngoài schema trong response.

| HTTP | Cách FE xử lý |
|---|---|
| 200 | Thành công; đa số trả JSON. Riêng PUT `/me/contact`, `/users/{id}/roles` body rỗng, không gọi `response.json()` vô điều kiện |
| 204 | Không body: DELETE lịch; queue/next khi hết người WAITING **sau BE-04** |
| 400 | Thiếu/sai query/header/body; kiểm tra payload trước khi gửi lại |
| 401 | Token không hợp lệ/hết hạn; đăng nhập lại; không giả định có JSON error body |
| 403 | Thiếu quyền hoặc token phòng không hợp lệ; không tự động coi là hết hạn OIDC |
| 404 | Không có hoặc không được phép biết tài nguyên; GET encounter record chưa tạo cũng trả 404 |
| 409 | Sai version, trạng thái, cửa sổ thời gian, trùng lịch hoặc key trùng khác payload; tải lại dữ liệu trước thao tác mới |
| 422 | Điều kiện nghiệp vụ không hợp lệ |
| 429 | Vượt giới hạn signaling; giảm tốc độ gửi |
| 503 / lỗi mạng | Kết quả có thể chưa xác định; retry lệnh có idempotency bằng **cùng key và payload** |

Lỗi ứng dụng dùng `application/problem+json`: `type`, `title`, `status`, có thể có `detail`, `instance`. Không có hợp đồng `code/message/correlationId` trong body. Mã đối chiếu audit lấy từ header **`X-Request-Id`**; baseline có thể thiếu header/body trên lỗi từ security filter. UI dùng thông báo tiếng Việt theo status, không dùng chuỗi `detail` làm mã nghiệp vụ ổn định và không đưa token/PHI ra log.

## 4. Ghi dữ liệu, version và retry

Các thao tác **bắt buộc `Idempotency-Key`**:

- POST đặt, đổi, hủy lịch; check-in; progress.
- POST queue/next, queue-ticket/skip.
- PUT encounter record; POST amendment.
- POST tạo đơn, PUT sửa đơn, POST phát hành đơn.
- POST prepare, start, end telehealth.

Key 1–128 ký tự, thuộc `[A-Za-z0-9._:-]`, khuyến nghị UUID. Phạm vi lưu 24 giờ theo **tác nhân + thao tác/tài nguyên + key**. Cùng payload và key trả kết quả đã lưu; cùng key đổi payload trả 409. Response replay là snapshot cũ: tải lại detail nếu cần trạng thái hiện tại.

FE giữ key cho cùng lần submit khi retry sau timeout/5xx; đổi payload hoặc bắt đầu thao tác mới sinh key mới. Mở rộng cả `api.post` lẫn `api.put` nhận key. Không dùng retry tự động cho mọi mutation: join cấp lại token và thu hồi token cũ của chính người dùng; POST signals có thể tạo message mới.

`version` gửi theo **đúng tài nguyên** đang sửa: appointment cho progress/đổi/hủy; ticket cho skip; record cho save/amend; prescription cho update/issue; session cho start/end/connection. Thiếu trả 400, cũ trả 409. Record lần đầu dùng version 0; response đầu có version 1. Các tài nguyên khác thường bắt đầu 0: luôn dùng response thực tế, không tự cộng cứng.

Tạo/sửa danh mục, lịch làm/nghỉ, contact và role không dùng key trong hợp đồng này. Join/connection/signals không dùng key; connection/signals cần thêm `X-Room-Token` bên cạnh JWT.

## 5. Đặt lịch, hàng đợi và tiến trình trực tiếp

1. GET `/slots?date=...&doctorId=...&specialtyId=...&mode=...`; chỉ `date` bắt buộc. POST `/appointments` với `{slotId}`; patient được xác định từ danh tính, không gửi patientId để đặt thay.
2. Đổi/hủy chỉ CONFIRMED, còn ít nhất 2 giờ. Đổi gửi `{slotId,version}`; hủy gửi `{reason,version}`. Xung đột phải giữ lịch cũ.
3. GET `/appointments` trả `AppointmentView`, **không cam kết encounterId**. Mở trang khám bằng GET **`/appointments/{id}`** lấy `AppointmentDetail` và encounterId. Sau progress phải dùng response detail hoặc tải lại detail; không chỉ reload danh sách.
4. RECEPTIONIST POST `/appointments/{id}/check-in`, không body, có key; chỉ IN_PERSON CONFIRMED trong `[start-15 phút,start+15 phút)`. Trả `QueueTicket`, không phải appointment; tải lại detail để lấy version mới.
5. GET **`/doctors/{id}/queue?date=YYYY-MM-DD`**: DOCTOR sở hữu/RECEPTIONIST; trả mọi trạng thái, FE tự lọc. **Không có GET `/queue-tickets`** và không có endpoint patient đọc hàng riêng trong bản này. Ticket có `createdAt`, `queueDate`, `version`; `patientId` có trong danh sách nhưng không bắt buộc ở response check-in/next/skip.
6. POST `/doctors/{id}/queue/next?date=...`, không body, có key: 200 với ticket CALLED; 409 nếu đang có CALLED/IN_SERVICE; **204 nếu không có WAITING**. Baseline đang trả 404 cho hết hàng; **BE-04 phải sửa trước khi FE dựa vào 204**. Không nuốt mọi 404 thành “hết hàng”.
7. Skip gửi `{reason,version}` tới `/queue-tickets/{id}/skip` có key; giữ ticket ID, chuyển WAITING cuối hàng. DOCTOR sở hữu hoặc RECEPTIONIST được thực hiện.
8. Bác sĩ POST progress `{targetStatus:"IN_PROGRESS",version}` có key; cần CHECKED_IN và ticket CALLED. Tạo encounter, chuyển lịch IN_PROGRESS và ticket IN_SERVICE nguyên tử. Đã check-in đúng giờ vẫn được bắt đầu khám sau start+15 phút.
9. Hoàn tất: lưu record FINAL trước; progress `{targetStatus:"COMPLETED",version}` cập nhật encounter, appointment, queue nguyên tử. FINAL không tự hoàn tất ca.
10. NO_SHOW chỉ CONFIRMED từ start+15 phút: RECEPTIONIST cho trực tiếp, DOCTOR phụ trách cho từ xa; không dùng NO_SHOW cho người đã check-in.

## 6. Bệnh án và đơn thuốc

**Bản hiện tại và lịch sử là hai truy vấn khác nhau:**

| Nhu cầu | API |
|---|---|
| Mở lại DRAFT/FINAL của ca đang khám | GET `/encounters/{encounterId}/record` |
| Mở các đơn DRAFT/ISSUED của ca hiện tại | GET `/encounters/{encounterId}/prescriptions` |
| Lịch sử bệnh án FINAL | GET `/patients/{patientId}/records?limit=...&offset=...` |
| Lịch sử đơn ISSUED | GET `/patients/{patientId}/prescriptions?limit=...&offset=...` |

Patient chỉ đọc FINAL/ISSUED của mình. DOCTOR phụ trách đọc draft của encounter; bác sĩ có quan hệ điều trị đọc lịch sử được phép theo BR-09. Không mở rộng history để trả draft cho bệnh nhân hoặc bác sĩ khác.

- Save PUT record: `{version,content,status:"DRAFT"|"FINAL"}` + key; `content` là chuỗi opaque, tối đa 100.000 ký tự. FE có thể serialize JSON có version định dạng riêng, vẫn cần hiển thị được bản plain text; không yêu cầu BE parse chẩn đoán.
- GET record chưa có trả 404; với bác sĩ đúng encounter, UI có thể mở form mới version 0. Lưu nháp xong phải tải lại record/version từ endpoint encounter; refresh trang phải phục hồi đúng bản nháp.
- FINAL không ghi đè/xóa. POST `/records/{id}/amendments` với `{version,content,reason}` + key tạo FINAL kế tiếp tham chiếu bản mới nhất; không cho hai nhánh từ cùng bản gốc.
- Tạo đơn POST `/encounters/{id}/prescriptions` với `{items}` + key. Đã có DRAFT thì **PUT `/prescriptions/{id}` với `{version,items}` + key**, không POST lại mỗi lần lưu.
- Mỗi item đủ `medicineName`, `doseText`, `route`, `frequency`, `durationText`; mỗi chuỗi tối đa 1.000 ký tự. Draft được phép items rỗng; issue POST `/prescriptions/{id}/issue` với `{version}` + key yêu cầu ít nhất một item đủ thông tin. ISSUED không sửa/xóa.
- Có thể có nhiều đơn trong một encounter; UI không giả định chỉ có một đơn duy nhất. Không tự đề xuất thuốc hoặc liều dùng.

## 7. Audit và thông báo

- GET `/audit-events` chỉ AUDITOR; filter `from` inclusive, `to` exclusive, `actorId`, `resourceId`, limit/offset. Lọc đến hết một ngày dùng `to` bằng 00:00 ngày kế tiếp theo giờ Việt Nam rồi đổi UTC; không dùng 23:59 làm mất dữ liệu cuối ngày.
- Audit dùng **createdAt**; `actorType=SYSTEM` có `actorId=null`, `actorLabel` chỉ dịch vụ. Không có PHI/token trong audit.
- Ghi audit nghiệp vụ cùng transaction; đọc dữ liệu nhạy cảm chỉ trả khi audit lưu được. Theo AC-23 phải lưu sự kiện DENIED khi người ngoài bị chặn vào phòng, không bị mất vì rollback; **BE-01 còn phải triển khai**.
- Notification-jobs cho lễ tân/quản trị, status `PENDING/PROCESSING/SENT/SKIPPED/FAILED`; eventType `BOOKED/RESCHEDULED/CANCELLED/REMINDER`. `attempts` là số lần gửi thất bại, không phải tổng lượt gửi. SENT là SMTP chấp nhận, không xác nhận người nhận đã đọc.
- Nhắc trước 30 phút; lịch đặt dưới 30 phút chỉ có xác nhận; retry thêm 1/5/15 phút, bỏ tác vụ sai version/trạng thái. Email local dùng Mailpit; chưa nghiệm thu SMS thật.

## 8. Telehealth và WebRTC

1. POST `/appointments/{id}/telehealth-session`, không body, có key, tạo/lấy phòng hợp lệ từ start-10 phút đến trước start+15 phút. Gọi một lần khi vào trang; giữ session ID.
2. Poll **GET `/telehealth-sessions/{id}`** để đọc trạng thái, kể cả ENDED/CANCELLED; không dùng POST prepare làm poll vì prepare từ chối phòng đã đóng.
3. Join POST `{consent:true}` cho patient, không key; bác sĩ có thể gửi false sau start. Response có `sessionId,token,expiresAt,signalingUrl`. Không dùng `participationConfirmed`.
4. Patient join CREATED → WAITING. Bác sĩ start với `{version}` + key từ start đến trước start+15 phút; WAITING → ACTIVE, lịch → IN_PROGRESS và tạo encounter nguyên tử. Sau start bác sĩ join để lấy token của mình.
5. `signalingUrl` đã gồm `/api/...`; không nối thành `/api/api/...`. GET/POST signals gửi JWT + **X-Room-Token**. GET `?after=0` trả message bên kia; lần sau dùng ID cuối nhận. POST `{kind:"OFFER"|"ANSWER"|"ICE",payload:"..."}` trả `{accepted:true}`. Payload ≤65.536 ký tự; ≤300 message/người/phòng/phút.
6. FE triển khai `RTCPeerConnection`, OFFER/ANSWER/ICE, remote tracks và STUN/TURN phù hợp. getUserMedia chỉ là xem thiết bị cục bộ, không phải cuộc gọi.
7. Token phòng hết hạn 5 phút. Join lại cấp token mới và thu hồi token cũ của chính người đó. ACTIVE/RECONNECTING được join lại sau cửa sổ ban đầu; cần cập nhật token trong bộ nhớ và tránh join trùng do effect/poll.
8. Mất mạng: POST connection `{version,state:"RECONNECTING"}` với JWT + room token; nối lại gửi ACTIVE với version mới. Không tự hoàn tất bệnh án/ca khám. Trong WAITING, patient có thể join lại để lấy token mới nếu vẫn trong cửa sổ.
9. Bác sĩ end `{version}` + key chuyển ENDED, thu hồi token/message trong giao dịch. Cả hai client quan sát trạng thái rồi đóng peer connection, stop tracks, xóa token. NO_SHOW chuyển phòng CREATED/WAITING → CANCELLED.
10. Chỉ progress COMPLETED sau record FINAL **và** session ENDED. End session, finalize record và complete encounter là ba hành động riêng.

**Giới hạn thiết kế được chốt rõ:** 1.0.0 dùng signaling nội bộ hiện có. Thu hồi token ngăn truy cập signaling, không cưỡng chế cắt media P2P đã thiết lập. Các tiêu chí provider webhook/outbox đóng phòng như AC-24-E chưa được đáp ứng bởi quyết định này; không sửa tiêu chí thành “đã đạt”. Nếu cần thu hồi media phía server, phải bổ sung provider/SFU, outbox và xác nhận đóng phòng. Quyết định đó thuộc giai đoạn triển khai tiếp, không giả lập endpoint callback chưa tồn tại.

## 9. Bàn giao và kiểm chứng

BE sửa BE-01…04; FE chuyển adapter và dữ liệu theo [backlog](integration-backlog.md). Các cờ `VITE_BACKEND_*` chỉ bật cho luồng đã sửa và kiểm tra; Docker cần truyền build args và rebuild.

```powershell
python -m pip install -r scripts/requirements-api-contract.txt
python scripts/check-api-contract.py
python -m unittest discover -s scripts/tests -p 'test_api_contract.py' -v
```

Kiểm tra này xác nhận cấu trúc, ref, ví dụ schema và request so với snapshot; không chứng minh quyền/trạng thái đúng trên backend thật. Điều kiện bàn giao runtime: test ba lỗi quyền/audit, queue rỗng 204, một ca trực tiếp xuyên UI có refresh draft, một ca remote hai browser có media/mất mạng/hết token/kết thúc ở phía bên kia. NFR tải, sao lưu/phục hồi và usability vẫn cần bằng chứng riêng.
