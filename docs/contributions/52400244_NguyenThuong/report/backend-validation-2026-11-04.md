# Đính chính và kết quả kiểm tra phần 52400244

Ngày kiểm tra: **04/11/2026**. Phạm vi chỉ gồm dữ liệu, công cụ và tài liệu của 52400244; không thay backend, đặc tả chung hoặc dữ liệu nghiệp vụ.

## Kết quả hiện hành

Phần đóng góp đã được push tại `docs/52400244-demo-data@f9193d9`, trên nền main `b10e096`. Các đính chính trong lượt này được chuẩn bị thành commit local mới và chờ chủ nhánh xác nhận trước khi push. Push không đồng nghĩa merge hoặc nghiệm thu.

Contract backend có **18 thao tác riêng biệt**, bundle có **19 ví dụ request** vì tạo availability có hai ví dụ IN_PERSON/REMOTE. Công cụ trước đây ghi cố định 19 thao tác; các ghi nhận 19 API/20 ví dụ trước đây sai về số lượng và được thay bằng số đếm theo contract/bundle thực tế. Bộ thiết kế toàn hệ thống vẫn có 30 thao tác và 20 body samples; không trộn hai bộ này.

Windows PowerShell, Python 3.12.8. Log lần đính chính: [static-checks-2026-11-04-correction.log](static-checks-2026-11-04-correction.log).

| Lệnh hoặc nhóm kiểm tra | Kết quả thực thi | Phạm vi chứng minh |
| --- | --- | --- |
| tools/run-checks.ps1 | PASS, exit 0 | Chạy đủ bốn bước kiểm tra tĩnh trong gói |
| validate_demo.py | PASS, 16 nhóm, 52 bản ghi | Nhất quán cấu trúc/quan hệ của fixtures thiết kế |
| unittest discover với test_*.py | 31 test, OK | 19 test bộ thiết kế và 12 test backend demo |
| validate_contract.py | PASS, 30/30 thao tác, 20 body samples | Request theo contract thiết kế, gồm negative samples |
| backend_demo.py --check | PASS, 18/18 thao tác, 19 ví dụ | Schema/tham số/header và độ phủ thao tác của snapshot backend |
| backend_demo.py --check --spec docs/api/openapi.json | PASS, 18/18 thao tác, 19 ví dụ | Cùng bộ request được đối chiếu contract main trong workspace |

Bốn regression bổ sung kiểm số đếm ở CLI, bỏ ví dụ trùng vẫn giữ độ phủ, thiếu thao tác không báo PASS và contract có thao tác mới phải có ví dụ. Trước khi sửa thông báo, ba regression thất bại đúng lỗi số đếm; kiểm thiếu thao tác đã đạt và được giữ làm bảo vệ. Sau sửa, toàn bộ 31 test đạt.

Đã kiểm tra không sửa log cũ. Schema đúng và test công cụ đạt **không chứng minh** request đã chạy qua Spring Boot, phân quyền, MySQL, email, transaction hay race condition.

## Chưa kiểm chứng

- Chưa chạy Compose, Maven/Testcontainers hoặc smoke API trong lượt này; không ghi kết quả runtime mới.
- Lần kiểm tra môi trường trước không kết nối được Docker daemon. Đây là lịch sử, không xác nhận trạng thái Docker hiện tại.
- demo.http đã được kiểm nội dung và biến ID/version từ response, chưa chạy trong extension REST Client ở phiên này.
- 24 TC nghiệp vụ vẫn NOT_RUN hoặc BLOCKED theo traceability; không suy ra coverage nghiệp vụ từ 31 test dữ liệu/công cụ.
- Seed backend mặc định có một bác sĩ/một chuyên khoa; chưa tạo bổ sung quy mô hai bác sĩ/hai chuyên khoa qua hệ thống thật.
- Báo cáo đồ án và slide do Nguyễn Thường tự soạn; chưa có bản bàn giao trong repo, chưa xác nhận tiến độ ngoài repo.

## Nguồn và lịch sử chuẩn bị

Backend nguồn: `main@b10e0960a6a48225b5c26af60c737dbd1c37968f`. Gói đóng góp ban đầu: `docs/52400244-demo-data@1104fdb970233a396df1ee76af37e155496ffc55`. Metadata/hash snapshot ở `test-data/backend/source.json` được giữ nguyên vì contract không thay đổi.

[static-checks.log](static-checks.log) giữ nguyên stdout lịch sử của lần chạy 27 test; dòng ghi 19 operations trong đó là lỗi thông báo cũ, không phải số lượng đúng hiện tại. [Báo cáo 28/10](../test-data/validation/VALIDATION-REPORT.md) là bản lưu lịch sử riêng.

Workspace ban đầu là bản giải nén không có .git/backend; sau đó đã được thay bằng clone thật. Backup trên máy: `C:/Users/josep/OneDrive/Documents/Máy tính/SE-project-backup-8207ddd4`, thư mục `original-files` giữ các tệp trước khi thay. Backup tạm đầu tiên ở `C:/Users/josep/AppData/Local/Temp/se-project-review-9852174b8dc143929373403bb3050ad9/local-52400244-before`; không giả định các đường dẫn máy cá nhân này có trên máy khác.

## Handoff tiếp theo

Phần đính chính của 52400244 hoàn thành sửa và kiểm tra tĩnh; việc push thực hiện sau khi chủ nhánh xác nhận, không tự tuyên bố nghiệm thu. Chưa sửa đặc tả hoặc code chung.
