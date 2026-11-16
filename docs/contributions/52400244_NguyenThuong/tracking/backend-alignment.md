# Đối chiếu backend — 17/11/2026

Nguồn: hợp đồng 1.0.0, BE `main@a04dcb1`, FE/media `98a02e1`. Lần 04/11 trên `b10e096` là lịch sử.

| Hạng mục | Chuẩn hiện tại | Bộ đóng góp |
|---|---|---|
| API | 46 thao tác/38 path, /api một lần, camelCase | snapshot + 47 ví dụ |
| Danh tính | /me/profile trả doctorId/patientId | manifest seed, runtime tải profile |
| Seed | 6 account, 1 bác sĩ, 1 chuyên khoa, 2 bệnh nhân | không import UUID fixtures 0.1 |
| Queue | check-in, next/skip, date UTC+7, version | clinical.http; TC-11/19/20/21 |
| Clinical | encounterId từ appointment detail; DRAFT/FINAL, DRAFT/ISSUED | nested schema; TC-12/13/14 |
| Telehealth | BE lifecycle/signaling, FE media | telehealth.http chỉ kiểm vòng đời; nghiệm thu media riêng |
| Audit | /audit-events, createdAt, fail-closed | auditor riêng, không gọi danh mục |
| Backlog | BE-01 denied-room audit; BE-02 receptionist schedule; BE-03 auditor catalog; BE-04 empty queue | chưa hoàn thành, không ghi PASS mặc định |

Tiêu chí: phủ operation và required params/header/body/schema lồng nhau; hash snapshot khớp YAML chuẩn; ngày tương lai UTC+7; ID/version response và key ổn định khi retry. Giữ thiết kế 0.1/log 04/11 có nhãn lịch sử. Kiểm tra tĩnh không thay phân quyền, transaction, MySQL, Keycloak hoặc TURN.
