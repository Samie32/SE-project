# Cập nhật phần đóng góp 52400244

## Trạng thái hiện tại

Phần đóng góp đã được push lên nhánh `docs/52400244-demo-data` tại `f9193d9`. Nhánh dựa trên main `b10e096`; chưa có bằng chứng merge hoặc nghiệm thu trong gói. Những đính chính mới tiếp tục trên cùng nhánh bằng commit tiếng Việt, không viết lại lịch sử.

## Quy trình cập nhật tiếp theo

1. Kiểm tra `git status` và cập nhật thông tin remote. Nếu nhánh đã có thay đổi mới thì tích hợp và kiểm tra trước, không ghi đè.
2. Từ root repo, chạy hai lệnh bên dưới; xem diff và bằng chứng thực tế.
3. Chỉ stage các file cần sửa trong phần đóng góp; dữ liệu sinh ra, cache và file patch ở gốc không đưa vào commit. Log kiểm tra mới chỉ thêm có chủ đích sau khi xem nội dung.
4. Commit riêng công cụ, tài liệu và bằng chứng bằng tiếng Việt. Đưa danh sách commit cho chủ nhánh xem và chờ xác nhận trước khi push.
5. Sau khi được xác nhận, dùng `git push origin docs/52400244-demo-data`. Nếu bị từ chối, kiểm tra thay đổi remote trước; không tự force-push.

Push chỉ cập nhật nhánh đóng góp. Merge vào main và nghiệm thu cần được ghi nhận riêng qua PR/review và bằng chứng tương ứng.

```powershell
& './docs/contributions/52400244_NguyenThuong/tools/run-checks.ps1'
python docs/contributions/52400244_NguyenThuong/tools/backend_demo.py --check --spec docs/api/openapi.json
```

## Lịch sử thay nhánh đã hoàn tất

Ngày 04/11/2026, chủ nhánh xác nhận không có người khác sử dụng và duyệt thay nhánh cũ `1104fdb` bằng bản dựa trên main. Sau đó commit lớn được chia thành 19 commit cùng nội dung và đã push tới `f9193d9`. Việc thay lịch sử bằng force-with-lease đã hoàn tất, không phải quy trình dùng lại cho cập nhật tiếp theo.

Mốc cũ có tag chỉ ở local `backup/52400244-demo-data-before-refresh-20261104`; trước khi tách commit có tag `backup/52400244-before-split-d959203`. Không push các tag này nếu chưa được yêu cầu. File patch ở gốc là bản vá lịch sử, không đại diện đầy đủ cho các đính chính hiện tại.
