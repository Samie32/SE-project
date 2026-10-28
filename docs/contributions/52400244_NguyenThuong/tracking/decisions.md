# Nhật ký quyết định / điểm cần xác nhận

| ID | Nhận định | Bằng chứng trong repo | Xử lý |
| --- | --- | --- | --- |
| D-01 | Chỉ có `Prescription` và `PrescriptionItem`, không có `Medication` | `docs/design/database/data-dictionary.md` | Không tạo danh mục thuốc trong seed |
| D-02 | Mode API là `IN_PERSON`, `TELEHEALTH` | `docs/api/openapi.yaml` `Availability`, `Slot`, `Appointment` | Dữ liệu v2 dùng đúng enum |
| D-03 | Đơn ISSUED phải có >=1 item, đủ 5 thông tin mô tả | BR-10, FR-14, TC-14 | Validator + fixture positive/negative |
| D-04 | Dữ liệu y tế, liên hệ phải mã hóa khi lưu | Data Dictionary, NFR-04 | Manifest `content_encrypted=null` và hướng dẫn backend tạo ciphertext; không insert trực tiếp |
| D-05 | SRS có tài liệu, backend/frontend trong ZIP chưa có triển khai | `backend/.gitignore`, `frontend/.gitignore` | Không nói đã chạy API/DB |
| D-06 | Chuẩn demo cần 24 TC nhưng đều chưa chạy | `docs/testing/test-cases.md` | Traceability là kế hoạch, không ghi PASS thực tế |
| D-07 | Project plan có mâu thuẫn mô tả đóng góp tuần 1–2 | `docs/project-plan.md` phần 3 và 5 | Xác minh commits/PR với nhóm trước khi ghi vào báo cáo cá nhân |
