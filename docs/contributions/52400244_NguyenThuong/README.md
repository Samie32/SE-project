# 52400244 – Nguyễn Thường | Bộ đóng góp giai đoạn triển khai

**Đề tài:** Outpatient Clinic Telehealth & Appointment Scheduling System (SE-project).  
**Vai trò theo** `docs/project-plan.md`**:** dữ liệu mô phỏng, tổng hợp báo cáo, hướng dẫn sử dụng, slide, kịch bản demo và phối hợp thiết kế kỹ thuật.

## Những gì đã xây dựng (chưa đồng nghĩa tích hợp hệ thống)

- 16 nhóm fixtures JSON, UUID giả lập có thể tái lập; 7 account thuộc 5 vai trò, 2 bệnh nhân, 2 bác sĩ, 2 chuyên khoa, 15 slot và 4 lịch hẹn (2 tương lai, 2 lịch sử).
- Dữ liệu clinical: 2 encounter đã hoàn tất, 2 hồ sơ manifest, 1 đơn ISSUED + 1 item thuốc **chỉ là chuỗi giả lập phi y tế**, 1 queue ticket DONE và 1 telehealth session ENDED.
- 2 notification jobs PENDING, 3 audit events; không lưu mật khẩu, token, liên hệ thật, bệnh án rõ chữ hay thông tin điều trị thật.
- bộ ví dụ API bao phủ mọi operationId trong OpenAPI 3.1 (và JSON body mẫu), đối chiếu kiểu dữ liệu với `docs/api/openapi.yaml`; có 1 request thiếu trường cố ý không hợp lệ.
- 24 test case được truy vết; validator và bộ unittest **kiểm tra tĩnh**. Không có backend chạy, kết quả API, MySQL hay coverage nghiệp vụ 60%.
- Tài liệu sử dụng, kịch bản demo, checklist bàn giao dữ liệu, ma trận/phiếu thu thập minh chứng và nội dung đề xuất Issues/PR. Báo cáo và slide do Nguyễn Thường tự soạn; chưa có file DOCX/PPTX.

## Khởi chạy trên Windows / VS Code

Từ root dự án:

```powershell
python docs/contributions/52400244_NguyenThuong/tools/validate_demo.py
python -m unittest discover -s docs/contributions/52400244_NguyenThuong/tools -p "test_*.py" -v
```

Để chạy toàn bộ kiểm tra tĩnh và schema contract (sẽ cài thêm thư viện cho riêng contract):

```powershell
python -m pip install -r docs/contributions/52400244_NguyenThuong/tools/requirements-contract.txt
python docs/contributions/52400244_NguyenThuong/tools/validate_contract.py
```

Dịch các ngày lịch tương lai mà không sửa fixtures gốc:

```powershell
python docs/contributions/52400244_NguyenThuong/tools/rebase_demo_dates.py --auto-next-business-day
```

Chỉ cần Python 3.10+ (stdlib) cho validator, unittest và rebase; Python phiên bản trên Windows cần có dữ liệu múi giờ IANA để dùng `ZoneInfo` (nếu gặp `ZoneInfoNotFoundError`, chạy `python -m pip install -r docs/contributions/52400244_NguyenThuong/tools/requirements-windows.txt`). Kết quả `PASS` của các lệnh này chỉ là **cấu trúc dữ liệu giả lập**.

### Chạy một lần toàn bộ kiểm tra tĩnh (PowerShell)

Từ root repository:

```powershell
python -m pip install -r docs/contributions/52400244_NguyenThuong/tools/requirements-contract.txt
& "docs/contributions/52400244_NguyenThuong/tools/run-checks.ps1"
```

Nếu PowerShell trên máy đang chặn thực thi script, hãy chạy lần lượt ba lệnh Python trong phần đầu README; không cần đổi ExecutionPolicy toàn máy. **Chưa xác nhận script trên Windows ở môi trường thực tế**, nhưng cả ba thành phần Python đã chạy đạt độc lập.

## Không thực hiện trong phạm vi đóng góp này

- Không chỉnh `backend/`, `frontend/`, `docs/requirements/`, `docs/api/` hoặc migration nhóm.
- Không tự xây danh mục thuốc, tồn kho hay thêm `Medication` vì mô hình chính có `Prescription` và `PrescriptionItem` lưu `medicine_name`.
- Không tạo seed SQL chạy production; bộ JSON cần được Phong map vào migration, tạo dữ liệu mã hóa và tài khoản IdP thử nghiệm.
- Không tự nhận đã kiểm thử 24 TC, vận hành video/email hay triển khai CI.

## Tài liệu ưu tiên đọc

1. `test-data/README.md` – cấu trúc, quy ước và thứ tự tích hợp.
2. `test-data/scenarios/traceability.csv` – 24 TC, phân loại fixture hoặc cần runtime.
3. `tracking/handover-backend.md` – vấn đề cần xác nhận với chủ backend.
4. `demo/demo-runbook.md` – kịch bản demo không dựa vào dữ liệu giả làm kết quả chạy.
5. `tracking/github-issues.md` – cách ghi nhận đóng góp cá nhân.

**Nguồn chuẩn:** `docs/requirements/{SRS.md,business-rules.md}`, `docs/design/database/data-dictionary.md`, `docs/api/openapi.yaml`, `docs/testing/{test-cases.md,test-plan.md}`.

## Cập nhật v3 – các mục đã sửa

- Bổ sung audit `READ_MEDICAL_RECORD` và unit test phát hiện thiếu bản ghi.
- Thêm catalog đầy đủ tất cả OpenAPI operationId, request bodies hợp lệ và ví dụ endpoint không có JSON body.
- `run-checks.ps1` chạy **cả** kiểm tra fixture, unittest và OpenAPI; thiếu dependency contract thì **báo FAIL**, không bỏ qua.
- Bổ sung `.gitignore` ở root cho `__pycache__/`, `*.pyc` và dữ liệu sinh ra.
- Có link tại `docs/README.md`; `docs/project-plan.md` được **giữ nguyên theo yêu cầu**.
- Hướng dẫn tự cập nhật lịch demo; ma trận và phiếu thu thập minh chứng ở `report/`.
