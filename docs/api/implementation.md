# Hướng dẫn triển khai và tích hợp API

Từ 16/11/2026, sử dụng [hợp đồng BE–FE 1.0.0](integration-contract.md), [OpenAPI YAML](openapi.yaml) và [backlog tích hợp](integration-backlog.md).

- Khởi động backend, dữ liệu local và giới hạn triển khai: [backend-completion.md](../backend-completion.md).
- Snapshot controller hiện tại: [openapi.json](openapi.json). Snapshot không thay thế response schema đã chốt trong YAML.
- Tài liệu API tuần 3–4 đã được giữ tại [archive/implementation-week-03-04.md](archive/implementation-week-03-04.md); các ghi chú “chưa có API clinical/queue/signaling” trong đó là lịch sử.

BE và FE sửa song song theo backlog rồi kiểm chứng từng luồng. Queue/next hết người trả 204 là mục tiêu cần BE-04; hiện backend vẫn trả 404. Các lỗi quyền/audit cũng chưa được sửa trong lần chốt hợp đồng này.
