# Kiểm chứng hợp đồng API 1.0.0

## Bản đưa lên main — 17/11/2026

Đưa riêng hợp đồng, script kiểm tra/CI hợp đồng và gói đóng góp 52400244 từ baseline main a04dcb1. Không merge nhánh FE gộp/media, không thay backend hoặc migration. Kiểm chứng bản main được ghi tại [main-handover.md](../contributions/52400244_NguyenThuong/report/main-handover.md). BE-01…04 vẫn mở; các số liệu backend/FE bên dưới là lịch sử trên nhánh đóng góp, không phải lần chạy lại trong đợt này.

## Lịch sử kiểm chứng nhánh tích hợp 16/11/2026


Ngày 16/11/2026; nhánh `docs/52400244-demo-data`, đã merge `main` tại `a04dcb1` vào lịch sử nhánh. Hai xung đột tài liệu `docs/frontend-patient.md` và `docs/project-plan.md` được giải quyết theo cập nhật bàn giao từ main; bộ dữ liệu/demo và frontend của nhánh được giữ.

| Kiểm tra thực thi local | Kết quả |
|---|---|
| Backend sau merge: `backend/mvnw.cmd -Dlogging.level.root=WARN -Ddebug=false verify` | BUILD SUCCESS; 49 test, 0 failure, 0 error, 0 skipped; MySQL 8.4/Testcontainers |
| `python scripts/check-api-contract.py` | OpenAPI 3.1.0 hợp lệ; 46 operation/38 path; 48 schema; 34 ví dụ hợp lệ; kiểm method/path, request names, required headers và truy vết FR-01…24 với snapshot |
| `python -m unittest discover -s scripts/tests -p test_api_contract.py -v` | 7/7 đạt; consent, skip version, progress targetStatus, record version/content, prescription fields, audit createdAt, signalingUrl một prefix |
| Công cụ dữ liệu/demo cũ: `docs/contributions/52400244_NguyenThuong/tools/run-checks.ps1` | Fixture 16 nhóm/52 bản ghi hợp lệ; 31/31 unit test đạt; catalog thiết kế cũ 30/30 operation và 20 body hợp lệ; baseline demo snapshot 18/18 operation, 19 request example |

Môi trường local: Windows, Java 24.0.2 (compile release 21), Docker Desktop engine 29.4.0, Python 3.12. Kiểm tra hợp đồng mới dùng virtualenv tạm với dependency từ `scripts/requirements-api-contract.txt`. Snapshot backend có response generic Object/Map nên việc kiểm tra tĩnh không chứng minh response runtime đầy đủ, quyền hoặc trạng thái đúng.

Kết quả đánh giá trước đó trên cùng source backend: 49/49 test có sẵn đạt, nhưng ba probe theo đặc tả thất bại: thiếu audit khi người ngoài bị từ chối join, lễ tân GET availability bị 403, AUDITOR GET doctors được 200. Các mục này vẫn mở trong [backlog](integration-backlog.md), không bị “xóa lỗi” bởi việc hợp thức hóa YAML. Queue-empty204 là thay đổi mục tiêu mới, baseline trả 404.

Frontend ZIP đã kiểm tra ở lần đánh giá trước: 12/12 test logic/mock và production build đạt. Lần chốt hợp đồng này chưa thay hoặc nối ZIP vào các frontend trên nhánh, chưa thực thi E2E qua UI với Keycloak thật và chưa gọi video/audio hai phía. Workflow API contract mới được cấu hình, chưa coi là đã chạy đạt trên GitHub khi chưa có kết quả CI.

Các lệnh trên là kết quả local, không phải số liệu tải/p95, backup/restore hoặc nghiệm thu toàn bộ đặc tả. Cần chạy các test runtime và E2E trong backlog trước khi tuyên bố hệ thống tích hợp xong.
