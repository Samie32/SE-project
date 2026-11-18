# Checklist bàn giao 52400244 — cập nhật 18/11/2026

Người phụ trách: **Nguyễn Thường — MSSV 52400244**. Phạm vi của đợt này: nội dung dữ liệu, công cụ hỗ trợ dữ liệu, hướng dẫn theo source, kịch bản demo và hợp đồng API được yêu cầu bổ sung. Không đánh dấu hoàn tất nạp DB, triển khai FE/BE hoặc kiểm thử độc lập của thành viên khác.

## Sản phẩm đã chuẩn bị và đưa lên main

- [x] 16 nhóm fixtures thiết kế nhất quán, UUID mô phỏng và validator; lưu rõ đây là thiết kế 0.1, không phải seed SQL.
- [x] Mapping 6 account/seed hiện tại; 47 ví dụ phủ 46 API với camelCase, ADMINISTRATOR/REMOTE, header và version đúng chuẩn.
- [x] Snapshot có nguồn/hash, công cụ sinh ngày tương lai UTC+7 và kiểm schema lồng nhau.
- [x] Ba file HTTP có thể sinh từ generator: đặt/đổi/hủy, clinical/queue, vòng đời telehealth; lấy ID/version/token phòng từ response, không lưu token thật.
- [x] Bản hướng dẫn sử dụng theo source, runbook, truy vết 24 TC và bàn giao cho BE/QA. Bản tài liệu đã viết; ảnh UI và xác nhận thao tác thực tế còn chờ nghiệm thu.
- [x] Kiểm tra công cụ/dữ liệu: 40 test; fixtures 16 nhóm/52 bản ghi; catalog thiết kế 30 API/20 body; catalog hiện tại 46 API/47 ví dụ.
- [x] Hợp đồng BE–FE 1.0.0: 46 thao tác/38 đường dẫn/48 schema, quy tắc retry/version/quyền và signaling; checker, 7 test contract và workflow CI hợp đồng.

## Chưa đánh dấu hoàn thành

- [ ] Phối hợp BE/QA chạy lại bộ demo trên môi trường bàn giao theo giờ thực tế.
- [ ] Bổ sung ảnh UI thật, kết quả E2E cùng BE/QA; kiểm chứng lời hướng dẫn trên phiên bản được nghiệm thu.
- [ ] Thu thập đầy đủ minh chứng từ cả nhóm và hoàn thành báo cáo tổng hợp DOCX.
- [ ] Hoàn thành slide PPTX và rà soát bản xuất.
- [ ] Chạy thử, tổ chức trình diễn và nghiệm thu demo toàn hệ thống.

## Kiểm chứng bộ nạp local 18/11/2026

- [x] Nạp bộ 52400244 qua API vào MySQL của project tích hợp riêng và đọc lại dữ liệu.
- [x] Kiểm tra nạp lại cùng tham số, lịch giữ nguyên ID và không sinh lịch trùng. Xác nhận thời gian nghỉ chặn đúng lượt khám.
- [x] Chạy luồng trực tiếp từ check-in đến hoàn tất qua API, xác nhận phiếu DONE, bệnh án FINAL, đơn ISSUED, thông báo đổi/hủy và audit.
- [x] Bổ sung hướng dẫn cho cả nhóm từ dựng môi trường đến nạp dữ liệu, bảng tài khoản theo vai trò và nơi lấy mật khẩu demo local.
- [x] Gom trình nạp, launcher Windows và hướng dẫn trình diễn ở `data_demo/` tại gốc dự án. [Cách nạp và kết quả local](../../../data_demo/README.md).
- [ ] Nghiệm thu trên môi trường bàn giao, quay minh chứng UI và thử phiên video hai phía.

## Ranh giới của lần đưa lên main ngày 17/11/2026

- [x] Chỉ thay `docs/contributions/52400244_NguyenThuong/`, phần ghi nhận 52400244 trong `docs/project-plan.md`, `docs/api/`, script/test/dependency và workflow kiểm hợp đồng.
- [x] Không đưa mã `frontend/`, `backend/`, migration, Compose, cấu hình môi trường, CI backend/frontend hoặc các plan WebRTC vào lần bàn giao này.
- [x] Không đưa phiếu minh chứng nhóm đang chờ phản hồi hoặc đề xuất Issue chưa thực hiện từ nhánh đóng góp vào gói main.
- [x] Không dùng số test tĩnh để đánh dấu nghiệm thu API/MySQL, TURN, hiệu năng hoặc coverage nghiệp vụ.

[Bằng chứng kiểm bản main](report/main-handover.md). CI được cấu hình; trạng thái CI thực tế cần xem kết quả trên GitHub, không suy từ cấu hình workflow.
