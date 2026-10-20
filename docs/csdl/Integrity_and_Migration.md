# Toàn vẹn và migration

Trong môi trường development, Docker Compose chạy **một lần trên volume mới** theo thứ tự: `000_runtime_role.sh` tạo tài khoản runtime `topic2_app` từ secret cục bộ; PostgreSQL bootstrap admin chạy `001_domain_schema.sql` (36 bảng) và `002_runtime_permissions.sql`. Runtime API chỉ kết nối bằng `topic2_app`, không dùng tài khoản `postgres`. Đây là schema domain, **chưa phải các migrations Identity/OpenIddict**; phần Identity/OpenIddict dùng EF Core migrations sau khi nhóm triển khai, tránh trùng bảng `app_users` khi ánh xạ Identity có UUID. Không lưu PHI thật hoặc mật khẩu trong DDL. Volume đã có dữ liệu không tự chạy lại init, cần migration có kiểm soát thay vì xóa volume.


OpenIddict lưu authorization codes/tokens/clients trên PostgreSQL bằng EF Core; ứng dụng WPF Windows là native public client, không có client_secret hoặc BFF session. App sinh PKCE challenge S256, mở system browser, nhận code ở loopback redirect URI 127.0.0.1/cổng động đã đăng ký, đổi code tại `/oauth/token` và giữ token bằng Windows DPAPI (ProtectedData CurrentUser). API xác thực Bearer token và kiểm tra `app_users.authz_version` từng request và trước mutation commit; revoke refresh/access token khi logout/reset/change-role. Worker dùng `BackgroundService` và `Npgsql`/EF Core giao dịch rõ ràng; không lưu PHI trong queue plaintext.

Exclusion constraints bảo vệ overlap bác sĩ/bệnh nhân và unique occupancy bảo vệ một slot. Giữ khóa doctor/patient UUID có thứ tự ở service; cập nhật shift dùng cùng doctor advisory lock như trigger. Buffer60phút giữa hai branch được kiểm tra trên work_shifts kể cả VIDEO. Hình thức và vị trí lấy từ shift; appointment snapshot do trigger đồng bộ, client không được tự cấp doctor/branch/time.

Biên giao dịch: book/reschedule/cancel có appointment, assignment, history, idempotency và outbox; check-in/start/abort có appointment/encounter/history/audit nếu PHI; finalize có record/encounter/appointment/prescription/assignment/audit. Provider network không gọi trong các giao dịch này. Lock order: các doctor UUID tăng, patient UUID tăng, appointment, encounter, record/prescription, audit head ngày. Không giữ khóa trong khi render PDF hoặc gọi provider.

Clinical FINAL và RX đã phát hành bất biến; chỉ aggregate version và trạng thái ISSUED→SUPERSEDED thay đổi. Nội dung PHI mã hóa khiến DB không kiểm tra trường y tế; service phải validate và tự gán validation_complete, không nhận boolean đó từ request. DDL guards và quyền runtime là lớp phòng thủ bổ sung, không thay policy/authz hoặc kiểm tra transitions ở service.

Care assignment: SCHEDULED đọc từ max(created_at,start-24h), IN_CARE đọc tiền sử trong ca; HISTORICAL chỉ kết quả ca mình hoàn tất; REVOKED không cấp tiền sử. Mỗi read kiểm tra quan hệ hiện hành, không dùng role DOCTOR chung để truy toàn bộ patients.

Outbox claim bằng FOR UPDATE SKIP LOCKED, lease60giây; poll≤1giây. Notification authorize dưới khóa appointment, commit authorized_at trước handoff. Queue delivery có thể lặp; logical keys/attempt key chống hiệu ứng lặp. UNKNOWN đối soát; không gọi nhà cung cấp có side effect mù. Dedup webhook giữ7ngày; idempotency24giờ.

Audit append có khóa audit_chain_heads theo ngày, canonical metadata HMAC cùng transaction; PHI read audit commit trước trả dữ liệu và header no-store; PHI write audit cùng transaction. Đối với quyền denied nếu sink lỗi vẫn từ chối và ghi technical error, không cung cấp PHI. HMAC và daily digest ngoài máy chủ phát hiện sửa; không ngăn DBA có đặc quyền xóa trigger/backup.

Migration thay đổi dùng expand/contract; không đổi slot/time đã tham chiếu hoặc payload FINAL để rotate khóa. Khóa cũ giữ ở key ring; rotate khóa mới cho dữ liệu mới và draft, giữ khả năng restore. Có thể tạo tệp ciphertext mới trong private cache; bản gốc FINAL không rewrite. Rollback release không rollback dữ liệu bằng DROP; restore chỉ từ backup đã kiểm tra trong môi trường riêng.

Schema là artifact thiết kế. Kiểm tra parser SQL chỉ chứng minh cú pháp, không chứng minh constraints đã chạy trên PostgreSQL. Integration tests/restore cần chạy trên hệ thống được triển khai.


## ADR dữ liệu v2.3 — ranh giới ORM/SQL đặc thù

EF Core 10/Npgsql provider phụ trách CRUD và mapping thực thể, migration ASP.NET Core Identity/OpenIddict. ADO.NET Npgsql với tham số hóa phụ trách `SELECT ... FOR UPDATE`, `SKIP LOCKED` cho outbox lease, PostgreSQL exclusion constraint SQLSTATE `23P01`, transaction orchestration; các thao tác cùng transaction phải dùng chung DbConnection/DbTransaction. Không thể thay DB exclusion constraint bằng kiểm tra ở UI WPF. Chi tiết starter `solution/src/Clinic.Infrastructure` là ví dụ, chưa được chạy với DB thật.

Compose dev chỉ bootstrap domain DDL (không tạo Identity/OpenIddict). `clinic-wpf` là OAuth native public client, refresh token qua DPAPI CurrentUser phía Windows. `/oauth/revoke` dùng ở server khi logout; `/auth/csrf` và legacy callback không tồn tại trong OpenAPI 2.3. User-facing login của Identity được hiển thị qua browser hệ thống; cookie nội bộ (nếu dùng) không được truyền như credentials của business API.
