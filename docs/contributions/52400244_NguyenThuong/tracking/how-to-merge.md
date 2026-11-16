# Cập nhật phần đóng góp 52400244

Nhánh chuẩn bị là `docs/52400244-demo-data`, baseline FE/media `98a02e1`. Ngày 17/11 người phụ trách yêu cầu đưa riêng phần hoàn thành của 52400244 và hợp đồng lên main. Dùng checkout từ main mới nhất rồi lấy các đường dẫn được chọn; không merge toàn nhánh vì sẽ kéo cả FE/BE ngoài phạm vi.

1. Kiểm status, fetch và kiểm remote. Workspace giải nén không có .git cần đồng bộ có kiểm diff sang clone.
2. Chạy `tools/run-checks.ps1` và `python scripts/check-api-contract.py` từ root.
3. Chỉ stage gói đóng góp hoàn thành, phần ghi nhận 52400244 trong project-plan và bộ hợp đồng/script/test/workflow hợp đồng. Không stage mã FE/BE, Compose, .env, token, generated, cache hoặc DB dump.
4. Commit tiếng Việt, mô tả thay đổi và số kiểm tra thực tế; checklist không đánh dấu báo cáo/slide hoặc E2E khi chưa có bằng chứng.
5. Push thông thường vào main theo yêu cầu đã được cấp; xác minh SHA remote. Nếu remote đổi thì review/tích hợp trước, không force-push. Nếu nhánh được bảo vệ thì tạo PR cùng phạm vi và báo lại trạng thái thực tế.

Không dùng `--spec docs/api/openapi.json` làm nguồn chuẩn: đó là snapshot runtime với response schema chưa đủ. Generator mặc định kiểm snapshot hợp đồng chuẩn 1.0.0 và hash YAML.
