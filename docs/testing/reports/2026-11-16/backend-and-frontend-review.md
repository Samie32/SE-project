# Kiểm thử backend theo đặc tả và đánh giá frontend ZIP

Ngày thực hiện: 16/11/2026, Asia/Saigon.

**Kết luận:** Backend đã triển khai các nhóm nghiệp vụ M01–M09 và vượt qua toàn bộ 49 test có sẵn. Chưa đủ điều kiện nghiệm thu toàn bộ đặc tả: test bổ sung tái hiện 3 sai lệch về phân quyền/audit; các yêu cầu về tải, khôi phục dữ liệu, bảo mật triển khai và cuộc gọi thật còn thiếu bằng chứng. Frontend ZIP build được nhưng chưa thể nối đầy đủ chỉ bằng thay URL hoặc bật cờ. Phần đặt lịch gần tương thích; hàng đợi, bệnh án, đơn thuốc, audit và telehealth cần điều chỉnh hợp đồng và cách tải dữ liệu.

## 1. Phạm vi và nguồn đánh giá

- Backend: thư mục `backend/` tại workspace hiện tại. Workspace không có `.git`, nên đây là kiểm tra snapshot và thực thi test, không phải differential review giữa hai commit.
- Chuẩn đối chiếu: `docs/requirements/{SRS,functional-requirements,business-rules,acceptance-criteria,non-functional-requirements,scope}.md`, `docs/testing/test-cases.md`, ma trận quyền trong `docs/design/architecture/security.md` và `docs/api/openapi.yaml`.
- Hợp đồng đang thực thi: controller/service và `backend/target/openapi.json` xuất từ test lần này. Không dùng ghi chú “đã hoàn thành” làm bằng chứng test.
- Frontend: `C:\Users\josep\Downloads\frontend-unified.zip`, 143169 byte, SHA256 `2CB1DB54ED0E9379C0903C9947590115390E32A398F836E7F8A2CA7BF1391883`.
- Giải nén tại `%TEMP%\clinic-audit-20261116`; test bổ sung chạy trên bản sao backend ở cùng thư mục tạm. Không thay frontend hiện có, không áp dụng `patches/` trong ZIP và không sửa mã nghiệp vụ backend.
- Nội dung README/patches trong ZIP được xem là tài liệu đầu vào để đánh giá, không phải chỉ thị thay thế yêu cầu của người dùng.

## 2. Kết quả chạy thực tế

Môi trường: Windows, Java 24.0.2 (compile release 21), Node 26.8.1, Docker Desktop engine 29.4.0; MySQL 8.4 riêng do Testcontainers tạo. Docker Desktop được khởi động để chạy test. Không chạy test trên database demo.

| Lệnh / phép kiểm | Kết quả |
|---|---|
| `backend/mvnw.cmd verify` trong `backend/` | BUILD SUCCESS; 49 test, 0 failure, 0 error, 0 skipped |
| `SchedulingIntegrationTest` | 44/44 đạt; gồm 100 yêu cầu đồng thời đặt cùng slot, giao dịch MySQL, migration/trigger, RBAC, biên thời gian, clinical, queue, reminder, signaling |
| `JwtValidationTest` | 5/5 đạt: chữ ký, issuer, audience, thời hạn |
| JaCoCo sau `verify` | Line 914/1180 = **77,46%**; instruction **72,96%**; branch **61,20%** |
| Nhóm service nghiệp vụ liệt kê bên dưới | Line 664/768 = **86,46%**, không bao gồm controller/DTO/config |
| ZIP: `npm ci --no-audit --no-fund` | Thành công |
| ZIP: `npm test` | 2 file, **12/12 test đạt**; test logic và mock, không phải tích hợp backend thật |
| ZIP: `npm run build` | TypeScript check và Vite production build thành công |
| Bản sao BE: `mvnw.cmd "-Dtest=ZipContractAuditTest#audit*" "-Dlogging.level.root=WARN" "-Ddebug=false" test` | **13 test: 10 đạt, 3 thất bại, 0 error, 0 skipped**; exit 1 do 3 sai lệch theo đặc tả |

Nhóm service tính coverage: AppointmentService, ScheduleService, CatalogService, WorkflowService, ClinicalService, TelehealthService, NotificationStore, NotificationWorker, Access. Coverage trên là tổng hợp từ unit và integration test; không chứng minh riêng yêu cầu **unit-test coverage** trong NFR-11.

