# Ma trận chứng cứ và nội dung cần thu thập

**Lưu ý:** Các ô còn trống có nghĩa là **chưa nhận được chứng cứ**, không phải thành viên không làm.

| Phần báo cáo | Người cung cấp | Minh chứng bắt buộc | Vị trí/URL minh chứng | Trạng thái |
| --- | --- | --- | --- | --- |
| SRS, quy trình, BR, UML | Vòng Kỷ Phong / Nguyễn Thường (xác minh Git) | Tài liệu cùng nguồn commit | `docs/requirements`, `docs/design` | Có tài liệu, chưa kiểm công cá nhân |
| Bộ dữ liệu giả lập | Nguyễn Thường | fixtures + log validate | `test-data/fixtures` và `tools/` | Có bản nháp; chưa import |
| Frontend bệnh nhân | Vũ Trần Khắc Thuận | PR + ảnh chạy thật + route | Chưa nhận | Chờ triển khai |
| Frontend bác sĩ | Nguyễn Huỳnh Anh Kiệt | PR + ảnh chạy thật + route | Chưa nhận | Chờ triển khai |
| Frontend lễ tân/admin | Nguyễn Hiếu Nhân | PR + ảnh chạy thật + route | Chưa nhận | Chờ triển khai |
| Backend/MySQL | Vòng Kỷ Phong | Migration, API thực tế, log chạy | Chưa nhận | Chờ triển khai |
| Kiểm thử | Vũ Đức Thắng | Kết quả TC, lỗi, CI, coverage | Chưa nhận | Chờ triển khai |
| Demo | Nguyễn Thường + cả nhóm | Video/ảnh/kết quả thật, phiên bản build | Chưa thực hiện | Chờ triển khai |
| Nội dung báo cáo/slide | Nguyễn Thường tự soạn và tổng hợp | Bản báo cáo/slide cùng nguồn minh chứng; lịch sử PR khi có | Chưa có bản bàn giao | Đã xóa bản thảo/đề cương Markdown theo yêu cầu; Nguyễn Thường tự thực hiện |
| Thiết kế file DOCX/PPTX | Nguyễn Thường | File DOCX/PPTX và kết quả rà soát sau xuất/render | Chưa có file | Chưa bắt đầu; dự kiến bắt đầu 29/10/2026 |

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
