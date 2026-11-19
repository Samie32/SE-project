# Bàn giao kiểm thử hồi quy cho Vũ Đức Thắng

Ngày 19/11/2026. Kiểm thử do Codex chạy trên workspace của nhóm. Vũ Đức Thắng có thể chạy lại các ca dưới đây và lưu kết quả độc lập theo nhiệm vụ trong [kế hoạch dự án](../../project-plan.md). Dữ liệu trong các lần chạy là dữ liệu mô phỏng.

## Danh mục ca hồi quy backend

Nguồn thực thi của 12 ca là [SchedulingIntegrationTest.java](../../../backend/src/test/java/com/clinic/SchedulingIntegrationTest.java). Maven chạy chúng trên MySQL 8.4 qua Testcontainers. Nhóm HTTP dùng MockMvc cùng Spring Security. Nhóm đồng thời dùng hai giao dịch riêng để kiểm soát thứ tự đọc và commit.

| Mã | Nhóm | Truy vết | Phương thức JUnit | Kết quả mong đợi |
|---|---|---|---|---|
| RG-01 | Bảo mật và audit API | BE-01, FR-17, FR-23 | `deniedTelehealthJoinPersistsOnlyAudit` | Người ngoài nhận 404, audit `DENIED` mang request ID, phiên giữ nguyên và không cấp token. |
| RG-02 | Phân quyền API | BE-02, FR-02, FR-05–06 | `receptionCanReadDoctorSchedulesButCannotChangeThem` | Lễ tân đọc được lịch làm và nghỉ, bị chặn khi ghi, bác sĩ bị chặn khi đọc lịch bác sĩ khác. |
| RG-03 | Phân quyền API | BE-03, FR-02, FR-07 | `catalogReadsRequireAnOperationalRole` | AUDITOR thuần nhận 403 trên danh mục bác sĩ, chuyên khoa và slot. Vai trò nghiệp vụ kết hợp vẫn có quyền đọc. |
| RG-04 | Hợp đồng API và thử lại | BE-04, FR-20 | `emptyQueueResultReplaysWithoutCallingNewlyCheckedInPatient` | Hàng rỗng trả 204, thử lại cùng khóa vẫn trả 204, khóa mới gọi được lượt, phân biệt 404 và 409. |
| RG-05 | Xác thực đồng thời | FR-01 | `concurrentFirstLoginSeesTheAccountCreatedByTheOtherRequest` | Hai yêu cầu cho cùng danh tính dùng chung một tài khoản, một hồ sơ bệnh nhân và một log đăng ký. |
| RG-06 | Lịch làm đồng thời | FR-05 | `availabilityChecksShiftsCommittedAfterItsInitialRead` | Ca chồng giờ vừa commit gây 409 và chỉ ca hợp lệ tồn tại. |
| RG-07 | Lịch nghỉ đồng thời | FR-06 | `timeOffChecksBookingsCommittedAfterItsInitialRead` | Lịch nghỉ bị chặn với 409 khi có lịch hẹn vừa commit. |
| RG-08 | Trạng thái bác sĩ đồng thời | FR-04 | `doctorDeactivationChecksBookingsCommittedAfterItsInitialRead` | Không ngừng nhận lịch của bác sĩ khi có lịch hẹn vừa commit. |
| RG-09 | Trạng thái bác sĩ và quyền | FR-02, FR-03, NFR-03 | `doctorActivationChecksStaffRolesCommittedAfterItsInitialRead` | Không kích hoạt hồ sơ bác sĩ sau khi vai trò `DOCTOR` đã bị thu hồi. |
| RG-10 | Tiếp đón và thử lại | FR-19 | `checkInReusesATicketCommittedAfterItsInitialRead` | Hai lần check-in cho một lịch dùng cùng phiếu. |
| RG-11 | Tiếp đón và thứ tự hàng | FR-19, FR-20 | `checkInAppendsAfterTicketsCommittedAfterItsInitialRead` | Lượt đến sau nhận vị trí tiếp theo. |
| RG-12 | Gọi lượt đồng thời | FR-20 | `nextDoesNotCallASecondTicketAfterAnotherRequestCommitsACall` | Chỉ một phiếu `CALLED`. Yêu cầu gọi thêm nhận 409. |

Chạy toàn bộ từ `backend/` bằng `./mvnw.cmd -B verify`. Chạy riêng một ca bằng tên phương thức, hoặc nối nhiều tên bằng `+` trong cùng đối số Maven. Ví dụ cho nhóm audit và phân quyền:

```powershell
.\mvnw.cmd -B '-Dtest=SchedulingIntegrationTest#deniedTelehealthJoinPersistsOnlyAudit+receptionCanReadDoctorSchedulesButCannotChangeThem+catalogReadsRequireAnOperationalRole' test
```

## Kết quả chạy

Mã nền `aa0b8ef` cùng các thay đổi đang có trong workspace ngày 19/11/2026. Backend chạy trên JVM local với MySQL 8.4 Testcontainers. Stack Docker riêng chạy bản build từ workspace với Keycloak 26.4, Java 21, MySQL 8.4 và Mailpit. Kiểm thử trình duyệt dùng Chromium headless.