13 test bổ sung được chọn gồm 10 phương thức mới trong `ZipContractAuditTest.java` và 3 phương thức audit kế thừa từ fixture. Bảy test mới đạt là phép tái hiện hành vi/lệch hợp đồng, không có nghĩa frontend đã tích hợp thành công. Ba test mới còn lại khẳng định kết quả mong đợi theo đặc tả và thất bại trên mã hiện tại.

Bằng chứng giữ trong thư mục báo cáo:

- `com.clinic.SchedulingIntegrationTest.txt`, `com.clinic.config.JwtValidationTest.txt`: kết quả bộ test gốc.
- `jacoco.csv`: coverage lần chạy gốc; bản HTML đầy đủ nằm ở `backend/target/site/jacoco/index.html`.
- `ZipContractAuditTest.java`, `com.clinic.ZipContractAuditTest.txt`: mã tái hiện và kết quả sai lệch.

Giới hạn: chưa chạy browser E2E với Keycloak thật hoặc cuộc gọi hai máy/trình duyệt; không chạy `scripts/smoke.py` trên stack demo. Test HTTP bổ sung dùng MockMvc, JWT giả lập ở biên HTTP và MySQL thật; xác minh chữ ký JWT là bộ test riêng.

## 3. Sai lệch backend đã xác nhận

### BE-01 — Không lưu audit khi người ngoài bị từ chối tham gia phòng (P1)

- Chuẩn: AC-23/TC-23 yêu cầu từ chối cấp token **và ghi nhật ký kiểm toán**.
- Vị trí: `backend/src/main/java/com/clinic/telehealth/TelehealthService.java:87`, `clinical/CareAccess.java:56`, `audit/Audit.java:19`.
- Tái hiện: tạo phòng hợp lệ; bệnh nhân khác POST `/api/telehealth-sessions/{id}/join` với `{consent:true}`.
- Thực tế: trả 404, không cấp token, số audit của người ngoài không tăng. Test `auditSpecDeniedRoomJoinMustBeAudited` thất bại.
- Tác động: thiếu dấu vết truy cập trái phép; không phải bằng chứng người ngoài đọc được dữ liệu.
- Hướng sửa: ghi sự kiện từ chối với kết quả phù hợp qua transaction riêng/cơ chế bảo đảm lưu sau rollback; không ghi token/PHI. Test lại cả từ chối và lỗi ghi audit, tránh vô tình commit giao dịch nghiệp vụ thất bại.

### BE-02 — Lễ tân không đọc được lịch làm việc (P2)

- Chuẩn: ma trận trong `docs/design/architecture/security.md`, dòng “Lịch làm/nghỉ”: lễ tân có quyền đọc.
- Vị trí: `availability/ScheduleService.java:120` gọi `auth/Access.java:78`, chỉ chấp nhận quản trị hoặc bác sĩ sở hữu.
- Tái hiện: lễ tân GET `/api/doctors/{id}/availability`.
- Thực tế: 403, mong đợi 200. Test `auditSpecReceptionistCanReadSchedule` thất bại.
- Hướng sửa: tách quyền đọc lịch và quyền sửa lịch; cấp quyền đọc cho lễ tân, giữ kiểm tra sở hữu ở thao tác ghi. Rà soát tương tự GET time-off; trường hợp time-off chưa được probe HTTP riêng.

### BE-03 — Kiểm toán viên vẫn đọc được danh mục bác sĩ (P2)

- Chuẩn: cùng ma trận quyền, kiểm toán viên không có quyền đọc danh mục/lịch trống.
- Vị trí: `catalog/CatalogController.java:28`; GET chỉ gọi `access.actor(j)` rồi trả danh sách.
- Tái hiện: tài khoản chỉ có AUDITOR GET `/api/doctors`.
- Thực tế: 200, mong đợi 403. Test `auditSpecAuditorCannotReadCatalog` thất bại.
- Tác động: cấp quyền rộng hơn thiết kế, không đồng nghĩa lộ bệnh án. Cần áp ma trận nhất quán cho các GET danh mục; probe lần này xác nhận riêng `/doctors`.

Các mức P1/P2 ở đây là ưu tiên khắc phục trong dự án, không phải điểm CVSS.

## 4. Truy vết 24 yêu cầu chức năng

