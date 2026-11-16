# API: hợp đồng tích hợp BE–FE

**Nguồn chuẩn từ 16/11/2026:** [hợp đồng tích hợp 1.0.0](integration-contract.md) và [OpenAPI YAML](openapi.yaml), gồm 46 thao tác trên 38 đường dẫn, với kiểu request/response, header, quyền và truy vết 24 FR.

| Tài liệu | Mục đích |
|---|---|
| [integration-contract.md](integration-contract.md) | Các quyết định đã chốt: tên trường, danh tính, retry, version, queue, clinical, audit, signaling và cách FE nối |
| [openapi.yaml](openapi.yaml) | Hợp đồng máy đọc 1.0.0; nguồn chuẩn cho adapter mới |
| [integration-backlog.md](integration-backlog.md) | BE-01…04 và phần FE/E2E còn phải thực hiện; không phải kết quả đã sửa |
| [contract-verification.md](contract-verification.md) | Kết quả kiểm tra local sau merge, phạm vi và giới hạn bằng chứng |
| [openapi.json](openapi.json) | Snapshot sinh từ backend; nhiều response Object/Map chưa có kiểu chi tiết; không dùng ghi đè hợp đồng YAML |
| [Hướng dẫn backend](../backend-completion.md) | Khởi động và hành vi baseline, giới hạn media/SMTP |
| [archive/openapi-design-0.1.yaml](archive/openapi-design-0.1.yaml) | Thiết kế cũ 30 thao tác dùng đối chiếu fixture lịch sử |
| [archive/implementation-week-03-04.md](archive/implementation-week-03-04.md) | Tài liệu tuần 3–4 giữ làm lịch sử; không hướng dẫn adapter mới |

API local `http://localhost:8080/api`; FE gọi `/api/...` qua proxy trên cổng 5173. OIDC client `clinic-web`, realm `clinic`, audience `clinic-api`. Danh tính nghiệp vụ lấy `/me/profile`; giờ trả UTC, UI hiển thị Asia/Ho_Chi_Minh.

Tên trường chốt: `consent`, `createdAt`, `targetStatus`, `version`, `doseText`, `durationText`. Queue list ở `/doctors/{id}/queue?date=...`; bản nháp lấy qua endpoint encounter. Lỗi ứng dụng là ProblemDetail; mã liên kết ở `X-Request-Id`, không phải `correlationId` trong body lỗi.

**Phạm vi main 17/11/2026:** chỉ đưa bộ hợp đồng và phần dữ liệu/tài liệu 52400244; không thay FE/BE. FE gộp/media trên nhánh tích hợp chưa chuyển vào main trong đợt này.

**Tài liệu chốt không đồng nghĩa backend đã đạt toàn bộ:** audit từ chối, ma trận quyền đọc và queue rỗng 204 còn trong backlog. Chưa nối ZIP vào các frontend hiện có và chưa nghiệm thu video/audio hai phía.

## Kiểm tra hợp đồng

```powershell
python -m pip install -r scripts/requirements-api-contract.txt
python scripts/check-api-contract.py
python -m unittest discover -s scripts/tests -p 'test_api_contract.py' -v
```

Workflow [API contract](../../.github/workflows/api-contract.yml) chạy các kiểm tra này khi hợp đồng thay đổi. Kiểm tra tĩnh không thay thế test API, phân quyền, giao dịch MySQL và E2E.
