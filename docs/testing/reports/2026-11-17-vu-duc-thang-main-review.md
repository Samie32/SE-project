# Rà soát bàn giao kiểm thử Vũ Đức Thắng trên main

## Kết luận

**Chưa đủ để đánh dấu hoàn thành nhiệm vụ QA.** Có gói tập trung test và ba script k6, nhưng chưa có báo cáo chạy độc lập, kết quả E2E/tải/bảo mật và truy vết nghiệm thu. Đánh giá sản phẩm trên Git, không suy ra thành viên chưa làm ngoài repository.

Phạm vi: `330f712..bcee29ef154bd0956962f0594ee77c438e8a574b`, tác giả `porouser <vuducthanghvs@gmail.com>`, ngày 17/11/2026. Commit thêm 17 file, 2.075 dòng trong `tests/`; không đổi mã ứng dụng, runner hay CI. Đối chiếu nhiệm vụ tại `docs/project-plan.md` mục 4, 5, 7: API, tích hợp, toàn trình, bảo mật, tải, hồi quy; bàn giao test tự động, báo cáo, lỗi và truy vết cập nhật.

Rủi ro chủ yếu là độ tin cậy của kiểm chứng, không phải thay đổi hành vi production. Không phát hiện thay đổi mã ứng dụng trong commit này; không kết luận toàn hệ thống an toàn từ việc đó.

## Phát hiện

### 1. Quan trọng: thiếu báo cáo mà chính bộ test yêu cầu

`tests/python/test_testpack_assets.py:36–39` đọc `docs/testing/reports/2026-11-17-test-report.md`. File không có trong snapshot main. Sau khi cài dependencies đúng theo `scripts/requirements-api-contract.txt`, chạy discovery có 12 test: 11 đạt, 1 ERROR FileNotFoundError. Cần bàn giao báo cáo thật, ghi SHA/môi trường/lệnh/kết quả/NOT RUN và log liên quan; không tạo file chỉ để thỏa chuỗi kiểm tra.

### 2. Quan trọng: contention không kiểm chứng đúng một người thắng

`tests/k6/appointment-contention.js:10–14` chỉ dùng hai VU, mỗi VU một request. Assertion tại dòng 42–44 chỉ kiểm từng status thuộc `[200, 201, 409]`. Hai thành công (đặt trùng) hoặc hai conflict (không ai đặt được) đều thỏa assertion. Summary không đếm chính xác số người thắng hoặc kiểm tra trạng thái dữ liệu sau cuộc đua. Cần chứng minh đúng một thành công, các yêu cầu còn lại conflict phù hợp, và chỉ một lịch được tạo; có kịch bản 100 yêu cầu theo NFR-02. Backend đã có test 100 người đặt, nhưng bản sao không phải bằng chứng QA đã chạy lại độc lập.

### 3. Quan trọng: chưa có bằng chứng đáp ứng phần lớn nhiệm vụ cuối

Commit không thêm E2E qua giao diện/Keycloak/API/MySQL, kiểm media hai phía, mất mạng/nối lại, log tải, báo cáo coverage, test report hay ma trận truy vết mới. `tests/README.md:54–61` chỉ nhắc BE-01…04 và nói E2E/tải/bảo mật/WebRTC còn chờ xác minh. Đây là mô tả backlog, chưa phải phiếu lỗi có tái hiện/kỳ vọng/thực tế/bằng chứng/retest. Test plan và traceability trên main còn trạng thái chưa thực thi.

### 4. Trung bình: bài tải chưa bao phủ tiêu chí NFR-01

`tests/k6/appointment-load.js:8–18,27–34` mặc định 10 VU, giữ 2 phút, chỉ GET `/api/slots`; p95 1.200ms chặt hơn mục tiêu nhưng không thay thế quy mô/thời lượng/dữ liệu cần có. NFR-01 yêu cầu 50 người dùng đồng thời, dữ liệu 10.000 lịch, đo tra cứu và ghi lịch trong 15 phút, p95 không vượt 2 giây. Một số tham số có thể cấu hình qua environment, song chưa có cấu hình chạy và kết quả chứng minh, cũng chưa có luồng ghi lịch trong bài này.

