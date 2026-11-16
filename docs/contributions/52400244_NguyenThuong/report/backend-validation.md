# Kiểm chứng bộ đóng góp 52400244 — 17/11/2026

Nguồn chuẩn: hợp đồng 1.0.0 `docs/api/openapi.yaml`; baseline BE `main@a04dcb1`, FE/media `98a02e1`. Phạm vi: dữ liệu mẫu, generator, tài liệu và kiểm tra tĩnh; không thay nghiệp vụ BE hoặc nhập/reset DB.

## Kết quả thực thi

Windows PowerShell, Python 3.12. Log mới: [static-checks-2026-11-17.log](static-checks-2026-11-17.log). Log cũ giữ nguyên; báo cáo 04/11 được lưu tại [backend-validation-2026-11-04.md](backend-validation-2026-11-04.md), số lượng/phạm vi ở đó là lịch sử.

| Kiểm tra | Kết quả | Ý nghĩa |
|---|---|---|
| tools/run-checks.ps1 | PASS, exit 0 | Đủ 4 bước tĩnh |
| validate_demo.py | PASS, 16 nhóm/52 bản ghi | Thiết kế 0.1 nhất quán, không phải seed BE |
| unittest discover tools/test_*.py | 40 test OK | 19 test thiết kế, 12 test backend cũ đã cập nhật, 9 regression chuẩn hiện tại |
| validate_contract.py | 30/30 thao tác, 20 body samples | Chỉ hợp đồng thiết kế 0.1 lưu trữ, gồm negative samples |
| backend_demo.py --check | 46/46 thao tác, 47 request examples | Snapshot chuẩn 1.0.0, required params/header, nested schema, catalog tĩnh |
| backend_demo.py | PASS, sinh backend-2026-11-18 | Có requests.json và 3 file HTTP; không gửi request |
| scripts/check-api-contract.py | PASS, 46 thao tác/38 path/48 schema/34 ví dụ | Chuẩn dự án so với request surface baseline; không sửa YAML |
| scripts/tests/test_api_contract.py | 7 test OK | Quy tắc payload hợp đồng chung |

Hai lệnh kiểm chuẩn dự án dùng venv tạm bên ngoài repo và dependencies từ scripts/requirements-api-contract.txt; không đổi môi trường Python toàn cục. Script kiểm gói dùng tools/requirements-contract.txt đã có trong môi trường. Chưa chạy CI GitHub cho commit mới tại thời điểm ghi báo cáo.

## Thay đổi đã kiểm

- Mở rộng từ 18 API tuần 3–4 lên 46 API chuẩn; 47 ví dụ do availability có hai mode. Snapshot dẫn nguồn YAML chuẩn, prefix /api chỉ một lần, hash chuẩn hóa LF/CRLF.
- Regression mới kiểm nested prescription thiếu doseText, header phòng/idempotency thiếu, actor/query ngoài contract, hash contract đổi, độ phủ/catalog, profile/role đúng và HTTP dùng ID/version response. Tám test chuẩn mới cùng một test hash drift thành 9 test; các test cũ cập nhật số đếm/ngày cho chuẩn mới.
- File booking không POST availability trùng seed. Clinical dùng encounterId từ appointment detail, current version cho FINAL; telehealth lấy room token từ join response. Generated giữ token qua environment, không nhúng credential.
- Runbook, hướng dẫn, bàn giao và truy vết 24 TC theo V1/V2 hiện tại; bảo toàn fixtures/catalog 0.1 và log cũ có nhãn lịch sử.

## Giới hạn

Schema-valid không đồng nghĩa business-valid. Các UUID mẫu không phải bản ghi đã seed; không chạy requests.json hàng loạt. Ngày tương lai không tự đủ điều kiện check-in/join/start; phải chuẩn bị lịch đúng giờ. Runtime TC vẫn NOT_RUN, riêng nhắc định kỳ TC-15 còn BLOCKED vì chưa triển khai.

Không chạy Keycloak → FE → BE → MySQL, fault injection audit, race booking, camera vật lý hoặc TURN hai mạng trong đợt này. BE-01…04 vẫn mở. Các test media cục bộ của đợt FE trước ở docs/frontend-unified.md không thay nghiệm thu tích hợp. Không xác nhận merge main hoặc tạo báo cáo/slide DOCX/PPTX.
