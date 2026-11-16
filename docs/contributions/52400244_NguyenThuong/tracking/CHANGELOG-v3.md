# Changelog v3 – 52400244 Nguyễn Thường

## Cập nhật 17/11/2026 — hợp đồng 1.0.0

- Chuẩn hóa snapshot/hash và 47 ví dụ cho 46 API; kiểm nested schema, header, actor và tham số ngoài contract.
- Generator thêm clinical.http và telehealth.http; file đặt lịch không POST lại availability trùng seed. Giữ ID/version từ response và key retry.
- Viết lại hướng dẫn, runbook và bàn giao; truy vết 24 TC theo BE V1/V2 và FE media hiện tại. Runtime chưa chạy vẫn NOT_RUN; BE-01…04 chưa sửa.
- Giữ fixtures/catalog thiết kế 0.1 và log cũ có nhãn lịch sử. Không import/reset DB hoặc tạo báo cáo/slide DOCX/PPTX.
- Kết quả kiểm tra mới: xem report/backend-validation.md. Các mục bên dưới giữ theo thời điểm ban đầu.

## Phạm vi thực hiện

- **Đã làm:** bổ sung audit READ, kiểm chứng tham chiếu và trạng thái, hoàn thiện API request examples theo 30 operationId, bao gồm không-body; tích hợp contract checks vào PowerShell; ngăn Python caches xuất hiện trong Git; liên kết docs README; cải thiện rebase ngày demo; soạn nội dung báo cáo chương 1–3 và đề cương slide bằng Markdown.
- **Kế hoạch cập nhật ngày 28/10/2026:** chưa bắt đầu thiết kế, chưa có file DOCX/PPTX; dự kiến bắt đầu ngày **29/10/2026**. Đã sửa các ghi nhận sai về Word 6 trang, PowerPoint 13 slide và xuất/render thành công.
- **Điều chỉnh tiếp theo ngày 28/10/2026:** xóa ba file Markdown bản thảo/đề cương báo cáo và slide theo yêu cầu để Nguyễn Thường tự soạn; giữ ma trận và phiếu thu thập minh chứng. Nội dung báo cáo/slide hiện chưa có bản bàn giao.
- **Không thực hiện theo yêu cầu người dùng:** **không chỉnh sửa `docs/project-plan.md`** hay thay đổi ghi nhận đóng góp tuần 1–2. Phần này cần đối chiếu bằng chứng và thống nhất với nhóm.
- **Không chỉnh sửa:** SRS, OpenAPI gốc, ERD, yêu cầu nghiệp vụ, backend/frontend. Dữ liệu không dùng thay seed production.

## Giới hạn kiểm thử

- Fixture validator / JSON schema check / unit tests: kiểm tra tĩnh.
- API runtime, MySQL migration, 24 test case nghiệp vụ, coverage và demo chạy thật: CHƯA kiểm chứng.

## Nguồn liên quan

`docs/requirements/{SRS.md,business-rules.md,acceptance-criteria.md}`, `docs/design/database/data-dictionary.md`, `docs/api/openapi.yaml`, `docs/testing/{test-plan.md,test-cases.md}`.