### 5. Trung bình: nhóm legacy lỗi discovery

`tests/python/legacy/test_backend_demo.py:1–3` chèn thư mục tools cũ vào đầu sys.path; imports trong bộ demo kéo các module test cùng tên từ vị trí cũ. Lệnh `python -m unittest discover -s tests/python/legacy -p 'test_*.py' -v` lỗi module `test_current_demo` được import từ tools thay vì thư mục legacy. Cần tổ chức import/package hoặc giữ một vị trí test chính và lệnh chạy rõ ràng.

### 6. Trung bình: tập trung bản sao chưa tạo bộ regression có runner riêng

Hai file JUnit, resource và năm file frontend được so sánh nội dung chuẩn hóa LF: giống file gốc trên main. Python contract chỉ đổi đường dẫn import. Điều này có giá trị tra cứu nhưng không chứng minh các test được viết mới hoặc được QA thực thi. README đã nói rõ bản sao; không có dấu hiệu cố tình giấu nguồn. Maven/Vitest/CI vẫn chạy vị trí cũ; workflow API chỉ chạy `scripts/tests`, chưa chạy test assets hay các k6 mới. Cần tránh hai bản test lệch nhau và chỉ rõ bộ nào là nguồn thực thi chính.

## Kiểm chứng đã thực hiện

Snapshot main được xuất bằng `git archive` sang thư mục tạm riêng; không checkout đè workspace đang có thay đổi. Dependencies Python được cài trong venv tạm theo file requirements của snapshot.

| Lệnh / kiểm tra | Kết quả |
|---|---|
| `python -m unittest discover -s tests/python -p 'test_*.py' -v` | 12 test; 11 đạt, 1 ERROR thiếu báo cáo |
| `python scripts/check-api-contract.py` | PASS static: 46 operations / 38 paths / 48 schemas / 34 valid examples |
| `python -m unittest discover -s scripts/tests -p 'test_api_contract.py' -v` | 7/7 đạt; bộ có trước |
| `python -m unittest discover -s tests/python/legacy -p 'test_*.py' -v` | Không discovery được do trùng module |
| So sánh JUnit/resource/frontend với nguồn gốc | 8/8 file giống nội dung sau chuẩn hóa LF |

Không chạy Maven/Vitest trong đợt rà soát này. Không có executable k6 trong môi trường kiểm tra nên chưa chạy ba k6. Không truy cập database hay phát request tạo lịch. Phát hiện assertion contention và lệch NFR dựa trên đọc source. Không dùng kết quả test cũ của thành viên khác làm kết quả độc lập của Vũ Đức Thắng.

## Điều kiện để chốt hoàn thành

- [ ] Chốt baseline chạy và đưa đủ báo cáo, log, cấu hình môi trường, ngày chạy và người thực hiện lên Git/artifact.
- [ ] Sửa lỗi bộ Python và thống nhất vị trí test/runner, bổ sung vào CI phù hợp.
- [ ] Sửa assertion tranh chấp, đo đúng một người thắng và kiểm tra dữ liệu; kiểm chứng NFR-02.
- [ ] Đo tải theo NFR-01, giữ raw result và bảng p95/tỷ lệ lỗi; cung cấp coverage logic nghiệp vụ theo NFR-11.
- [ ] Thực hiện E2E trực tiếp và từ xa trên baseline thật, gồm quyền tài nguyên, mất mạng/reconnect/token hết hạn/kết thúc ở phía bên kia; ghi BLOCKED/NOT RUN khi chưa đủ hạ tầng.
- [ ] Cập nhật FR/TC/NFR → test → kết quả → log, danh sách lỗi có tái hiện và kết quả retest; giữ BE-01…04 mở tới khi có bằng chứng sửa.

Có thể ghi nhận hiện tại: **đã bàn giao bước đầu gói test tập trung và script k6; chưa hoàn thành kiểm thử độc lập và nghiệm thu cuối.**