“Có bằng chứng” nghĩa là đã xem implementation và có test tương ứng đạt trong phạm vi backend; không phải nghiệm thu E2E toàn hệ thống hoặc tất cả nhánh ngoại lệ.

| FR | Đánh giá | Bằng chứng / giới hạn |
|---|---|---|
| 01 | Có bằng chứng BE | JWT validation 5 test; internalRoleMappingIgnoresTokenAdminClaim; chưa test luồng PKCE trên browser thật |
| 02 | Chưa đạt toàn bộ | Chặn trái chủ lịch/bệnh án; nhưng BE-02/03 lệch ma trận quyền |
| 03 | Có triển khai; kiểm thử một phần | CatalogService tạo/sửa bác sĩ; fixture tạo nhiều bác sĩ; chưa có ma trận HTTP CRUD đầy đủ |
| 04 | Có bằng chứng | doctorTimeOffAndInactiveStatusRespectExistingBookings |
| 05 | Có bằng chứng | invalidHoursAndOverlappingAvailabilityRejected; fixture sinh slot |
| 06 | Có bằng chứng | timeOffHidesAndBlocksSlot; bookingAgainstConcurrentTimeOffIsSerialized |
| 07 | Có bằng chứng một phần | Lọc slot theo lịch trống, nghỉ, active và thời gian; chưa test mọi tổ hợp filter |
| 08 | Có bằng chứng mạnh | twoPatientsCannotBookSameSlot; patientCannotBookOverlappingDoctors; hundredConcurrentBookingsHaveExactlyOneWinner |
| 09 | Có bằng chứng | failedReschedulePreservesOriginal; successfulRescheduleChangesVersionAndFreesSlot; biên 2 giờ |
| 10 | Có bằng chứng | cancelReleasesSlotAndIsIdempotent; biên 2 giờ; reminder cũ bị loại theo version/status |
| 11 | Có bằng chứng | fullClinicalWorkflowPreservesFinalRecordsAndIssuedPrescriptions; check-in/no-show; remote lifecycle |
| 12 | Có bằng chứng | clinicalAuditFailureRollsBackAndBlocksSensitiveReads; history scoped theo quan hệ điều trị |
| 13 | Có bằng chứng | FINAL immutable bằng trigger; concurrentAmendmentsCannotBranch; version conflict |
| 14 | Có bằng chứng | draftHiddenFromPatientAndEmptyPrescriptionCannotIssue; full clinical workflow; validate 5 trường thuốc |
| 15 | Có bằng chứng cho Email local | reminderIsScheduledAndSkippedAfterCheckIn; bookingInsideThirtyMinutesDoesNotEnqueueReminder; chưa xác minh SMS thật |
| 16 | Có bằng chứng cho SMTP mock | notificationRetriesStopAfterThreeRetries; lỗi SMTP không rollback lịch; chưa thử nhà cung cấp thật |
| 17 | Có bằng chứng với thao tác thành công; còn thiếu | Audit atomic/read fail-closed đạt; sự kiện từ chối ở BE-01 thiếu theo AC-23 |
| 18 | Có bằng chứng BE | auditIsAppendOnlyAtDatabaseLevel; auditSearchRequiresAuditorAndFiltersByResource; FE lệch tên trường thời gian |
| 19 | Có bằng chứng | checkInHasExactTimeBoundariesAndRoleChecks; concurrentCheckInAndNextAreSerialized |
| 20 | Có bằng chứng | next khóa bác sĩ, FIFO, một CALLED/IN_SERVICE; test đồng thời và clinical workflow |
| 21 | Có bằng chứng | skipMovesSameTicketBehindWaitingPatients; giữ ticket ID, kiểm tra version |
| 22 | Có bằng chứng cho vòng đời phòng BE | remote lifecycle/window; kiểm tra camera/micro thuộc FE chưa E2E |
| 23 | Chưa đạt đầy đủ AC | Token gắn người/phòng, hết hạn, đúng người được cấp; thiếu audit từ chối BE-01; chưa có media thật |
| 24 | Đạt một phần | Token/reconnect/signaling/end có test; chưa có WebRTC E2E và cơ chế đóng media qua provider như thiết kế |

## 5. Truy vết 12 yêu cầu phi chức năng

