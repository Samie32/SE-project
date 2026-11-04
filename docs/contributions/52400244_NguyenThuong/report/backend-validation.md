# Kết quả đối chiếu backend — 04/11/2026

## Cập nhật workspace theo yêu cầu tiếp theo

Đã clone main mới nhất vào chính workspace, khôi phục đóng góp từ nhánh 52400244 và áp dụng bản sửa. Nền main là `b10e096`, remote origin trỏ tới Samie32/SE-project. Theo yêu cầu tiếp theo của chủ nhánh, dùng lại tên `docs/52400244-demo-data` cho lịch sử mới dựa trên main; commit local bằng tiếng Việt và chờ xác nhận trước khi push. Đã chạy toàn bộ 27 test, kiểm contract thiết kế và 19 API backend ngay tại workspace: đạt.

Backup đầy đủ workspace trước khi thay: `C:/Users/josep/OneDrive/Documents/Máy tính/SE-project-backup-8207ddd4`. Thư mục `original-files` trong backup giữ nguyên các tệp gốc đã di chuyển. Các mô tả thiếu `.git`/backend bên dưới ghi lại trạng thái trước khi clone; chưa chạy API/MySQL thật.

## Đã xác nhận từ nguồn

- Backend được đọc bằng Git tại `main@b10e0960a6a48225b5c26af60c737dbd1c37968f`, bao gồm controller/service, migration, seed, auth, error handler, realm và bộ integration test.
- Phần đóng góp lấy từ `docs/52400244-demo-data@1104fdb970233a396df1ee76af37e155496ffc55`; backend code hiện tại triển khai tuần 3–4, không phải đủ chín phân hệ.
- Workspace không có `.git`, backend/frontend rỗng. Không thay code của thành viên khác, không commit/push/merge GitHub.
- Bản sao local trước khi cập nhật: `C:/Users/josep/AppData/Local/Temp/se-project-review-9852174b8dc143929373403bb3050ad9/local-52400244-before`. Đây là backup tạm trên máy này; cần giữ riêng nếu dọn thư mục Temp.
- Những file chỉ thuộc bản local cũ (validator/ma trận cũ, report/slide outlines...) đã bỏ khỏi gói để khớp nhánh 52400244. Bản remote có ghi Nguyễn Thường tự viết báo cáo/slide; phiên này giữ nguyên phạm vi đó.

## Đã chạy

Windows PowerShell, Python 3.12.8. Log đầy đủ: [static-checks.log](static-checks.log).

| Kiểm tra | Kết quả | Ý nghĩa |
| --- | --- | --- |
| `tools/run-checks.ps1` | PASS, exit 0 | Chạy toàn bộ kiểm tra tĩnh trong gói |
| `validate_demo.py` | PASS: 16 nhóm, 52 bản ghi | Dữ liệu thiết kế nhất quán nội bộ |
| `python -m unittest discover ... -p test_*.py -v` | 27 test, OK | 19 test gốc + 8 regression backend |
| `validate_contract.py` | PASS: 30/30 operations, 20 body samples | Contract thiết kế; không đồng nghĩa API đã triển khai |
| `backend_demo.py --check` | PASS: 19 operations, 20 examples | Schema, required params/header, enum/role/version/body backend |
| `backend_demo.py --check --spec <clone-main>/docs/api/openapi.json` | PASS | Request đối chiếu thêm contract từ clone main |
| `backend_demo.py --date 2026-11-10` | Sinh requests.json và demo.http | Đã đọc bản sinh, ID/version được lấy qua response |

Regression mới kiểm ngày UTC+7 qua nửa đêm, Chủ nhật/quá khứ, camelCase/enum/version=0, body/tham số/header thiếu, field dư, operation thiếu, idempotency key replay và hash snapshot LF/CRLF. Đã quan sát test ngày và test hash thất bại trước khi sửa, sau đó đạt. Đồng thời sửa script PowerShell để stderr tiến độ của unittest không bị coi là lỗi khi ghi log.

## Chưa kiểm chứng

- `docker version` không kết nối được `dockerDesktopLinuxEngine`; Docker daemon chưa chạy. Chưa chạy Compose, Spring Boot, MySQL, Keycloak, Mailpit hoặc Maven/Testcontainers tại phiên này.
- Chưa thực thi request trong demo.http hoặc scripts/smoke.py; chưa xác nhận OIDC/quyền/transaction/race/email trên môi trường thật. Template REST Client đã được kiểm nội dung, chưa chạy trong extension.
- Các status trong [traceability backend](../test-data/backend/traceability.csv) đều NOT_RUN hoặc BLOCKED. Bộ JSON/contract đạt không làm 24 TC thành PASS và không chứng minh coverage nghiệp vụ.
- Chưa tạo backend seed cho 2 bác sĩ/2 chuyên khoa. Dùng manifest đúng seed hiện tại; hướng dẫn bổ sung qua IdP/API nằm trong backend/README.md.

## Đối chiếu yêu cầu

FR-BE-01 và FR-BE-02: đã kiểm tĩnh bằng schema/regression. FR-BE-03: HTTP demo dùng ID/version từ response và không chứa secret; chờ chạy thật. FR-BE-04: README, bàn giao, demo, hướng dẫn và ma trận 24 TC đã cập nhật theo phạm vi backend.

Phần sửa dữ liệu/tài liệu/công cụ chuẩn bị đã hoàn tất. Tích hợp runtime **chưa được xác minh**; bước tiếp theo là bật Docker Desktop trong clone có main, chạy smoke của backend rồi demo.http theo hướng dẫn.
