# Bộ demo theo hợp đồng BE–FE 1.0.0

Đối chiếu ngày 17/11/2026: `docs/api/openapi.yaml` (46 thao tác/38 đường dẫn), BE `main@a04dcb1`, migration V1/V2 và DemoData.java. [source.json](source.json) lưu SHA/hash chuẩn hóa LF. Snapshot chỉ thêm `/api` vào path và đổi server thành origin, không sửa schema; đây không phải kết quả vừa gọi `/v3/api-docs`.

## Dữ liệu chuẩn

[accounts.json](accounts.json) có admin, doctor, patient, patient2, receptionist, auditor. Chỉ user/catalog seed có ID biết trước; lấy `doctorId`/`patientId` bằng `/api/me/profile`, không suy từ userId. Seed chỉ có 1 bác sĩ/1 chuyên khoa; không dùng UUID của fixtures thiết kế.

[request-examples.json](request-examples.json) gồm 47 ví dụ schema cho 46 thao tác, vì availability có IN_PERSON/REMOTE. Ngày 2030-01-08 chỉ minh họa schema. UUID ngoài account/catalog là placeholder, chưa phải dữ liệu được tạo. `expected_status` là kỳ vọng khi hợp lệ, không phải kết quả thực tế; `access`/`implementation_gaps` giữ quy tắc quyền và chênh lệch baseline.

JSON dùng camelCase, ADMINISTRATOR/REMOTE, version mới 0. Không gửi ADMIN, TELEHEALTH, patient_id, participationConfirmed, dosage hoặc timestamp từ bộ cũ. Luôn đọc version mới trước lệnh tiếp theo.

## Môi trường

Dùng setup và Compose theo README root trên môi trường demo. Không chạy lại setup/reset volume khi có dữ liệu cần giữ. FE cổng 5173, BE 8080/api, Keycloak 8180, Mailpit 8025. Mật khẩu lấy từ .env local, không commit.

Profile demo tạo lịch từ ngày mai trong 7 ngày tiếp theo, bỏ Chủ nhật: 08:00–12:00 IN_PERSON, 13:00–17:00 REMOTE, slot 20 phút. Trước khi POST availability, GET kiểm tra overlap; không tạo trùng khung đã seed.

## Sinh và dùng request

```powershell
python docs/contributions/52400244_NguyenThuong/tools/backend_demo.py --check
python docs/contributions/52400244_NguyenThuong/tools/backend_demo.py
```

Chỉ kiểm/sinh file, không tự đăng nhập, gửi request hoặc nạp DB. Đầu ra trong `test-data/generated/backend-YYYY-MM-DD/` bị gitignore. Sinh lại tạo key mới: không dùng file mới retry thao tác timeout chưa rõ kết quả. Retry giữ file/key/body cũ; đổi nội dung phải đổi key.

- `requests.json`: đủ schema/tham số/header cho 46 API, không phải chuỗi giao dịch để chạy hàng loạt.
- `demo.http`: đặt/đổi/hủy ngày tương lai, slot/version từ response. Cần >=2 slot trống, CONFIRMED và còn >=2 giờ cho đổi/hủy. Replay book giữ key/body.
- `clinical.http`: truyền CLINIC_IN_PERSON_APPOINTMENT_ID của lịch CONFIRMED. Đến [T−15,T+15) mới check-in. Chỉ tiếp tục nếu next trả đúng lịch. Có CALLED/IN_SERVICE khác thì xử lý đúng ca trước. Record mới version=0; draft cũ phải đọc version hiện tại. Đơn chỉ chứa placeholder phi y tế.
- `telehealth.http`: truyền CLINIC_REMOTE_APPOINTMENT_ID đúng patient/doctor. Prepare/join [T−10,T+15), start [T,T+15). Token phòng 5 phút và vẫn cần JWT. ACTIVE/RECONNECTING có thể join lại ngoài cửa sổ ban đầu. End không tự hoàn tất encounter.

Token lấy từ environment của REST Client: CLINIC_ADMIN_TOKEN, CLINIC_PATIENT_TOKEN, CLINIC_DOCTOR_TOKEN, CLINIC_RECEPTIONIST_TOKEN. Không lưu token thật trong HTTP/report. Token hết hạn cần gia hạn theo môi trường test.

Booking tương lai không tự đáp ứng check-in/start sát giờ. Đặt trước slot ngày demo và chờ đúng thời điểm; không sửa đồng hồ OS/DB. Nếu thiếu điều kiện ghi NOT_RUN/BLOCKED và lý do.

## Nghiệm thu

Theo [runbook](../../demo/demo-runbook.md), [24 TC](traceability.csv) và BE-01…04. Queue rỗng chuẩn 204 có thể còn 404 ở baseline. Quyền đọc lịch lễ tân, danh mục auditor và audit từ chối vào phòng còn backlog.

HTTP lifecycle/signaling không chứng minh video/audio. FE đã có WebRTC; cần mở hai người dùng để kiểm media/end/cleanup rồi kiểm hai mạng/TURN theo [hướng dẫn media trên nhánh tích hợp](https://github.com/Samie32/SE-project/blob/98a02e19fa79414f6b4d63fbe9738969d261889b/docs/webrtc-client.md). Không gửi SDP giả để tuyên bố media thật. Runtime bộ đóng góp này vẫn NOT_RUN tới khi có log/ảnh gắn SHA.