| NFR | Kết quả |
|---|---|
| 01 | Chưa kiểm chứng p95 ≤2 giây, 50 người dùng, 10.000 lịch, 15 phút. Test 100 booking không thay thế bài đo này. |
| 02 | Đạt phép kiểm hiện có: 100 yêu cầu đồng thời, cùng slot, MySQL thật, đúng một lịch. |
| 03 | Có nhiều test JWT/ownership; chưa đạt toàn ma trận quyền vì BE-02/03, chưa vét cạn tất cả endpoint × vai trò. |
| 04 | Có mã hóa dữ liệu nhạy cảm AES-GCM và test tamper; Compose local dùng HTTP, chưa chứng minh TLS, mã hóa backup hoặc quản lý khóa triển khai. |
| 05 | Audit thành công, rollback và append-only có test; kiểm tra AC-23 phát hiện sự kiện từ chối bị thiếu. Chưa chứng minh toàn bộ thiết kế tài khoản DB tách biệt. |
| 06 | Chưa thực hiện backup → restore → đối chiếu bản ghi/khóa ngoại. |
| 07 | Có fault injection audit/storage, SMTP mock và rollback; chưa mô phỏng toàn bộ DB outage/provider thật. |
| 08 | Chưa thử với 5 người dùng và đo hoàn thành đặt lịch ≤3 phút. |
| 09 | Chưa chứng minh hiển thị lỗi ≤10 giây khi mất media/network; chỉ có test trạng thái BE. |
| 10 | Đúng stack; OpenAPI runtime 3.1. Thiếu Git metadata trong snapshot nên không xác nhận quản lý UML bằng Git; hợp đồng thiết kế và runtime chưa đồng bộ. |
| 11 | Tổng line coverage 77,46%, service được chọn 86,46%, có test concurrency/auth. Chưa tách coverage unit-test để khẳng định đúng nguyên văn tiêu chí unit ≥60%. |
| 12 | Fixture dùng dữ liệu giả; có test Email không chứa clinical content, dữ liệu lưu mã hóa. Chưa kiểm toán đầy đủ log/Email/SMS ở môi trường chạy thật. |

## 6. Đánh giá khả năng nối frontend ZIP

### Các phần phù hợp

- React + TypeScript, OIDC Authorization Code + PKCE, access token trong bộ nhớ, lấy vai trò từ `/api/me`.
- Authority `http://localhost:8180/realms/clinic`, client `clinic-web`, callback `/callback`, cổng 5173 phù hợp cấu hình realm và CORS hiện tại.
- Vite proxy `/api` → `http://localhost:8080`; Nginx ZIP proxy tới service `backend:8080` phù hợp Compose.
- Danh mục, tìm slot, đặt/đổi/hủy dùng `IN_PERSON`/`REMOTE`, `slotId`, `version`, `Idempotency-Key` phù hợp adapter hiện tại.
- Check-in gửi đúng endpoint và idempotency key. Các phần này vẫn cần một vòng E2E với token thật trước nghiệm thu.

### Các điểm chặn / lệch hợp đồng

Đường dẫn FE dưới đây tính từ thư mục `frontend/` **trong ZIP**, không phải frontend đang nằm trong repository.

