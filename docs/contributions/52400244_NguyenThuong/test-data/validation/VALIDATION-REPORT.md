# Báo cáo kiểm tra tĩnh v3 – 28/10/2026

**Phạm vi:** bộ fixtures, API catalog và công cụ Python của đóng góp 52400244; không kiểm thử ứng dụng đang chạy.

| Hạng mục | Kết quả | Ý nghĩa |
| --- | --- | --- |
| Fixture validator | PASS | 16 nhóm, 52 bản ghi; tham chiếu, thời gian, trạng thái và audit READ hợp lệ |
| Unit tests | 19/19 PASS | Gồm test cố tình làm hỏng dữ liệu để xác nhận validator phát hiện |
| Contract catalog | 30/30 operations PASS | Có metadata mẫu bao gồm required path/query/header |
| JSON schema | 20 file PASS kỳ vọng | 18 body hợp lệ chính + 2 negative body; `items: []` schema-valid nhưng BR-10 không cho phát hành |
| Rebase ngày | PASS với 17/11/2026 | Dịch 9 slot, 2 lịch tương lai, notification, availability/time-off request; giữ hồ sơ lịch sử |
| Nội dung báo cáo/slide | Nguyễn Thường tự soạn | Đã xóa bản thảo và đề cương Markdown theo yêu cầu; chưa có bản báo cáo/slide bàn giao |
| Thiết kế và xuất/render DOCX/PPTX | CHƯA THỰC HIỆN | Dự kiến bắt đầu thiết kế 29/10/2026; chưa có file, chưa xác nhận số trang/slide hoặc kết quả render |
| MySQL, backend, UI, CI | CHƯA THỰC THI | Không có bằng chứng tích hợp |

## Đối chiếu đặc tả

- Audit fixture `READ_MEDICAL_RECORD` phục vụ TC-12/TC-17, nhưng chưa xác minh được audit phải commit trước khi trả dữ liệu (BR-16) vì backend chưa triển khai trong snapshot.
- Check-in và queue call-next không nhận JSON body theo `docs/api/openapi.yaml`; ví dụ sử dụng path/header metadata.
- Rebase làm mới ngày cho đặt lịch tương lai, **không** tự đảm bảo check-in/join đang trong cửa sổ thời gian cho phép.
- Không tạo `Medication` / kho thuốc ngoài phạm vi `docs/design/database/data-dictionary.md`.
- `docs/project-plan.md` giữ nguyên theo yêu cầu; thông tin ghi nhận đóng góp tuần 1–2 vẫn cần nhóm thống nhất.

## Lệnh kiểm tra lại (từ root)

```powershell
python docs/contributions/52400244_NguyenThuong/tools/validate_demo.py
python -m unittest discover -s docs/contributions/52400244_NguyenThuong/tools -p "test_*.py" -v
python -m pip install -r docs/contributions/52400244_NguyenThuong/tools/requirements-contract.txt
python docs/contributions/52400244_NguyenThuong/tools/validate_contract.py
```

Lưu ý: `run-checks.ps1` đã được cập nhật để chạy cả 3 nhóm kiểm tra; chưa chạy trực tiếp trên Windows trong môi trường hiện tại.
