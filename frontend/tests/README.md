# Phân loại kiểm thử Frontend (`frontend/tests`)

Tài liệu này phân loại toàn bộ các bài test trong `frontend/tests/` theo **mục đích kiểm nghiệm** (kiểm nghiệm chức năng/nghiệp vụ và kiểm nghiệm độ ổn định/an toàn hệ thống).

---

## 1. Kiểm nghiệm chức năng & nghiệp vụ (Functional & Business Verification)

### 1.1. Quy tắc nghiệp vụ cốt lõi & lịch làm việc
| File | Phạm vi & nội dung kiểm nghiệm |
| --- | --- |
| `core.test.ts` | Quy tắc thời gian đặt/đổi/hủy lịch (`BR-08` ≥ 2 giờ), cửa sổ check-in `[-15, +15)` phút, phòng khám từ xa `[-10, +15)` phút, đánh dấu `NO_SHOW` từ `+15` phút, chuẩn giờ Việt Nam (UTC+7), kiểm tra nội dung hồ sơ. |
| `schedule-rules.test.ts` | Quy tắc hợp lệ khi tạo ca làm việc: giờ Việt Nam, slot mặc định 20 phút, chặn ca ngoài giờ/Chủ nhật/qua ngày/ngày cũ/thiếu dữ liệu, chặn ca không chia hết slot và cho phép ca liền kề. |
| `schedule-delete.test.ts` | Xóa ca làm việc (`DELETE 204` gỡ ca và slot liên quan, giữ ca khác), chặn xóa ca có lịch hẹn đã hủy, chặn bác sĩ khác xóa ca, giữ lịch quá khứ và cho hủy khoảng nghỉ tương lai. |
| `clinic-hours.test.ts` | Lưu giờ hoạt động phòng khám, áp dụng khung giờ mới khi tạo ca, từ chối sửa giờ bởi bác sĩ (`403`) và bảo vệ ca còn hiệu lực (`409`). |

### 1.2. Hợp đồng API & phân quyền dữ liệu (API Contract & RBAC)
| File | Phạm vi & nội dung kiểm nghiệm |
| --- | --- |
| `api-contract.test.ts` | Kiểm tra hợp đồng API 1.0.0: `/me/profile`, đọc hàng đợi theo bác sĩ/ngày, gọi lượt kèm `Idempotency-Key` và nhận `204` khi hết hàng, không nuốt `404`, `progress`/`skip`, `PUT` bệnh án, tạo đơn, `join`/`start` telehealth, xử lý body rỗng HTTP `200`/`204`. |
| `mock-flow.test.ts` | Kiểm tra phân quyền theo vai trò trên mock server: `GET /me`, bác sĩ chỉ đọc được lịch của mình (`403` với người khác), bệnh nhân bị chặn đọc nhật ký kiểm toán, từ chối gán vai trò `DOCTOR` khi chưa có hồ sơ bác sĩ. |

### 1.3. Giao diện & luồng thao tác người dùng (UI Feature Flows)
| File | Phạm vi & nội dung kiểm nghiệm |
| --- | --- |
| `clinic-hours-ui.test.tsx` | Giao diện `/admin/clinic-hours`: hiển thị trực tiếp 7 ngày, bật/tắt ô gạt hoạt động, chặn giờ đóng ≤ giờ mở, lưu giờ hợp lệ, thêm khoảng ngày nghỉ lễ liên tiếp. |
| `clinic-hours-page.test.tsx` | Giao diện `/admin/clinic-hours` chạy kèm `mockFetch`: bật Chủ nhật, chặn giờ kết thúc sai, lưu và đối chiếu lại qua `getClinicHours()`. |
| `specialties-ui.test.tsx` | Giao diện `/admin/specialties`: hiển thị cả chuyên khoa ngừng hoạt động, lọc theo trạng thái/bác sĩ, thêm mới và cập nhật tên/trạng thái qua modal. |
| `account-permissions.test.tsx` | Giao diện `/admin/permissions`: tạo nhân sự, tự động tạo hồ sơ bác sĩ kèm chuyên khoa khi cấp vai trò Bác sĩ, lọc và cập nhật quyền. |
| `schedule-manager.test.tsx` | Giao diện quản lý lịch bác sĩ: mặc định 20 phút, ẩn ca đã có, chặn trùng ca khác hình thức, chỉ xóa ca sau khi xác nhận dialog. |
| `logout-confirmation.test.tsx` | Hộp thoại xác nhận đăng xuất: hủy sẽ giữ nguyên phiên hiện tại, xác nhận mới thực hiện đăng xuất. |

