# Quy ước làm việc chung

## 1. Mã yêu cầu (không tự đổi mã đã có)

| Loại | Mã | Ví dụ | Nơi định nghĩa |
| --- | --- | --- | --- |
| Yêu cầu người dùng | `UR-xx` | UR-01 | docs/srs |
| Yêu cầu hệ thống | `SR-xx` | SR-05 | docs/srs |
| Yêu cầu chức năng | `FR-xx.y` | FR-02.1 | docs/srs |
| Yêu cầu phi chức năng | `NFR-xx` | NFR-08 | docs/srs |
| Use case | `UC-xx` | UC-03 | docs/use-case |
| Test case | `TC-xx` | TC-12 | docs/test |

Khi thêm/sửa/xoá một mã, **báo TV1 (SRS) và TV6 (ma trận truy vết)** trong ngày để cập nhật đồng bộ.

## 2. Đặt tên file tài liệu

```
TenTaiLieu_vX.Y.docx
```
Ví dụ: `SRS_v0.9.docx`, `ERD_v1.0.png`, `TestPlan_v0.9.xlsx`.

Ghi lịch sử phiên bản ở đầu mỗi file (ngày, người sửa, nội dung thay đổi).

## 3. Nơi lưu tài liệu

Một nguồn duy nhất: thư mục `docs/` và `design/` trong repo này (hoặc Google Drive dùng chung nếu ai quen Google Docs hơn — nhưng khi chốt v0.9/v1.0 phải đưa bản cuối vào đúng thư mục repo). Không gửi bản riêng qua tin nhắn cá nhân.

## 4. Quy trình review tài liệu

1. Người viết nộp bản nháp vào đúng thư mục, tạo Pull Request (hoặc thông báo trong kênh chat nếu chưa quen Git).
2. Reviewer góp ý trong **2 ngày**.
3. Người viết sửa trong **2 ngày** tiếp theo.
4. Reviewer xác nhận (approve) → merge vào nhánh `main`.

Phân công reviewer xem trong `Phan_cong_giai_doan_tai_lieu.docx`.

## 5. Quy tắc Git (áp dụng từ giai đoạn code)

- Nhánh `main`: luôn chạy được, chỉ merge qua Pull Request.
- Nhánh làm việc: `feature/<ten-chuc-nang>` (vd: `feature/fr02-dat-lich`), `fix/<mo-ta-ngan>`.
- Commit message ngắn gọn, có tiền tố mã yêu cầu nếu áp dụng được: `FR-02: thêm API tìm bác sĩ theo chuyên khoa`.
- Mỗi Pull Request cần ít nhất 1 người review trước khi merge.

## 6. Họp và báo cáo

- Một buổi đồng bộ khoảng 30 phút mỗi tuần.
- Báo cáo nhanh theo mẫu "Đã làm — Sẽ làm — Vướng mắc" trên kênh chat chung sau mỗi buổi họp.

## 7. Tiêu chí hoàn thành một tài liệu

- Đúng mẫu, có số phiên bản và người viết.
- Không mâu thuẫn với SRS và các tài liệu khác (đã qua review).
- Mọi yêu cầu/chức năng nhắc đến đều có mã và có mặt trong ma trận truy vết.
- Không còn mục "TBD" hoặc mô tả mơ hồ ("nhanh", "ổn định") mà thiếu số đo.