| Nhóm | Lệnh hoặc nguồn ca | Kết quả |
|---|---|---|
| Backend, tích hợp MySQL, hồi quy RG-01–12 | `mvnw.cmd -B clean verify` | **65/65 đạt**, gồm 58 test tích hợp, 5 test JWT và 2 test cấp tài khoản nhân sự. |
| Frontend, unit/UI, build | `npm test`, `npm run typecheck`, `npm run build` | **70/70 đạt**, kiểm tra kiểu và build thành công. Compose cũng build được image frontend và backend. |
| Playwright, quét trang mock và chặn route | `npm run test:scan` | **10/10 đạt**. Kiểm tra 26 cặp vai trò/trang ở hai kích thước, không ghi nhận tràn ngang hoặc lỗi console/page trong 52 lượt đo. Axe chạy trên 26 lượt desktop và không ghi nhận vi phạm trong các quy tắc được bật. |
| Playwright, WebRTC với fixture | `npm run test:rtc` | **2/2 đạt**. Kiểm tra media hai phía bằng thiết bị giả, mute, ICE restart, renew token, kết thúc và fallback audio. |
| Playwright, đăng nhập thật | `npm run test:auth-runtime` | **5/5 đạt** với PATIENT, DOCTOR, RECEPTIONIST, AUDITOR và ADMINISTRATOR. Trình duyệt yêu cầu Authorization Code + PKCE S256 và nhận đúng vai trò từ `/api/me/profile`. |
| Theme Keycloak và API smoke thật | `scripts/verify-login-theme.py`, `scripts/smoke.py` | **Đạt** trên stack riêng. Xác thực JWT, quyền và chủ sở hữu, CORS, audit, đặt/đổi/hủy lịch, thử lại cùng khóa, xung đột và Mailpit. Dùng bản sao script trỏ sang các cổng của stack thử nghiệm. |
| Hợp đồng và test pack Python | `scripts/check-api-contract.py`, discovery `scripts/tests` và `tests/python` | **Đạt** kiểm tra OpenAPI 3.1, 56 thao tác và 36 ví dụ. Hai bộ discovery đạt **9/9** và **12/12**, có 7 ca hợp đồng chung. |
| k6, smoke API | `tests/k6/api-smoke.js` | **Đạt**, 25 yêu cầu, 0 lỗi bất ngờ, p95 **58,53 ms**. Các kiểm tra xác thực bao gồm cả phản hồi 401 mong đợi. |
| k6, tranh chấp một slot (`NFR-02`) | `tests/k6/appointment-contention.js` | **Đạt**, 100 yêu cầu từ 2 tài khoản, **1 thành công, 99 phản hồi 409**. Đối chiếu API lịch hẹn của hai bệnh nhân thấy đúng một lịch `CONFIRMED` cho slot thử nghiệm. |
| k6, tải tra cứu slot | `tests/k6/appointment-load.js` | **Đạt ngưỡng của script**, tối đa 10 VU, giữ tải 2 phút, **1.491 yêu cầu**, 0 lỗi, p95 **33,87 ms**. Có một ngoại lệ tới **24,37 giây** cần theo dõi nếu tái diễn. |
| Kiểm thử lịch sử | `tests/python/legacy` với hợp đồng `eb568ad`; frontend patient trên `bcee29e` | **40/40** Python và **18/18** frontend đạt đúng mốc lưu trữ. Khi đối chiếu Python legacy trực tiếp với hợp đồng hiện hành, 4 ca phát hiện snapshot cũ lệch hợp đồng như thiết kế của bộ kiểm tra. |

Kết quả trình duyệt và báo cáo quét trang được sinh ở `frontend/test-results/`, báo cáo Maven ở `target/surefire-reports/` của thư mục build. Hướng dẫn chạy lại nằm trong [tests/README.md](../../../tests/README.md). Các bản sao JUnit cũ trong `tests/backend/` dùng để tham chiếu. Số liệu backend lấy từ suite hiện hành.

## Phạm vi chưa nghiệm thu

- **NFR-01:** chưa đo tải chuẩn với 50 người dùng, 10.000 lịch, 15 phút và cả hai luồng đọc/ghi. Bài k6 tra cứu chỉ chứng minh số liệu trong bảng.
- **NFR-11:** JaCoCo đo **78,25% line coverage** và **59,41% branch coverage** trên suite Java tổng hợp. Tiêu chí độ bao phủ riêng của unit test nghiệp vụ còn cần phép đo riêng.
- **E2E nghiệp vụ:** đã kiểm thử đăng nhập qua giao diện và API nghiệp vụ trên stack thật. Luồng khám trực tiếp và phát hành đơn qua giao diện, cùng WebRTC hai thiết bị/hai mạng với TURN, còn chờ nghiệm thu.
- **Bảo mật và vận hành:** các ca quyền, JWT và audit trong bảng đã chạy. Kiểm thử tải hoặc bảo mật chuyên sâu và nghiệm thu bản triển khai công khai cần môi trường và bằng chứng riêng.

## Kiểm chứng bản ghép với main

Bản ghép từ `origin/main@2a30bc8` chạy lại đạt 65/65 bài backend, 70/70 bài frontend và 17/17 bài Playwright. OpenAPI, Python hiện hành, 9 ca Azure trong Linux và actionlint đều đạt. Smoke API trên Docker riêng đã qua Keycloak, MySQL và Mailpit. Nạp dữ liệu demo hai lần cho cùng bốn mã lịch mẫu. Các workflow và script Azure trên main được giữ nguyên. Kết quả này dùng môi trường thử nghiệm local.
