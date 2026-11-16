# 52400244 – Nguyễn Thường | Dữ liệu và kịch bản demo

Cập nhật **17/11/2026** theo [hợp đồng BE–FE 1.0.0](../../api/integration-contract.md), BE `main@a04dcb1`, FE/media `98a02e1`. Nhiệm vụ: dữ liệu mô phỏng, công cụ kiểm tra, hướng dẫn sử dụng, kịch bản demo và tổng hợp minh chứng. Đợt này không thay nghiệp vụ BE.

## Chọn đúng bộ dữ liệu

| Bộ | Mục đích | Cách sử dụng |
|---|---|---|
| [test-data/backend](test-data/backend/README.md) | Chuẩn API hiện tại: 46 thao tác, 47 ví dụ | Dùng cho demo BE; sinh ngày mới, lấy ID/version từ response |
| `test-data/fixtures`, `api-examples`, `scenarios` | Thiết kế 0.1 lịch sử: 16 nhóm, 30 thao tác | Đối chiếu mô hình; có ADMIN/TELEHEALTH/snake_case, không gửi/import vào BE hiện tại |
| [Demo runbook](demo/demo-runbook.md) | Đặt lịch, trực tiếp, clinical, từ xa, audit | Chạy từng bước, ghi kết quả thực tế |
| [Báo cáo kiểm tra](report/backend-validation.md) | Bằng chứng static checks đợt này | Tách khỏi nghiệm thu HTTP/MySQL và TURN |

## Sinh request đúng ngày demo

Từ root dự án, Python 3.10+:

```powershell
python -m pip install -r docs/contributions/52400244_NguyenThuong/tools/requirements-contract.txt
python docs/contributions/52400244_NguyenThuong/tools/backend_demo.py --check
python docs/contributions/52400244_NguyenThuong/tools/backend_demo.py
```

Đầu ra `test-data/generated/backend-YYYY-MM-DD/`: `requests.json` phủ API, `demo.http` cho đặt/đổi/hủy, `clinical.http` cho check-in → queue → hồ sơ/đơn → hoàn tất, `telehealth.http` cho vòng đời phòng. Python chỉ tạo file, không gửi HTTP. Đọc README backend và comment từng file trước khi chạy REST Client.

Ngày mặc định là ngày tương lai UTC+7, thứ Hai–thứ Bảy, bỏ Chủ nhật. Đổi bằng `--date YYYY-MM-DD`. Ngày tương lai dùng cho booking, không tự đáp ứng cửa sổ check-in/join/start. Không đổi đồng hồ hoặc insert SQL để vượt quy tắc.

## Kiểm tra

```powershell
& ./docs/contributions/52400244_NguyenThuong/tools/run-checks.ps1
python scripts/check-api-contract.py
```

Validator fixtures/catalog thiết kế vẫn kiểm riêng bản 0.1 lưu trữ. Validator backend kiểm snapshot/hash và schema lồng nhau của chuẩn 1.0.0. Kết quả tĩnh không chứng minh transaction, phân quyền hoặc media với BE thật.

BE đã có queue/clinical/signaling/audit, migration V1/V2; FE gộp có WebRTC hai phía. Các ghi nhận 04/11 “chưa có API clinical/queue/video” chỉ còn giá trị lịch sử. [BE-01…04](../../api/integration-backlog.md), E2E Keycloak → FE → BE → MySQL và TURN qua hai mạng vẫn cần nghiệm thu.

Seed chuẩn: 6 tài khoản, 2 bệnh nhân, 1 bác sĩ, 1 chuyên khoa. Profile demo tạo lịch 08:00–12:00 IN_PERSON, 13:00–17:00 REMOTE trong 7 ngày tiếp theo, bỏ Chủ nhật; không tạo sẵn appointment, hồ sơ hoặc đơn. Không ghi mật khẩu/token vào tài liệu hoặc commit.

Báo cáo/slide DOCX/PPTX do Nguyễn Thường tổng hợp; đợt này không tạo hoặc xác nhận các file đó. Xem [checklist bàn giao](CHECKLIST.md), [minh chứng kiểm tra](report/backend-validation.md) và [24 TC](test-data/backend/traceability.csv).

## Phạm vi đưa lên main

Chỉ bàn giao bộ dữ liệu/công cụ/tài liệu của 52400244 và hợp đồng API theo yêu cầu. FE gộp/media tại `98a02e1` vẫn nằm trên nhánh tích hợp, không được chuyển vào main trong đợt này. Hướng dẫn UI là bản theo source của nhánh đó; chưa phải xác nhận UI/E2E trên main. Phiếu thu thập minh chứng nhóm và đề xuất Issue chưa thực hiện được giữ riêng trên nhánh đóng góp.
