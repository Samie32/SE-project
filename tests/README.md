# Testing

## Cấu trúc

```text
tests/
├── backend/                 # Bản sao test JUnit và test resources
├── frontend_patient/        # Bản sao test Vitest
├── python/                  # Test API contract và kiểm tra test pack
│   └── legacy/              # Kiểm tra fixtures và hợp đồng tại mốc bàn giao cũ
├── k6/                      # Smoke, load và appointment contention
└── README.md
```

## Nguồn thực thi và bàn giao QA

Xem [báo cáo bàn giao cho Vũ Đức Thắng](../docs/testing/reports/2026-11-19-test-report.md) để chọn ca theo mã RG, FR/NFR, nhóm nghiệp vụ và mức kiểm thử. Các thư mục `tests/backend/` và `tests/frontend_patient/` giữ bản sao của gói bàn giao cũ. Maven và Vitest chạy nguồn hiện hành trong `backend/src/test/` và `frontend/tests/`.

### Backend Java (từ `backend/`)

```powershell
.\mvnw.cmd -B verify
```
```test
file xuất nằm ở backend/target/surefire-reports/
backend/target/site/jacoco/index.html
```

### Frontend đa vai trò (từ `frontend/`)

```powershell
npm ci
npm test
npm run typecheck
npm run build
npm run test:rtc
npm run test:scan
```

Trên stack demo riêng đã chạy, đặt `CLINIC_QA_BASE_URL` và `CLINIC_QA_DEMO_PASSWORD` cho phiên chạy, rồi dùng `npm run test:auth-runtime` để kiểm thử đăng nhập Keycloak cho năm vai trò. Dùng mật khẩu tài khoản demo và lưu kết quả trong `frontend/test-results/runtime/`.
```test
frontend/test-results/
```

### Python API  (từ thư mục gốc)

```powershell
python scripts/check-api-contract.py
python -m unittest discover -s scripts/tests -v
python -m unittest discover -s tests/python -v
```

`tests/python/legacy/` kiểm tra snapshot hợp đồng cũ. Chạy nhóm này với `docs/api/openapi.yaml` từ `eb568ad` theo checksum đã ghi trong gói đóng góp. Dùng thư mục tạm để giữ nguyên hợp đồng hiện hành:

```powershell
$legacy = Join-Path $env:TEMP ('cliniccare-legacy-' + (New-Guid).ToString())
New-Item -ItemType Directory "$legacy/docs/contributions", "$legacy/docs/api", "$legacy/tests/python" | Out-Null
Copy-Item -Recurse docs/contributions/52400244_NguyenThuong "$legacy/docs/contributions"
Copy-Item -Recurse tests/python/legacy "$legacy/tests/python"
python -B -c "import pathlib,subprocess,sys; pathlib.Path(sys.argv[1]).write_bytes(subprocess.check_output(['git','show','eb568ad:docs/api/openapi.yaml']))" "$legacy/docs/api/openapi.yaml"
python -B -m unittest discover -s "$legacy/tests/python/legacy" -v
```

### k6 (từ thư mục gốc)

```powershell
k6 run tests/k6/api-smoke.js
k6 run tests/k6/appointment-load.js
k6 run tests/k6/appointment-contention.js
```

Chạy trên stack thử nghiệm với dữ liệu mô phỏng. Cấu hình `BASE_URL` và `ACCESS_TOKEN`. Bài tải đọc thêm `APPOINTMENT_DATE`. Bài tranh chấp cần `PATIENT_TOKEN_A`, `PATIENT_TOKEN_B` của hai bệnh nhân khác nhau và `SLOT_ID` chưa được đặt. Mặc định bài tranh chấp dùng 100 yêu cầu và xác minh đúng một lượt thành công. Dùng slot mới cho mỗi lần chạy.
