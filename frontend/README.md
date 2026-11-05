# ClinicCare Frontend Portal (React + TypeScript + Vite)

Dự án giao diện Web cho **Hệ thống quản lý phòng khám ngoại trú, đặt lịch và khám từ xa (ClinicCare)**.

Công nghệ:
- **React 19** + **TypeScript**
- **Vite 8**
- **Tailwind CSS v4**
- **React Router DOM 7**
- **Lucide React** (Medical & UI icons)

---

## 1. Phân hệ Bác sĩ (Doctor Portal)

Phụ trách: **Nguyễn Huỳnh Anh Kiệt** (MSSV: `52400052`)

### Các màn hình và chức năng đã triển khai:
1. **Lịch làm việc & Nghỉ phép (Tuần 3 - Trọng tâm)**:
   - Đường dẫn: `/doctor/schedule`
   - Quản lý ca làm việc theo ngày, giờ bắt đầu/kết thúc, slot minutes (15p/20p/30p/45p), hình thức khám (`IN_PERSON` / `TELEHEALTH`), tùy chọn lặp lại hàng tuần.
   - Quản lý lịch nghỉ phép (Time-off), kiểm tra xung đột với lịch hẹn đã đặt của bệnh nhân.
2. **Lịch hẹn bệnh nhân (Tuần 4)**:
   - Đường dẫn: `/doctor/appointments`
   - Bộ lọc theo trạng thái (`CHECKED_IN`, `IN_PROGRESS`, `CONFIRMED`, `COMPLETED`), tìm kiếm theo tên/SĐT/mã lịch. Thao tác kích hoạt ca khám.
3. **Hàng khám & Gọi lượt (Tuần 5)**:
   - Đường dẫn: `/doctor/queue`
   - Bảng gọi số thứ tự tiếp đón phòng khám theo cơ chế FIFO (`WAITING` $\rightarrow$ `CALLED` $\rightarrow$ `IN_SERVICE`). Thao tác gọi lượt, bỏ lượt / chuyển cuối hàng, và bắt đầu khám.
4. **Khám bệnh, Hồ sơ bệnh án & Kê đơn thuốc (Tuần 5)**:
   - Đường dẫn: `/doctor/consultation`
   - Thông tin lâm sàng, chẩn đoán ICD-10, sinh hiệu (huyết áp, nhịp tim), hướng điều trị.
   - Quản lý trạng thái hồ sơ: Lưu nháp (`DRAFT`) và Hoàn tất (`FINAL`).
   - Kê đơn thuốc điện tử theo dòng, phát hành đơn (`ISSUED`).
   - Tra cứu lịch sử khám cũ của bệnh nhân có xác thực nhật ký kiểm toán (Audited Read).
5. **Phòng khám từ xa & Thành phần phòng gọi dùng chung (Tuần 6)**:
   - Đường dẫn: `/doctor/telehealth`
   - Tích hợp component dùng chung **`CallingRoom`** (`src/components/common/CallingRoom.tsx`) do Kiệt chủ trì: truyền thông Audio/Video, bật/tắt mic, camera, kết nối lại khi mất mạng, bảng tin nhắn nhanh, và hộp thoại xác nhận kết thúc phiên.

---

## 2. Hướng dẫn khởi chạy

Chạy lệnh trong thư mục `frontend`:

```bash
# Cài đặt thư viện (nếu chưa cài)
npm.cmd install

# Chạy môi trường phát triển (Development server)
npm.cmd run dev

# Kiểm tra TypeScript và đóng gói (Production build)
npm.cmd run build
```

Mở trình duyệt tại: `http://localhost:5173/` để truy cập Cổng Thông Tin Bác Sĩ.
