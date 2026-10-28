# Bàn giao dữ liệu mẫu cho backend (Vòng Kỷ Phong)

**Chưa thực hiện nạp dữ liệu.** Bản này tạo từ mô hình logic hiện tại của nhóm.

## Cần phản hồi trước khi seed MySQL

| Câu hỏi | Lý do | Trạng thái |
| --- | --- | --- |
| Migration MySQL tương ứng 16 nhóm fixtures đã ổn định chưa? | Data Dictionary mới định nghĩa logic, một số cột chưa rõ NOT NULL/default | Chờ backend |
| UserAccount / UserRole từ IdP test được tạo thế nào? | Không lưu mật khẩu trong Git | Chờ backend |
| Hệ thống mã hóa `contact_encrypted`/`content_encrypted` thế nào? | Fixture cố ý không có BLOB và PHI rõ chữ | Chờ backend |
| Có thể tạo dữ liệu lịch sử COMPLETED qua seed/service test không? | Không cho phép API thay đổi giờ cũ thành lịch giả | Chờ backend |
| `Prescription` response có cần `author_id`, `issued_at` không? | OpenAPI chưa có hai field của Data Dictionary | Cần thống nhất nhóm |
| Đảm bảo đúng `IN_PERSON` và `TELEHEALTH` khi import | Đây là enum OpenAPI, không dùng DIRECT/REMOTE | Đã đối chiếu contract |
| Có nên tạo riêng `TimeOff`, `OutboxEvent`, `ProviderEvent`, `IdempotencyRecord` trong test setup? | Chỉ là mô phỏng tình huống, không tạo seed mặc định để tránh tác dụng phụ | Chờ backend/QA |
| Dùng reset fixtures, transaction rollback hay database test riêng? | Test TC-08/19 cần cô lập theo lần chạy | Chờ backend/QA |

## Tiêu chí nhận bàn giao

- [ ] Phong xác nhận mapping tất cả trường, khóa ngoại, trạng thái và kiểu dữ liệu.
- [ ] IdP test và khóa mã hóa chỉ xuất hiện trong cấu hình môi trường, không đưa vào Git.
- [ ] Nạp bộ cơ sở vào DB test sạch, FK và số lượng khớp manifest.
- [ ] Chạy được GET slots và GET appointment qua API với đúng vai trò.
- [ ] Dùng request `create_prescription.json` tạo DRAFT, `issue_prescription.json` phát hành sau khi đã có Encounter hợp lệ.
- [ ] QA chạy thực tế các ca tương ứng và lưu screenshot/log/PR.

Lưu ý: báo cáo kết quả PASS của validator KHÔNG thay thế các mục này.
