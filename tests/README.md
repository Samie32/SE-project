# Testing

## Cấu trúc

```text
tests/
├── backend/                 # Bản sao test JUnit và test resources
├── frontend_patient/        # Bản sao test Vitest
├── python/                  # Test API contract và kiểm tra test pack
│   └── legacy/              # Các regression/demo test hiện có trong gói tập trung
├── k6/                      # Smoke, load và appointment contention
└── README.md
```

## Lưu ý về cách chạy

Các file trong `tests/` là bản sao tập trung để tra cứu/bàn giao. Vì cấu hình gốc được giữ nguyên, các runner hiện tại vẫn sử dụng vị trí test ban đầu trong `backend/src/test/`, `frontend/frontend_patient/tests/` và `scripts/tests/`. Chạy theo cấu hình sẵn có của từng thành phần:

### Backend Java (từ `backend/`)

```powershell
.\mvnw.cmd -B verify
```
```test
file xuất nằm ở backend/target/surefire-reports/
backend/target/site/jacoco/index.html
```

### Frontend patient (từ `frontend/frontend_patient/`)

```powershell
npm install
npm test
```
```test
file xuất nằm ở frontend/frontend_patient/tests/
```

### Python API  (từ thư mục gốc)

```powershell
python scripts/check-api-contract.py
python -m unittest discover -s scripts/tests -p "test_api_contract.py" -v
```

### k6 (từ thư mục gốc)

```powershell
k6 run tests/k6/api-smoke.js
k6 run tests/k6/appointment-load.js
k6 run tests/k6/appointment-contention.js
```

### Danh sách lỗi

```text
BE-01: Thiếu audit DENIED khi người ngoài truy cập phòng.
BE-02: Quyền GET availability/time-off của lễ tân.
BE-03: Quyền đọc doctors/specialties/slots của AUDITOR.
BE-04: Xử lý hàng đợi rỗng bằng HTTP 204.
Các mục E2E, tải, bảo mật và WebRTC còn chờ xác minh.
```
