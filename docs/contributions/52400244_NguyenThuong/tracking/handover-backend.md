# Bàn giao bộ demo 52400244 — 17/11/2026

Theo hợp đồng 1.0.0 và BE `main@a04dcb1`; dùng [hướng dẫn backend](../test-data/backend/README.md). Không import SQL hoặc sửa migration.

- Có manifest seed, snapshot/hash, 47 ví dụ phủ 46 API, generator ngày Việt Nam và ba HTTP flow.
- Queue/clinical/telehealth đã có API; FE đã có media. BE thật/TURN chưa nghiệm thu trong bộ này.
- Backend/QA cần xác nhận BE-01…04, chạy luồng với Keycloak/MySQL, chụp ảnh/log bỏ token và ghi SHA/timezone/người chạy.
- Chuẩn bị lịch IN_PERSON/REMOTE sát giờ qua API. Không nạp lịch cũ, đổi đồng hồ hoặc POST availability trùng seed.
- Muốn 2 bác sĩ/2 chuyên khoa thì tạo qua IdP/API và lưu mapping; seed mặc định chỉ có 1 bác sĩ.
- Giữ audit/outbox/lịch đã hủy; không reset DB hoặc vô hiệu transaction khi demo.

[24 TC](../test-data/backend/traceability.csv) ghi NOT_RUN khi runtime chưa chạy. Ghi PASS chỉ khi có bằng chứng thực tế.
