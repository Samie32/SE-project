# ClinicCare — Cổng Bệnh Nhân (Patient Portal)

**Phụ trách:** Vũ Trần Khắc Thuận (MSSV: 52400243)  
**Công nghệ:** React 18, TypeScript, Vite, React Router v6, react-oidc-context.

---

## 🚀 Hướng dẫn khởi chạy

### 1. Cài đặt thư viện
Mở terminal tại thư mục `frontend`:
```powershell
npm install
```

*(Nếu gặp lỗi PowerShell ExecutionPolicy chặn npm script, bạn chỉ cần mở PowerShell và chạy: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force`)*

### 2. Chạy môi trường phát triển (Dev Server)
```powershell
npm run dev
```
Ứng dụng sẽ chạy tại: **http://localhost:5173** (đã khớp cấu hình CORS của backend Spring Boot và callback URL của Keycloak).

---

## 📋 Các chức năng và màn hình đã hoàn thành

| Màn hình | Route | Đặc tả & Nghiệp vụ |
|---|---|---|
| **Đăng nhập** | `/login` | Xác thực OIDC qua Keycloak (PKCE) hoặc đăng nhập nhanh chế độ Demo |
| **Trang chủ bệnh nhân** | `/patient` | Tổng quan số liệu lịch hẹn, múi giờ `Asia/Ho_Chi_Minh`, truy cập nhanh các dịch vụ |
| **Đặt lịch khám** | `/patient/booking` | Quy trình 3 bước (Chuyên khoa → Bác sĩ → Giờ khám), tự động sinh `Idempotency-Key`, tự reload khi bị tranh chấp khung giờ (409) |
| **Lịch của tôi** | `/patient/appointments` | Danh sách lịch, lọc theo hình thức/trạng thái, **Đổi lịch** và **Hủy lịch** (kiểm tra điều kiện hợp lệ >= 2 giờ trước giờ khám) |
| **Hồ sơ & Đơn thuốc** | `/patient/records` | Xem chi tiết hồ sơ bệnh án và đơn thuốc điện tử (chế độ chỉ đọc cho bệnh nhân) |
| **Khám từ xa (Telehealth)** | `/patient/telehealth` | Chuẩn bị phiên, kiểm tra Camera/Micro, xác nhận tham gia phòng chờ, điều khiển cuộc gọi và rời phòng an toàn |

---

## 🔗 Tích hợp API Backend
- **Proxy Vite:** Mọi request `/api/*` được tự động chuyển tiếp tới `http://localhost:8080/api`.
- **Múi giờ:** Đồng bộ toàn bộ hiển thị theo `Asia/Ho_Chi_Minh` (UTC+7).
