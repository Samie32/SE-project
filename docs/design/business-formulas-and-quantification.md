# Công thức và lượng hóa các hàm nghiệp vụ ClinicCare

Tài liệu tổng hợp mô hình toán học, tham số định lượng, miền xác định và điều kiện biên của các hàm xử lý cốt lõi trong chín phân hệ (`M01`–`M09`). Mọi hằng số và biểu thức đều đối chiếu trực tiếp với mã nguồn hiện hành tại `backend/` và `infra/`.

---

## 1. M01 & M07 — Định danh, mã hóa, OTP và chống dò mật khẩu

### 1.1 Ánh xạ định danh nội bộ xác định
- **Nguồn:** `Access.actor` (`backend/src/main/java/com/clinic/auth/Access.java`)
- Với cặp `(issuer, subject)` do OIDC IdP cấp:
  $$\text{userId} = \text{UUIDv3}\!\left(\text{UTF8}\big(\text{issuer} \parallel \text{"|"} \parallel \text{subject}\big)\right)$$
- **Ý nghĩa:** Bảo đảm tính lũy đẳng (idempotency) khi hai luồng đăng nhập lần đầu chạy đồng thời cho cùng một tài khoản (`INSERT IGNORE INTO user_account` + đọc lại khóa chia sẻ `FOR SHARE`).

### 1.2 Mã hóa dữ liệu nhạy cảm (AES-256-GCM)
- **Nguồn:** `Crypto.encrypt`, `Crypto.decrypt` (`backend/src/main/java/com/clinic/common/Crypto.java`)
- Khóa chính $K \in \{0,1\}^{256}$ (`DATA_ENCRYPTION_KEY`, 32 byte Base64); mỗi bản ghi sinh $\text{IV}_{12} \leftarrow \text{SecureRandom}(12\text{ byte})$.
- Bản mã lưu trữ (`BLOB`):
  $$C = \text{IV}_{12} \parallel E_{K,\text{GCM}}(\text{IV}_{12}, P) \parallel T_{16}, \quad |T_{16}| = 128\text{ bit}$$
- Giải mã an toàn `decryptOrNull(raw)` trả về `null` khi $|raw| \le 12$ byte hoặc thẻ xác thực $T_{16}$ không hợp lệ.

### 1.3 Dẫn xuất khóa và chỉ mục mù (Blind Index HMAC-SHA256)
- **Nguồn:** `Crypto.deriveHmacKey`, `Crypto.hash`
- Tách khóa HMAC khỏi khóa mã hóa AES để tránh tái sử dụng khóa đa mục đích:
  $$K_{\text{hmac}} = \text{HMAC-SHA256}\!\left(K,\; \text{UTF8}(\text{"cliniccare:blind-index:v1"})\right)$$
- Giá trị băm chỉ mục lưu trong `email_hash`, `phone_hash` (`CHAR(64)`):
  $$h(x) = \text{Hex}_{\text{lower}}\!\left(\text{HMAC-SHA256}\big(K_{\text{hmac}},\; \text{UTF8}(\text{norm}(x))\big)\right) \in \{0\text{--}9, a\text{--}f\}^{64}$$