| ID / ưu tiên | Frontend hiện tại | Backend hiện tại / ảnh hưởng | Cách nối đề xuất |
|---|---|---|---|
| FE-01 / P1 | `.env.example` và Dockerfile mặc định 6 cờ BACKEND đều false | Check-in, queue, progress, clinical, telehealth, audit bị khóa dù BE đã có API | Bật từng cờ sau khi sửa adapter; Docker cần build args rồi rebuild, sửa env runtime không đổi bundle |
| FE-02 / P1 | `src/api/operations.ts:27`: GET `/queue-tickets?date&doctorId&status` | Không có route; probe trả 404. GET thực là `/doctors/{id}/queue?date=` | Chuyển route; lọc status phía FE hoặc thêm filter BE |
| FE-03 / P1 | `operations.ts:32`: queue/next không có `date`; dòng 37 skip chỉ `{reason}` và không key | next yêu cầu date; skip yêu cầu `{reason,version}` + key. QueueTicket FE chưa có version. FE còn giả định hết hàng trả 204, BE hiện trả 404 khi không có WAITING | Truyền ngày, version và key; thống nhất response hàng rỗng; giữ key khi retry cùng thao tác |
| FE-04 / P1 | `src/api/appointments.ts:55`: progress thiếu key | POST progress yêu cầu `Idempotency-Key`; probe trả 400 | Thêm key vào hàm và caller; body `targetStatus,version` đã đúng |
| FE-05 / P1 | `operations.ts:50,57,61,87,91`: save/amend/create prescription/start/end thiếu key; api.put chưa nhận key | Các API này đều yêu cầu header; probe save record/create prescription trả 400 | Mở rộng api.put và adapter; caller giữ key theo payload khi mất mạng/5xx |
| FE-06 / P1 | `Consultation.tsx:57` dùng `appt.encounterId`, nhưng lấy appointment từ scan danh sách | GET `/appointments` SELECT a.* không có encounterId; FE không dùng response progress để giữ encounterId. Probe xác nhận detail có encounterId còn list không có | Khi mở/tải lại ca khám gọi GET `/appointments/{id}` hoặc bổ sung encounterId ở list BE |
| FE-07 / P1 | `Consultation.tsx:54–59` lấy current record/rx qua lịch sử bệnh nhân | History BE chỉ FINAL/ISSUED. DRAFT đã lưu không xuất hiện; FE có thể quay về version 0 và gặp 409 hoặc tạo thêm đơn. Probe xác nhận endpoint encounter trả draft | Lấy bản hiện tại qua GET `/encounters/{id}/record` và `/encounters/{id}/prescriptions`; lịch sử dùng API bệnh nhân riêng |
| FE-08 / P1 | `operations.ts:83` join gửi `{participationConfirmed:true}` | DTO thực yêu cầu `{consent:true}`; probe body cũ trả 400, body mới 200 | Đổi tên trường; đồng bộ OpenAPI thiết kế cũng đang dùng participationConfirmed |
| FE-09 / P1 | `TelehealthRoom.tsx` chỉ getUserMedia cục bộ, không RTCPeerConnection/OFFER/ANSWER/ICE, không X-Room-Token | Có token/vòng đời BE nhưng không có truyền hình/tiếng giữa hai bên; chưa thỏa khám từ xa thật | Viết WebRTC client + signaling/connection/refresh token; cấu hình STUN/TURN, HTTPS khi triển khai và test hai browser |
| FE-10 / P2 | `TelehealthRoom.tsx:49` poll bằng POST prepare mỗi 5 giây với key mới | prepare từ chối phòng ENDED/CANCELLED bằng 409; người bên kia không cập nhật được trạng thái đóng qua poll. Probe end → prepare 409, GET session trả ENDED | Prepare một lần, sau đó poll GET `/telehealth-sessions/{id}`; khi ENDED đóng media, xóa token, dừng poll phù hợp |
| FE-11 / P1 | `src/features/staff/Audit.tsx` format `e.timestamp`; type AuditEvent cũng dùng timestamp | BE Db chuyển `created_at` thành `createdAt`; không có timestamp. Intl.DateTimeFormat nhận ngày invalid có thể ném RangeError khi render | Map createdAt → timestamp hoặc đổi type/UI; probe xác nhận shape audit |
| FE-12 / P2 | `Consultation.tsx:179` luôn POST tạo đơn kể cả đã có draft | BE có PUT `/prescriptions/{id}` nhưng FE không dùng; có nguy cơ nhiều draft mới sau mỗi lần lưu | Nếu đã có draft, PUT với version và key; POST chỉ khi chưa có |

Các điểm phụ cần chỉnh: QueueTicket cần `version`, `createdAt`/`queueDate` thay vì chỉ mong `checkedInAt`; các API lịch sử đang dừng ở 100 bản ghi; doctor context dò quyền từng bác sĩ do `/me` không có doctorId trong khi `/me/profile` đã có. Nếu tài khoản có cả DOCTOR và ADMINISTRATOR, cách dò lịch được phép đọc có thể chọn nhầm bác sĩ; nên dùng profile trực tiếp.

Frontend ZIP không thiếu nền tảng đăng nhập/đặt lịch, và không cần viết lại toàn bộ. Phần tích hợp còn lại tập trung ở adapter API, kiểu dữ liệu và tải bản ghi hiện tại. Riêng video/audio là phần chức năng cần xây dựng thêm đáng kể.

## 7. Hợp đồng và tài liệu chưa đồng bộ