---

## 2. Độ ổn định, an toàn trạng thái & kiểm thử E2E (Stability, Resilience & E2E)

### 2.1. An toàn giao dịch, retry & nhất quán trạng thái
| File | Phạm vi & nội dung kiểm nghiệm |
| --- | --- |
| `clinical-flow.test.tsx` | Giữ nguyên `Idempotency-Key` khi phát hành đơn thuốc gặp lỗi `503` để tránh tạo trùng đơn; mở ca khám đọc bản nháp theo encounter không mất nội dung; sửa đơn nháp bằng `PUT` thay vì tạo mới. |
| `schedule-manager.test.tsx` *(case 409)* | Không đóng dialog và không hiển thị thông báo xóa thành công giả khi backend trả về xung đột `409`. |
| `telehealth-lifecycle.test.tsx` | Mở lại lịch đang khám sau giờ hẹn hiển thị đúng phiên đã kết thúc; `prepare` một lần rồi `GET` trạng thái; chặn gói `GET` đến trễ ghi đè phiên `ACTIVE` mới hơn sau lệnh `start`. |
| `doctor-call-navigation.test.tsx` | Giữ nguyên phòng gọi telehealth khi bác sĩ chuyển sang xem hồ sơ bệnh nhân rồi quay lại. |
| `mock-navigation.test.tsx` | Chuyển hướng an toàn về trang `/staff` khi đổi từ vai trò bác sĩ sang lễ tân trên URL bác sĩ. |
| `schedule-seed.test.ts` | Đảm bảo toàn bộ dữ liệu seed mẫu của mock nằm trong giờ hoạt động phòng khám và không trùng ca cùng bác sĩ. |

### 2.2. Độ ổn định giao thức WebRTC & Media
| File | Phạm vi & nội dung kiểm nghiệm |
| --- | --- |
| `webrtc.test.ts` | 14 bài test ổn định giao thức signaling/WebRTC: không gửi SDP cũ khi `setLocalDescription` của restart còn pending, ICE restart liên tục, đệm ICE đến trước `OFFER`, tự renew token trước khi hết hạn, bỏ `ANSWER` cũ sau restart, báo mất signaling trong tối đa 8 giây, không tự mở lại peer đã thất bại quá giới hạn retry. |
| `e2e/webrtc.spec.ts` | Kiểm thử E2E WebRTC qua Playwright: video/audio hai phía, mute, ICE restart, token refresh, fallback sang audio thật khi camera bị từ chối và rời/tham gia lại trong cùng phiên. |

### 2.3. Quét toàn trang, chặn route & Accessibility
| File | Phạm vi & nội dung kiểm nghiệm |
| --- | --- |
| `scan/pages.spec.ts` | Quét các route theo từng vai trò bằng Playwright + `@axe-core/playwright` để phát hiện lỗi render/console và kiểm tra chặn route trái quyền. |

---

## Lệnh chạy nhanh

```powershell
# Unit & UI tests (Vitest)
npm --prefix frontend test

# Chạy riêng nhóm test UI quản trị mới
npm --prefix frontend test -- tests/clinic-hours-ui.test.tsx tests/specialties-ui.test.tsx

# Quét trang & chặn route (Playwright)
npm --prefix frontend run test:scan

# E2E WebRTC (Playwright)
npm --prefix frontend run test:rtc
```

> **Lưu ý:** Một số file test import trực tiếp `src/mock/server.ts` (`account-permissions.test.tsx`, `clinic-hours-page.test.tsx`, `clinic-hours.test.ts`, `mock-flow.test.ts`, `mock-navigation.test.tsx`, `schedule-delete.test.ts`) phụ thuộc tính hợp lệ của `src/mock/server.ts`. Ngoài ra, `account-permissions.test.tsx` cần được cập nhật theo giao diện mới sau khi gộp nút **Cấp quyền** vào hộp thoại **Sửa**.
