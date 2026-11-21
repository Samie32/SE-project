# Yêu cầu phi chức năng

Các yêu cầu xác định mục tiêu chất lượng và phương pháp kiểm chứng. Chỉ số trong bảng là tiêu chí đánh giá của hệ thống, chưa phải kết quả đo thực tế.

| ID | Yêu cầu | Phương pháp kiểm chứng |
|---|---|---|
| NFR-01 | Thời gian phản hồi p95 của API tra cứu khung giờ và ghi lịch hẹn không vượt quá 2 giây với 50 người dùng đồng thời, trên bộ dữ liệu 10.000 lịch hẹn mô phỏng trong 15 phút; không bao gồm độ trễ của dịch vụ ngoài | Kiểm thử tải; ghi nhận cấu hình môi trường, thời gian phản hồi và tỷ lệ lỗi |
| NFR-02 | Khi 100 yêu cầu đồng thời đặt cùng một khung giờ, hệ thống chỉ tạo một lịch hẹn; không phát sinh lịch trùng của bác sĩ hoặc bệnh nhân | Kiểm thử đồng thời trên MySQL |
| NFR-03 | Mọi API xử lý dữ liệu nhạy cảm kiểm tra vai trò và quyền truy cập tài nguyên | Kiểm thử ma trận phân quyền, quyền sở hữu và mã truy cập hết hạn |
| NFR-04 | Đường truyền HTTPS (TLS 1.2+, HSTS `max-age=31536000; includeSubDomains`), dữ liệu liên hệ (`email`, `phone`) và bệnh án lưu trữ được mã hóa AES-256-GCM (IV 12 byte, tag 128 bit); chỉ mục mù dùng khóa HMAC-SHA256 dẫn xuất riêng; frontend áp dụng CSP `frame-ancestors 'none'` và `X-Frame-Options: DENY`; thông tin bí mật không lưu trong mã nguồn hoặc nhật ký kỹ thuật | Kiểm tra cấu hình mã hóa, phản hồi HTTP header thực tế, quyền quản lý khóa và nội dung nhật ký |
| NFR-05 | Các thao tác đọc, ghi hồ sơ và thay đổi quyền được ghi nhận trong nhật ký kiểm toán; tài khoản ứng dụng không được sửa hoặc xóa nhật ký | Đối chiếu sự kiện và kiểm thử lỗi ghi nhật ký |
| NFR-06 | Cơ chế sao lưu và phục hồi khôi phục được các bản ghi và quan hệ khóa ngoại trong bộ dữ liệu trình diễn | Thực hiện sao lưu, phục hồi và đối chiếu dữ liệu |
| NFR-07 | Khi cơ sở dữ liệu hoặc dịch vụ ngoài gặp lỗi, hệ thống phản hồi lỗi rõ ràng và không báo thành công đối với giao dịch chưa được xác nhận | Mô phỏng gián đoạn các thành phần phụ thuộc |
| NFR-08 | Ít nhất 4 trong 5 người tham gia thử nghiệm ở vai trò bệnh nhân hoàn thành đặt lịch trong tối đa 3 phút sau phần giới thiệu thao tác | Đánh giá khả năng hoàn thành tác vụ |
| NFR-09 | Giao diện hiển thị lỗi trong tối đa 10 giây sau khi phát hiện mất kết nối; dữ liệu hồ sơ đã lưu được bảo toàn | Mô phỏng ngắt kết nối mạng |
| NFR-10 | Hệ thống sử dụng React + TypeScript, Spring Boot và MySQL; giao diện API được đặc tả bằng OpenAPI 3.1, các mô hình UML được quản lý phiên bản bằng Git | Kiểm tra tài liệu và cấu hình công nghệ |
| NFR-11 | Độ bao phủ kiểm thử đơn vị đối với logic nghiệp vụ đạt tối thiểu 60%; có các ca kiểm thử chống trùng lịch và phân quyền | Đánh giá báo cáo độ bao phủ và kết quả kiểm thử |
| NFR-12 | Dữ liệu trình diễn là dữ liệu mô phỏng; hồ sơ bệnh án, mật khẩu và mã truy cập không xuất hiện trong Email hoặc nhật ký kỹ thuật | Kiểm tra dữ liệu, mẫu thông báo và nhật ký |
| NFR-13 | Phiên khám video WebRTC sử dụng truyền thông mã hóa DTLS-SRTP và thông tin xác thực TURN tạm thời có hạn dùng; hỗ trợ tự phục hồi kết nối (`ICE restart` + gia hạn token trong phiên `ACTIVE`/`RECONNECTING`) và chuyển chế độ chỉ âm thanh (*audio-only fallback*); máy chủ TURN giới hạn tối đa `4` phân bổ/người dùng, `32` phân bổ toàn cục và chặn chuyển tiếp tới toàn bộ dải IP nội bộ (`denied-peer-ip`) | Kiểm thử WebRTC (`npm run test:rtc`), kiểm tra cấu hình `coturn`/`ice-config` và thử nghiệm relay hai mạng |
| NFR-14 | Mọi màn hình nghiệp vụ chính của cả 5 vai trò hiển thị đáp ứng không tràn ngang, không phát sinh lỗi console/runtime ở cả kích thước máy tính và di động, đồng thời đạt `0` vi phạm khả năng tiếp cận trong bộ quy tắc `axe` bật sẵn | Kiểm thử quét giao diện đa kích thước và `axe` (`npm run test:scan`) |
| NFR-15 | Ngăn tấn công dò mật khẩu bằng khóa tạm phía IdP (`5` lần sai trong `15` phút → khóa `60–900 s`); ngăn lạm dụng gửi OTP/Email đa tầng gồm cooldown `30 s` theo tài khoản và email đích, tối đa `5` lượt/giờ/email đích, tối đa `5` lần nhập sai OTP, và giới hạn tầng gateway Nginx `10 req/phút/IP` (`burst=5`, trả `429`) | Kiểm thử đơn vị/tích hợp OTP, kiểm thử payload brute-force Keycloak và kiểm thử cấu hình Nginx |
| NFR-16 | Mọi bản phát hành lên môi trường triển khai phải vượt qua cổng CI (`frontend`, `backend` tích hợp MySQL, `api-contract`), tự động rollback về commit ổn định gần nhất nếu dựng dịch vụ hoặc kiểm tra sức khỏe thất bại, và đạt `100%` kiểm thử khói sau triển khai (`post-deploy-smoke`) trên phản hồi HTTPS thật | Kiểm thử rollback (`test_azure_deploy_scope.py`), xác minh pipeline CI và `scripts/verify-live-demo.py` |

Phạm vi đánh giá bảo mật bao gồm phân quyền, nhật ký kiểm toán và bảo vệ dữ liệu; không bao gồm chứng nhận tuân thủ pháp lý.

## Rủi ro đã chấp nhận (Phạm vi demo)

- **Mật khẩu tài khoản mẫu trên bản triển khai demo (`scripts/prepare-internet.py`):** Khi không truyền biến môi trường `DEMO_PASSWORD`, bộ tài khoản mẫu demo dùng mật khẩu mặc định `DemoClinic` để phục vụ trình diễn và kiểm thử nhanh với dữ liệu giả hoàn toàn (NFR-12). Rủi ro này được nhóm **chấp nhận có kiểm soát trong phạm vi demo** (đã khóa tài khoản quản trị hạ tầng Keycloak bằng `KEYCLOAK_ADMIN_PASSWORD` sinh ngẫu nhiên và bật khóa tạm brute-force 5 lần sai). Khi đưa vào vận hành thực tế, bắt buộc truyền `DEMO_PASSWORD` ngẫu nhiên hoặc vô hiệu hóa toàn bộ tài khoản mẫu.
