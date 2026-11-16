# Ma trận chứng cứ và nội dung cần thu thập

**Lưu ý:** Các ô còn trống có nghĩa là **chưa nhận được chứng cứ**, không phải thành viên không làm.

**Cập nhật 17/11/2026:** bảng bên dưới là phiếu thu thập lịch sử, không phải đánh giá trạng thái code hiện tại. Đã có FE gộp tại `frontend/`, BE V1/V2 và media client tại `98a02e1`; bằng chứng FE cục bộ ghi trong `docs/frontend-unified.md` (41 test FE, 2 bài native WebRTC Chromium). Không gán thay đổi tích hợp cho một thành viên khi chưa đối chiếu tác giả. Bộ dữ liệu hiện tại phủ hợp đồng 1.0.0; kết quả riêng tại [backend-validation.md](backend-validation.md). E2E BE/Keycloak/MySQL thật và TURN chưa được nghiệm thu trong đợt này. Các ô “Chờ triển khai” cũ chỉ phản ánh thời điểm ghi nhận.

| Phần báo cáo | Người cung cấp | Minh chứng bắt buộc | Vị trí/URL minh chứng | Trạng thái |
| --- | --- | --- | --- | --- |
| SRS, quy trình, BR, UML | Vòng Kỷ Phong / Nguyễn Thường (xác minh Git) | Tài liệu cùng nguồn commit | `docs/requirements`, `docs/design` | Có tài liệu, chưa kiểm công cá nhân |
| Bộ dữ liệu giả lập | Nguyễn Thường | fixtures + log validate | `test-data/fixtures` và `tools/` | Đã push bộ dữ liệu; kiểm tra tĩnh đạt, chưa import/xác minh API thật |
| Frontend bệnh nhân | Vũ Trần Khắc Thuận | PR + ảnh chạy thật + route | Chưa nhận | Chờ triển khai |
| Frontend bác sĩ | Nguyễn Huỳnh Anh Kiệt | PR + ảnh chạy thật + route | Chưa nhận | Chờ triển khai |
| Frontend lễ tân/admin | Nguyễn Hiếu Nhân | PR + ảnh chạy thật + route | Chưa nhận | Chờ triển khai |
| Backend/MySQL | Vòng Kỷ Phong | Migration, API thực tế, log chạy | main@b10e096: backend/src, docs/api/implementation.md, docs/api/openapi.json | Đã đọc code tuần 3–4; chưa có log chạy tại workspace |
| Kiểm thử | Vũ Đức Thắng | Kết quả TC, lỗi, CI, coverage | Chưa nhận | Chờ triển khai |
| Demo | Nguyễn Thường + cả nhóm | Video/ảnh/kết quả thật, phiên bản build | Chưa thực hiện | Chờ triển khai |
| Nội dung báo cáo/slide | Nguyễn Thường tự soạn và tổng hợp | Bản báo cáo/slide cùng nguồn minh chứng; lịch sử PR khi có | Chưa có bản bàn giao | Đã xóa bản thảo/đề cương Markdown theo yêu cầu; Nguyễn Thường tự thực hiện |
| Thiết kế file DOCX/PPTX | Nguyễn Thường | File DOCX/PPTX và kết quả rà soát sau xuất/render | Chưa có file | Chưa có bản bàn giao trong repo; chưa xác nhận tiến độ ngoài repo |

## Mẫu ghi nhận sau khi có kết quả thật

- ID test/FR/Issue: ...
- Mã commit/PR: ...
- Ngày và môi trường chạy: ...
- Điều kiện, bước thực hiện: ...
- Kết quả thực tế: ...
- Pass/Fail/Blocked (có căn cứ): ...
- Ảnh/log/URL: ...
- Người kiểm chứng: ...

Không dùng ảnh dàn dựng để khẳng định phần mềm đã chạy, không ghi PASS khi chưa có kết quả thực thi.