- So sánh method + path sau chuẩn hóa `/api` và tên path variable: thiết kế có **30 operation**, runtime có **46 operation**, không thiếu operation thiết kế về mặt method/path. Điều này không chứng minh body/response/status tương thích.
- Runtime có thêm API detail appointment, profile/users, queue list theo doctor, encounter record/rx, signaling/connection và xóa lịch chưa dùng.
- Thiết kế dùng `participationConfirmed` và `timestamp`; runtime dùng `consent` và `createdAt`. Do đó đây là sai lệch **cả hợp đồng BE và FE**, không nên chỉ kết luận FE viết sai.
- Backend controller chủ yếu khai báo `Object`/Map; OpenAPI runtime không mô tả chặt toàn bộ response nghiệp vụ. Test `generatedApiContractIncludesAllModules` chỉ kiểm tra sự hiện diện một số route, không phải kiểm chứng toàn bộ schema với đặc tả.
- `docs/running.md` còn mô tả hồ sơ/hàng đợi/video là giai đoạn sau; `docs/testing/test-plan.md` còn ghi chưa thực thi. Báo cáo này ghi kết quả hiện tại độc lập, không thay đổi lịch sử các tài liệu đó.
- Backend hiện dùng signaling nội bộ, khác phần provider callback/outbox đóng phòng trong thiết kế. Thu hồi token/signaling không thể cưỡng chế ngắt media P2P đã thiết lập. Cần đồng thuận điều chỉnh thiết kế hoặc bổ sung provider/SFU và cơ chế thu hồi tương ứng trước nghiệm thu AC-24-E.

## 8. Thứ tự tích hợp đề xuất

1. Chốt một hợp đồng API chính thức: request headers/body, response DTO, error/status; cập nhật OpenAPI và ba lỗi BE đã xác nhận.
2. Đưa ZIP vào thư mục riêng như `frontend/frontend_unified`; dùng cổng 5173 thay service patient-frontend khi chạy. Không giải nén đè vào frontend hiện có vì ZIP chứa `src/`, `package.json` ngay dưới `frontend/`.
3. Kiểm tra OIDC thật cho năm vai trò; dùng `/me/profile` để xác định patientId/doctorId.
4. Nối danh mục → slot → đặt/đổi/hủy → check-in. Bật CHECKIN sau khi kiểm tra key/retry.
5. Sửa queue/progress/clinical theo bảng, nối luồng trực tiếp đến FINAL/ISSUED/COMPLETED; tải lại trang giữa lúc có draft và thử hai tab gây stale version.
6. Map audit response rồi bật AUDIT; kiểm tra audit thành công, từ chối và fault injection.
7. Nối lifecycle từ xa, chuyển poll sang GET, rồi triển khai WebRTC; kiểm tra token hết 5 phút, nối lại sau +15 phút, kết thúc từ phía còn lại, audio-only và mất mạng.
8. Hoàn thiện chứng cứ NFR: load đúng dataset/thời lượng, backup/restore, TLS/backup encryption, test usability và hiển thị lỗi mạng.

Điều kiện để gọi là “nối xong”: ngoài build/test xanh, ít nhất một luồng trực tiếp và một luồng từ xa chạy qua UI với Keycloak/MySQL thật, lưu và mở lại draft, kiểm tra quyền khác chủ sở hữu, không lặp thao tác khi retry, và hai bên thực sự nghe/nhìn được nhau khi nghiệm thu telehealth.

## 9. Chạy lại test tái hiện mà không đổi source chính

Từ thư mục gốc dự án, dùng PowerShell:

```powershell
$auditCopy = Join-Path $env:TEMP ('clinic-review-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $auditCopy | Out-Null
Get-ChildItem backend -Force | Where-Object Name -ne 'target' |
    Copy-Item -Destination $auditCopy -Recurse -Force
Copy-Item docs/testing/reports/2026-11-16/ZipContractAuditTest.java `
    (Join-Path $auditCopy 'src/test/java/com/clinic/ZipContractAuditTest.java')
Push-Location $auditCopy
try {
    .\mvnw.cmd '-Dtest=ZipContractAuditTest#audit*' '-Dlogging.level.root=WARN' '-Ddebug=false' test
} finally {
    Pop-Location
}
```

Docker phải hoạt động. Trên snapshot được kiểm tra, lệnh trả exit 1 vì ba lỗi đặc tả đã mô tả; sau sửa cần chuyển cả ba test sang đạt. Lớp probe kế thừa fixture của bộ test hiện có nên phải đặt trong bản sao đầy đủ của backend.
