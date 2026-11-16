# Bàn giao phần hoàn thành 52400244 và hợp đồng lên main

Ngày **17/11/2026**, baseline `main@a04dcb159007ef35daadfdb67f835576f0a05a7b`. Người phụ trách yêu cầu đưa riêng phần hoàn thành của Nguyễn Thường (52400244), bổ sung hợp đồng và cập nhật checklist; không merge toàn bộ nhánh tích hợp.

## Phạm vi thay đổi

- Gói dữ liệu/công cụ/hướng dẫn/runbook đã chuẩn bị tại `docs/contributions/52400244_NguyenThuong/`.
- Hai ghi nhận sản phẩm, hai dòng tiến độ thuộc 52400244 và checklist riêng trong `docs/project-plan.md`; không đổi trạng thái hoặc phân công thành viên khác.
- `docs/api/`: hợp đồng 1.0.0, snapshot thiết kế cũ được giữ làm tham chiếu, backlog và bằng chứng kiểm hợp đồng; script/test/dependency cùng workflow CI hợp đồng.
- Không chuyển mã FE/BE/media, migration, Compose, cấu hình môi trường hoặc CI backend/frontend. Tài liệu media ở nhánh tích hợp chỉ được dẫn liên kết, không xác nhận main đã chứa mã đó.
- Phiếu thu thập minh chứng nhóm và đề xuất Issue chưa thực hiện giữ riêng trên nhánh đóng góp. Báo cáo/slide DOCX/PPTX và nghiệm thu runtime vẫn chưa hoàn thành trong checklist.

## Kiểm chứng trên cây chuẩn bị từ main

| Lệnh | Kết quả thực thi |
|---|---|
| tools/run-checks.ps1 | PASS, exit 0; 40 test dữ liệu/công cụ; fixtures 16 nhóm/52 bản ghi; catalog thiết kế 30 API/20 body; catalog hiện tại 46 API/47 ví dụ |
| scripts/check-api-contract.py | PASS, 46 thao tác/38 đường dẫn/48 schema; 34 ví dụ hợp lệ; request surface khớp snapshot baseline |
| unittest scripts/tests/test_api_contract.py | 7 test, OK |

Môi trường: Windows PowerShell/Python 3.12; kiểm hợp đồng chung dùng venv tạm ngoài repository. [Log kiểm bản main](main-handover-checks-2026-11-17.log) lưu stdout kiểm tra. Không chạy lại backend/MySQL, FE, TURN hoặc E2E vì đợt này không chuyển mã triển khai.

## Đính chính dữ liệu tiến độ

TC-15 trước đây ghi chưa có reminder là lỗi đối chiếu. `AppointmentService` đã tạo REMINDER tại `startAt - 1800 giây`; `NotificationWorker` xử lý và bỏ job cũ theo trạng thái/version. Truy vết đổi thành IMPLEMENTED/NOT_RUN; không dùng việc đọc code để ghi PASS runtime. Không chỉnh mã backend hoặc nhận phần triển khai của thành viên khác.

BE-01…04, ảnh UI thực tế, dữ liệu đã nạp, kiểm thử toàn trình và báo cáo/slide vẫn cần bằng chứng riêng. Cấu hình workflow không đồng nghĩa CI GitHub đã chạy thành công.