### 1.4 Hàm chuẩn hóa đầu vào tra cứu tài khoản bệnh nhân
- **Nguồn:** `Access.normalizeEmailOrNull`, `Access.normalizePhoneOrNull`, `frontend/src/api/patient-accounts.ts`
- **Chuẩn hóa email:**
  $$\text{norm}_{\text{email}}(e) = \begin{cases} \text{lower}(\text{trim}(e)), & \text{nếu } |\text{trim}(e)| \le 254 \land \text{match}(e', \texttt{\^{}[\textbackslash S@]+@[\textbackslash S@]+\textbackslash .[\textbackslash S@]+\$}) \\ \varnothing, & \text{ngược lại (HTTP 400)} \end{cases}$$
- **Chuẩn hóa số điện thoại:** đặt $p_0 = \text{replaceAll}(\text{trim}(p), \texttt{[\textbackslash s.\textbackslash -()]}, \text{""})$:
  $$\text{norm}_{\text{phone}}(p) = \begin{cases} \text{"0"} \parallel p_0[3:], & \text{nếu } p_0 \text{ bắt đầu bằng } \text{"+84"} \\ p_0[1:], & \text{nếu } p_0 \text{ bắt đầu bằng } \text{"+"} \text{ (khác +84)} \\ \text{"0"} \parallel p_0[2:], & \text{nếu } p_0 \text{ bắt đầu bằng } \text{"84"} \land |p_0| \ge 11 \\ p_0, & \text{ngược lại} \end{cases}$$
  Miền hợp lệ: $\text{norm}_{\text{phone}}(p) \in [0\text{--}9]^L$ với $7 \le L \le 15$.
- **Điều kiện trả kết quả tra cứu (`GET /api/patient-accounts/lookup?q=...`):**
  $$|M(q)| = \begin{cases} 0 & \implies \text{HTTP } 404 \\ 1 & \implies \text{HTTP } 200\ (\text{chỉ trả } \{id, displayName, active\} + \text{audit}) \\ \ge 2 & \implies \text{HTTP } 409\ (\text{trùng SĐT gia đình, yêu cầu nhập UUID}) \end{cases}$$

### 1.5 Hàm xác thực OTP 6 chữ số khi đổi email liên hệ
- **Nguồn:** `ContactOtpService` (`backend/src/main/java/com/clinic/auth/ContactOtpService.java`), `V9__contact_otp.sql`
- Sinh mã: $c \sim \mathcal{U}\{0, \dots, 999\,999\}$ định dạng 6 chữ số (`%06d`).
- Băm OTP gắn chặt với `(actorId, normalizedEmail, code)`:
  $$h_{\text{otp}} = h\!\left(\text{actorId} \parallel \text{"|"} \parallel \text{norm}_{\text{email}}(e) \parallel \text{"|"} \parallel c\right)$$
- **Tham số lượng hóa & xác suất an toàn:**
  - Thời hạn hiệu lực: $\text{TTL} = 300\text{ giây}$ ($5\text{ phút}$).
  - Thời gian chờ gửi lại theo tác nhân và theo email đích: $\Delta_{\text{cooldown}} = 30\text{ giây}$ (vi phạm → `HTTP 429`).
  - Giới hạn chống spam theo email đích: tối đa $N_{\text{hour}} = 5\text{ lượt} / 3600\text{ giây}$ (vi phạm → `HTTP 429`).
  - Giới hạn nhập sai: $A_{\max} = 5\text{ lần}$; xác suất đoán ngẫu nhiên thành công tối đa $P_{\le 5} = 1 - \prod_{i=0}^{4}\left(1 - \frac{1}{10^6 - i}\right) \approx 5 \times 10^{-6}$ ($0{,}0005\%$). Vượt $A_{\max}$ → xóa bản ghi `contact_otp`, buộc gửi mã mới.

### 1.6 Chính sách mật khẩu & khóa tạm chống dò mật khẩu (Brute-Force)
- **Nguồn:** `scripts/configure-keycloak-registration.py`, `infra/keycloak/realm-template.json`
- Chính sách mật khẩu: $|pw| \ge 8$ ký tự (`length(8)`).
- Khóa tạm thời (`permanentLockout = false`) với ngưỡng $F = 5$ lần sai trong cửa sổ $\Delta = 900\text{ s}$ ($15\text{ phút}$). Sau $k \ge F$ lần sai liên tiếp:
  $$W(k) = \min\!\left(60 \cdot \left\lfloor \frac{k}{5} \right\rfloor,\; 900\right)\text{ giây}$$
  Đặt lại mật khẩu thành công qua luồng **Quên mật khẩu?** sẽ xóa bộ đếm lỗi ngay lập tức.

---

## 2. M03 — Giờ hoạt động, ngày lễ và sinh khung giờ khám (Slot)

- **Nguồn:** `ScheduleService` (`backend/src/main/java/com/clinic/availability/ScheduleService.java`), `ClinicHours`
- **Biểu diễn khoảng nửa mở và kiểm tra giao nhau (BR-02):** mỗi ca làm việc, lịch nghỉ, khung giờ có dạng $[s, e)$ với $s < e$ (lưu UTC `DATETIME(6)`, quy đổi theo múi giờ `Asia/Ho_Chi_Minh`). Hai khoảng $[s_1, e_1)$ và $[s_2, e_2)$ giao nhau khi và chỉ khi:
  $$\text{Overlap}(s_1, e_1, s_2, e_2) \iff (s_1 < e_2) \land (e_1 > s_2)$$
- **Giờ hoạt động hiệu lực ngày $D$:**
  $$H_{\text{eff}}(D) = \begin{cases} \varnothing, & \text{nếu tồn tại } h \in \text{ClinicHoliday}(D) \land h.\text{closed} = \text{true} \\ [h.\text{opens\_at}, h.\text{closes\_at}), & \text{nếu tồn tại } h \in \text{ClinicHoliday}(D) \land h.\text{closed} = \text{false} \\ \text{ClinicHours}(\text{dow}(D)), & \text{ngược lại (mặc định 08:00–17:00 T2–T7)} \end{cases}$$
- **Điều kiện tạo ca và công thức phân chia slot:** với thời lượng mỗi lượt $d \in \mathbb{Z}^+$ phút (mặc định $d = 20$ phút):
  $$t_{\text{now}} < s < e,\quad [s, e) \subseteq H_{\text{eff}}(D),\quad \frac{e - s}{60} \equiv 0 \pmod d$$
  Số lượng slot được sinh:
  $$N = \frac{e - s}{60 \cdot d}, \quad I_i = \big[s + 60di,\; s + 60d(i+1)\big) \quad \forall i \in \{0, 1, \dots, N-1\}$$

---

## 3. M04 — Đặt, đổi, hủy, vắng hẹn, báo chậm và Idempotency

- **Nguồn:** `AppointmentService`, `AppointmentDelayPolicy`, `WorkflowService`, `Idempotency`
- **Đặt lịch (`CONFIRMED`):** $t_{\text{now}} < s$, khóa lần lượt `Doctor` (tăng dần theo ID) rồi `Patient` (`SELECT ... FOR UPDATE`), và không tồn tại lịch hiệu lực ($\text{status} \in \{\text{CONFIRMED}, \text{CHECKED\_IN}, \text{IN\_PROGRESS}\}$) thỏa mãn $\text{Overlap}(s_{\text{old}}, e_{\text{old}}, s, e)$.
- **Đổi / Hủy lịch (BR-08):**
  $$\text{CanModify}(a, t_{\text{now}}) \iff a.\text{status} = \text{CONFIRMED} \land t_{\text{now}} \le a.\text{start} - 7200\text{ s}\quad (\text{trước } \ge 2\text{ giờ})$$
- **Ghi nhận vắng hẹn `NO_SHOW` (BR-08, BR-18):**
  $$\text{CanMarkNoShow}(a, t_{\text{now}}) \iff a.\text{status} = \text{CONFIRMED} \land t_{\text{now}} \ge a.\text{start} + 900\text{ s}\quad (\text{từ } +15\text{ phút})$$
- **Báo chậm giờ `DELAY_NOTICE` (BR-17):**
  $$\text{CanSendDelay}(a, t_{\text{now}}) \iff \text{day}_{\text{VN}}(t_{\text{now}}) = \text{day}_{\text{VN}}(a.\text{start}) \land \Big((a.\text{status} = \text{CONFIRMED} \land t_{\text{now}} < a.\text{start} + 900\text{ s}) \lor a.\text{status} = \text{CHECKED\_IN}\Big)$$
  Nếu cung cấp giờ dự kiến $t_{\text{est}}$: $t_{\text{est}} > \max(a.\text{start}, t_{\text{now}}) \land \text{day}_{\text{VN}}(t_{\text{est}}) = \text{day}_{\text{VN}}(a.\text{start})$.
- **Chống lặp Idempotency:** khóa ghép $(\text{actorId}, \text{op}, \text{key})$ với $|\text{key}| \in [1, 128]$, thời hạn lưu $\text{TTL} = 86\,400\text{ s}$ (24 giờ). Gửi lại cùng khóa với $H_{\text{payload}} = \text{SHA-256}(\text{body})$ giống nhau → trả kết quả cũ; khác $H_{\text{payload}}$ → `HTTP 409`.

---

## 4. M05 — Khóa lạc quan hồ sơ bệnh án & đơn thuốc

- **Nguồn:** `ClinicalService` (`backend/src/main/java/com/clinic/clinical/ClinicalService.java`)
- **Kiểm tra phiên bản lạc quan (Optimistic Locking):**
  $$\text{WriteAllowed}(v_{\text{req}}, v_{\text{db}}) \iff (v_{\text{req}} = v_{\text{db}}) \implies v_{\text{next}} = v_{\text{db}} + 1; \quad v_{\text{req}} \ne v_{\text{db}} \implies \text{HTTP } 409$$
- **Giới hạn độ dài:** $|\text{content}| \le 100\,000$ ký tự (mã hóa AES-256-GCM trước khi lưu); đơn thuốc phát hành (`ISSUED`) yêu cầu $|\text{items}| \ge 1$, mỗi trường mô tả (`medicineName`, `doseText`, `route`, `frequency`, `durationText`) $\in [1, 1\,000]$ ký tự.

---

## 5. M06 — Nhắc lịch email và lịch thử lại (Backoff)

- **Nguồn:** `AppointmentService`, `NotificationStore` (`backend/src/main/java/com/clinic/notification/NotificationStore.java`)
- **Mốc gửi nhắc lịch:**
  $$t_{\text{reminder}} = a.\text{start} - 1800\text{ s}\quad (\text{trước } 30\text{ phút})$$
  Chỉ xếp lịch nhắc khi $t_{\text{reminder}} \ge t_{\text{now}}$; nếu lịch đặt khi còn $< 30$ phút thì chỉ gửi email xác nhận.
- **Lịch thử lại khi SMTP lỗi tạm thời:** mảng trễ cố định $\Delta = [60,\; 300,\; 900]\text{ giây}$ ($1, 5, 15\text{ phút}$), số lần thử lại tối đa $K_{\max} = 3$, thời gian giữ lease worker $L_{\text{lease}} = 60\text{ s}$:
  $$\text{NextAction}(k) = \begin{cases} \text{Retry tại } t_{\text{now}} + \Delta[k-1], & k \in \{1, 2, 3\} \\ \text{FAILED}, & k > 3 \end{cases}$$

---

## 6. M08 — Check-in và hàng đợi khám FIFO

- **Nguồn:** `WorkflowService` (`backend/src/main/java/com/clinic/clinical/WorkflowService.java`)
- **Cửa sổ check-in (`IN_PERSON`, `CONFIRMED`):**
  $$a.\text{start} - 900\text{ s} \le t_{\text{now}} < a.\text{start} + 900\text{ s}\quad ([-15\text{ phút}, +15\text{ phút}))$$
- **Cấp số thứ tự nguyên tử dưới khóa bản ghi `Doctor`:**
  $$\text{pos}_{\text{new}}(doctor, D_{\text{VN}}) = \max\!\left(\{\text{pos}_j \mid \text{doctor\_id} = doctor \land \text{service\_date} = D_{\text{VN}}\} \cup \{0\}\right) + 1$$
  Trả về lượt (`skipTicket`) cập nhật `status = WAITING` và cấp lại `pos_new` theo đúng công thức trên (giữ nguyên `ticket.id`).

---

## 7. M09 — Khám từ xa (Telehealth & WebRTC)

- **Nguồn:** `TelehealthService`, `TelehealthController`, `TransientDataCleanup`
- **Cửa sổ phòng chờ & bắt đầu phiên (`REMOTE`):**
  $$\text{CanPrepare}(a, t_{\text{now}}) \iff a.\text{start} - 600\text{ s} \le t_{\text{now}} < a.\text{start} + 900\text{ s}\quad ([-10\text{ phút}, +15\text{ phút}))$$
  $$\text{CanStart}(a, t_{\text{now}}) \iff a.\text{start} \le t_{\text{now}} < a.\text{start} + 900\text{ s}\quad ([0, +15\text{ phút}))$$
- **Token và truyền tín hiệu (Signaling):**
  - Hạn dùng token phòng: $\text{TTL}_{\text{room}} = 300\text{ giây}$ ($5\text{ phút}$); mỗi lần `join` thu hồi token cũ của cùng người dùng.
  - Giới hạn tải tin hiệu: $|\text{payload}| \le 65\,536$ ký tự; tần suất $\le 300\text{ tin nhắn} / \text{người} / \text{phòng} / 60\text{ giây}$ (vượt → `HTTP 429`).
  - Dọn dẹp định kỳ (`TransientDataCleanup` mỗi $60\text{ s}$): xóa token hết hạn ($\le t_{\text{now}}$), tín hiệu quá $300\text{ s}$, bản ghi idempotency hết hạn, OTP quá $300\text{ s}$ và nhật ký gửi OTP quá $3600\text{ s}$.

---

## 8. Công thức lượng hóa đánh giá chất lượng (NFR)

| Chỉ tiêu | Công thức tính | Ngưỡng đạt | Tham chiếu |
|---|---|---|---|
| Độ trễ phân vị 95 ($p_{95}$, NFR-01) | $p_{95} = T_{(\lceil 0.95 \cdot N \rceil)}$ với $T_{(1)} \le \dots \le T_{(N)}$ là mẫu thời gian phản hồi | $p_{95} \le 2\,000\text{ ms}$ (50 VU, 10.000 lịch, 15 phút) | `NFR-01` |
| Tỷ lệ lỗi giao dịch (ERR) | $\text{ERR} = \frac{N_{\text{err}}}{N_{\text{total}}} \times 100\%$ (không tính `409` khi cố ý test tranh chấp) | $= 0\%$ ở test tải thường; đúng $1$ thành công / $99$ `409` ở test tranh chấp | `NFR-01`, `NFR-02` |
| Độ bao phủ dòng & nhánh (NFR-11) | $\text{Cov}_{\text{line}} = \frac{L_{\text{cov}}}{L_{\text{cov}} + L_{\text{miss}}} \times 100\%$, $\text{Cov}_{\text{branch}} = \frac{B_{\text{cov}}}{B_{\text{cov}} + B_{\text{miss}}} \times 100\%$ | Unit logic nghiệp vụ $\ge 60\%$ | `NFR-11`, `jacoco.csv` |
| Tỷ lệ hoàn thành tác vụ (NFR-08) | $R_{\text{pass}} = \frac{|\{u \in U : \text{done}(u) \land t(u) \le 180\text{ s}\}|}{|U|} \times 100\%$ | $\ge 80\%$ ($\ge 4/5$ người tham gia) | `NFR-08` |
| Thời gian phát hiện mất mạng UI (NFR-09) | $\Delta t_{\text{detect}} = t_{\text{notice}} - t_{\text{offline}}$ | $\Delta t_{\text{detect}} \le 10\text{ s}$ | `NFR-09` |
| Xác suất đoán đúng OTP 6 số | $P_{\le 5} = 1 - \prod_{i=0}^{4}\left(1 - \frac{1}{10^6 - i}\right)$ | $\le 5 \times 10^{-6}$ | `FR-01`, `NFR-04` |
