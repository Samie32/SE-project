# Cập nhật nhánh 52400244 từ main

Chủ nhánh xác nhận không có người khác sử dụng nhánh và yêu cầu dùng lại `docs/52400244-demo-data` cho bản mới gồm main và phần đóng góp đã sửa. Nền main: `b10e0960a6a48225b5c26af60c737dbd1c37968f`; mốc nhánh cũ: `1104fdb970233a396df1ee76af37e155496ffc55`.

Nhánh local được đổi về tên cũ, không tạo thêm nhánh trên GitHub. Mốc cũ được giữ bằng tag **chỉ ở local** `backup/52400244-demo-data-before-refresh-20261104`. Không xóa nhánh remote trước, không push tag backup.

Commit chỉ chứa `docs/contributions/52400244_NguyenThuong`; file patch ở gốc và dữ liệu sinh ra không được đưa vào commit. Kiểm tra bằng `tools/run-checks.ps1`, đọc danh sách file và nội dung commit trước khi duyệt push. Backend/frontend giữ theo main.

**Chưa được push cho đến khi chủ nhánh xác nhận.** Sau khi được duyệt, dùng lease cố định để thay nhánh cũ:

```powershell
git push --force-with-lease=refs/heads/docs/52400244-demo-data:1104fdb970233a396df1ee76af37e155496ffc55 origin docs/52400244-demo-data:docs/52400244-demo-data
```

Nếu remote không còn ở mốc cũ, Git từ chối: đọc thay đổi mới và xin xác nhận lại, không tự chuyển sang `--force`. Push không cập nhật main; việc tích hợp main thực hiện qua PR sau đó.
