# Media WebRTC phía frontend

Frontend gộp đã có RTCPeerConnection cho bác sĩ và bệnh nhân, truyền camera/micro hai chiều; backend hiện hữu giữ trách nhiệm cấp phòng, token, quyền và chuyển tín hiệu. Chưa nghiệm thu với backend/Keycloak thật hoặc mạng khác NAT.

## Hoạt động

- Bác sĩ tạo OFFER; bệnh nhân gắn track vào transceiver của OFFER rồi trả ANSWER. ICE được đệm đến khi SDP tương ứng sẵn sàng, phân biệt từng negotiation bằng UUID; polling tuần tự theo cursor.
- Token phòng được gia hạn khi còn dưới 60 giây. Mỗi request có timeout 8 giây và hủy khi đóng. Kết nối lại có giới hạn tự động và nút thử lại; không tự mở lại peer đã thất bại.
- Có video từ xa, bật/tắt camera/micro, audio-only khi không mở được camera, nút phát âm thanh nếu autoplay bị chặn. Rời phòng, unmount và ENDED/CANCELLED đóng peer; UI dừng thiết bị cục bộ.
- Client kiểm tra trạng thái phòng mỗi 5 giây. Backend signaling không thể cưỡng chế ngắt một client P2P đã bị sửa mã; nếu yêu cầu thu hồi media từ server thì cần SFU/provider.

## Payload signaling phiên bản 1

API và DTO backend giữ nguyên: `kind` là OFFER/ANSWER/ICE; `payload` là chuỗi JSON:

```json
{"v":1,"negotiationId":"UUID","description":{"type":"offer","sdp":"..."}}
```

ANSWER dùng `description.type=answer`. ICE dùng `candidate` (RTCIceCandidateInit). Bệnh nhân yêu cầu OFFER mới bằng kind ICE với `{"v":1,"negotiationId":"UUID","control":"restart"}`; đây là thông điệp điều khiển nội bộ client, không phải ICE candidate. Cả hai phía phải cùng hỗ trợ định dạng này. Không lưu SDP, room token hoặc TURN credential vào log/localStorage.

## Cấu hình triển khai

`frontend/public/webrtc-config.json` mặc định có `iceServers: []`, `iceTransportPolicy: "all"`: phục vụ kiểm tra host candidate cùng máy/mạng; không bảo đảm gọi qua Internet. Cấu hình được tải runtime, `cache: no-store`.

Biến build `VITE_WEBRTC_ICE_CONFIG_URL` (Compose: `WEBRTC_ICE_CONFIG_URL`) chỉ trỏ URL cấu hình. URL cùng origin bắt đầu `/api/` được gửi JWT qua API client; URL ngoài origin phải HTTPS, không gửi JWT. Dịch vụ cấp ICE/TURN credentials chưa có trong BE hiện tại. Khi triển khai Internet, cung cấp endpoint credentials ngắn hạn và TURN/STUN phù hợp; không nhúng mật khẩu TURN dài hạn vào bundle/file public.

Ví dụ response từ dịch vụ cấu hình:

```json
{"iceServers":[{"urls":["stun:rtc.example.org:3478"]},{"urls":["turns:rtc.example.org:5349"],"username":"temporary-user","credential":"temporary-secret"}],"iceTransportPolicy":"all"}
```

Production cần HTTPS và quyền camera/micro. Kiểm tra hai thiết bị ở hai mạng, ép `iceTransportPolicy: "relay"` để xác nhận TURN, firewall, token expiry và gián đoạn mạng. Các kiểm tra này cần hạ tầng thật, chưa được chứng minh bởi bộ test local.

## Kiểm thử

```powershell
cd frontend
npm ci
npx playwright install chromium
npm test
npm run build
npm run test:rtc
```

Playwright mở hai browser context độc lập, dùng RTCPeerConnection native và thiết bị giả của Chromium. API signaling là fixture trong test, không phải BE thật. Test đo inbound RTP audio/video ở hai phía và kích thước video từ xa; kiểm tra mute, token refresh, ICE restart, end, audio-only và rời/vào lại. Trang fixture chỉ nằm trong tests, không đưa vào production bundle. CI có bước cài Chromium và chạy test này.
