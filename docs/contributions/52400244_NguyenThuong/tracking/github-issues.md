# Issues đề xuất để ghi nhận đóng góp 52400244

Đã push phần đóng góp tại f9193d9. Chưa có Issue/PR được liên kết làm bằng chứng trong gói; không suy ra đã merge hoặc nghiệm thu. Các mục bên dưới là đề xuất, chưa tạo trên GitHub.

1. **[SE][DATA] Mock patient/doctor/specialty and schedule fixtures**. Acceptance: có UUID, 2 BN/2 BS/2 CK/5 role; lịch không chồng; UTC hợp lệ; validator PASS.
2. **[SE][DATA] Clinical, prescriptions, queue, telehealth and notification fixtures**. Acceptance: `PrescriptionItem` có đủ 5 trường theo FR-14; không đưa thuốc/liều thật; FK hợp lệ; các bảng nhạy cảm không chứa plaintext.
3. **[SE][QA-SUPPORT] TC-01..TC-24 data-to-test matrix**. Acceptance: mỗi TC có nguồn dữ liệu, kết quả kỳ vọng, phân biệt static/runtime, gửi QA review.
4. **[SE][DOCS] Report outline and evidence collection matrix**. Acceptance: có nguồn, người giao bằng chứng, không bịa kết quả.
5. **[SE][DEMO] Two demo runbooks and user guide**. Acceptance: kịch bản trực tiếp/từ xa, 5 vai trò, lỗi thay thế, screenshots chỉ sau khi chạy.

## Quy trình

`git switch docs/52400244-demo-data` → add đúng file trong thư mục này → commit tiếng Việt → chủ nhánh xác nhận → push thông thường → mở PR có người review → merge theo workflow nhóm. Xem [hướng dẫn cập nhật nhánh](how-to-merge.md); không tạo lại nhánh đang có hoặc tự force-push.

Không tự nhận các Issue là `Done` cho tới khi có PR được review và nội dung kiểm tra phù hợp.
