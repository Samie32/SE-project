# Kịch bản demo 52400244 — 17/11/2026

**Kế hoạch chạy, chưa phải biên bản nghiệm thu.** Chuẩn 1.0.0, BE a04dcb1, FE/media 98a02e1. Dùng `test-data/backend`, không dùng UUID/enum thiết kế 0.1.

## Chuẩn bị

1. Chạy môi trường demo theo README root; xác nhận Keycloak/MySQL/BE/FE, V1/V2 và 6 account. Không reset volume có dữ liệu cần giữ.
2. Kiểm /api/me/profile và danh mục bằng patient/doctor/admin. Auditor chỉ đọc audit. Ghi doctorId/patientId thực tế.
3. Chạy `tools/run-checks.ps1`, sinh bằng `tools/backend_demo.py`. Đặt trước lịch IN_PERSON và REMOTE thuộc đúng người vào giờ demo; generated không chứa token thật.
4. Đổi/hủy cần >=2 giờ; check-in [T−15,T+15), prepare/join [T−10,T+15), start [T,T+15). Không đổi đồng hồ hoặc insert SQL để vượt cửa sổ.
5. Mở hai browser profile patient/doctor, kiểm quyền camera/micro. Khác mạng cần HTTPS/TURN theo [hướng dẫn media trên nhánh tích hợp](https://github.com/Samie32/SE-project/blob/98a02e19fa79414f6b4d63fbe9738969d261889b/docs/webrtc-client.md).

## A. Đặt, đổi, hủy và idempotency

Chạy `demo.http`: danh mục/lịch seed → slot → book → replay cùng key/body → reschedule bằng ID/version response → cancel bằng version mới → appointments/notification jobs/Mailpit. Không POST availability trùng seed. Race hai bệnh nhân đặt một slot dùng hai key: kỳ vọng một thành công/một 409; ghi kết quả thực tế, không suy từ validator.

## B. Trực tiếp và clinical

Chọn lịch IN_PERSON CONFIRMED đúng cửa sổ; dùng `clinical.http` hoặc FE, không thao tác đồng thời hai cách.

1. Lễ tân check-in: WAITING; replay không tạo phiếu thứ hai.
2. Bác sĩ queue theo ngày Việt Nam, next → CALLED. Nếu trả ca khác thì dừng, không start appointmentId đang dự định. Xử lý đúng ca CALLED/IN_SERVICE trước.
3. GET appointment lấy version, progress IN_PROGRESS, GET detail lấy encounterId.
4. DRAFT → GET current → FINAL bằng version mới; tạo đơn đủ 5 trường mô phỏng, issue. FINAL sửa qua amendment có reason/version, không ghi đè trực tiếp.
5. GET appointment mới rồi COMPLETED. Không tự issue đơn; bệnh nhân chỉ xem FINAL/ISSUED. Kiểm stale version và truy cập bệnh nhân khác bằng tài khoản test.

Nhánh bỏ lượt: ticket CALLED → skip reason/version → WAITING cuối hàng. Queue rỗng chuẩn 204; baseline BE-04 có thể còn 404, ghi FAIL và backlog.

## C. Từ xa và media

Patient vào lịch REMOTE sát giờ, consent=true; doctor start từ giờ hẹn. `telehealth.http` kiểm vòng đời hoặc FE kiểm cuộc gọi. Không để script start/end đồng thời FE.

FE: video/audio hai phía, mute/unmute, camera bị từ chối vẫn audio, reconnect, leave/rejoin, token renewal. Doctor end phải làm patient đóng peer/thiết bị sau khi quan sát trạng thái. End không tự COMPLETED encounter: FINAL record rồi hoàn tất appointment riêng. Sau ENDED không join/signals được.

Hai trình duyệt cùng máy không chứng minh TURN. Kiểm hai thiết bị/hai mạng, ép relay để xác nhận TURN; không đưa SDP/token/credential lên báo cáo. Thiếu hạ tầng ghi BLOCKED và điều kiện thiếu.

## D. Audit và lỗi

Auditor đọc /audit-events theo createdAt, to exclusive. Kiểm request ID/action/resource. QA fault injection audit để kiểm fail-closed, sai quyền; không suy từ fixture. BE-01…04 vẫn mở.

## Minh chứng

Ghi SHA BE/FE/data, môi trường, thời gian Asia/Ho_Chi_Minh, người chạy, TC, expected/actual và PASS/FAIL/BLOCKED/NOT_RUN. Lưu response đã xóa token/PHI, ảnh thật và log. Không dùng mockup/JSON làm bằng chứng runtime. Giữ log 04/11 tách biệt đợt hiện tại.
