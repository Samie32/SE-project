# Cập nhật phần đóng góp 52400244

Làm trên `docs/52400244-demo-data`, baseline FE/media `98a02e1`, đã tích hợp main tới `a04dcb1`. Không tự merge main hoặc force-push khi chỉ cập nhật dữ liệu.

1. Kiểm status, fetch và kiểm remote. Workspace giải nén không có .git cần đồng bộ có kiểm diff sang clone.
2. Chạy `tools/run-checks.ps1` và `python scripts/check-api-contract.py` từ root.
3. Chỉ stage phần đóng góp/plan liên quan; không stage .env, token, generated, cache hoặc DB dump.
4. Commit tiếng Việt, mô tả thay đổi và số kiểm tra thực tế. Trong phiên 17/11 chủ nhánh đã yêu cầu cập nhật trên cùng nhánh.
5. Push thông thường, xác minh SHA remote. Remote đổi thì review/tích hợp trước, không force-push. Merge/PR nghiệm thu là bước riêng.

Không dùng `--spec docs/api/openapi.json` làm nguồn chuẩn: đó là snapshot runtime với response schema chưa đủ. Generator mặc định kiểm snapshot hợp đồng chuẩn 1.0.0 và hash YAML.
