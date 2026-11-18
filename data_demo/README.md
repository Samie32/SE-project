# Hướng dẫn dùng bộ dữ liệu demo cho cả nhóm

Bộ dữ liệu dùng chung để cả nhóm trình diễn các vai trò trên cùng một môi trường. Một người phụ trách dựng và nạp dữ liệu trên máy demo. Nếu mỗi người tự chạy trên máy mình, mỗi máy sẽ có dữ liệu và mật khẩu riêng.

## 1. Dựng và nạp dữ liệu

Trên Windows, khi project Docker `clinic-telehealth-integration` đang chạy, **nhấp đúp [nap-du-lieu.cmd](nap-du-lieu.cmd)**. File sẽ nạp các lịch mẫu tương lai và giữ cửa sổ mở để xem kết quả. Khi cần chọn ngày, gọi file từ terminal với `--date YYYY-MM-DD`. Khi cần nạp thêm một ca đã khám, xem điều kiện và tùy chọn `--clinical-at HH:MM` ở mục 4.

### Dựng môi trường lần đầu hoặc chạy bằng terminal

Cần Docker đang chạy và Python 3.10+. Từ thư mục gốc dự án:

```powershell
# Chỉ chuẩn bị khi thiếu cấu hình. Giữ .env đang dùng cùng volume dữ liệu.
if (!(Test-Path .env) -or !(Test-Path infra/runtime/clinic-realm.json)) {
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/setup-local.ps1
}
docker compose -p clinic-telehealth-integration up -d --build --wait backend patient-frontend

$loader = 'data_demo/load_local_demo.py'
python -B $loader           # In kế hoạch, chưa ghi dữ liệu
python -B $loader --apply   # Nạp lịch tương lai vào project tích hợp local
```

Compose sẽ kéo theo MySQL, Keycloak và Mailpit. Trình nạp gọi BE qua API và chỉ ghi vào project `clinic-telehealth-integration` với BE/Keycloak bind loopback. Nếu cổng cần dùng đang bận, xác định và dừng phiên local cũ trước.

Để xem giao diện tại **http://localhost:5173/**, chạy thêm service `patient-frontend` trên `main`, hoặc `frontend` nếu checkout dùng FE gộp. Dùng cùng project Docker để FE kết nối đúng BE. Hướng dẫn thao tác đủ năm vai trò tham chiếu FE gộp.

Khi tạm dừng giữa các buổi, dùng `docker compose -p clinic-telehealth-integration stop` để giữ container Keycloak và volume MySQL. Nếu Keycloak bị tạo lại và mất tài khoản demo trong khi MySQL còn dữ liệu, khôi phục dữ liệu Keycloak tương ứng hoặc chuẩn bị môi trường demo sạch. Trình nạp sẽ dừng nếu phát hiện danh tính thiếu và hồ sơ bác sĩ demo đã tồn tại.

Mặc định chọn hai ngày làm việc kế tiếp theo giờ Việt Nam và bỏ Chủ nhật. Có thể chọn ngày tương lai cụ thể với `--date YYYY-MM-DD`. Chạy lại cùng ngày để tái sử dụng dữ liệu. Khi sang ngày khác, mặc định ngày nạp sẽ dịch theo lịch hiện tại. Nếu lịch đã được người demo tự đổi hoặc hủy, hãy xem trạng thái trước khi chạy nạp lại. Chạy từng tiến trình nạp một.

## 2. Tài khoản và mật khẩu demo

Mở trang local và nhập **username** trong bảng. Các tài khoản demo local dùng chung mật khẩu mặc định **`DemoClinic`**. Để đổi, sửa **`DEMO_PASSWORD` trong `.env`** ở thư mục gốc rồi chạy lại `data_demo/nap-du-lieu.cmd`. Biến môi trường `DEMO_PASSWORD` của phiên chạy được ưu tiên nếu có. Trình nạp đồng bộ mật khẩu trong Keycloak cho cả tài khoản demo đã có. `KEYCLOAK_ADMIN_PASSWORD` là mật khẩu quản trị hạ tầng riêng.

| Username | Vai trò | Dùng để demo |
| --- | --- | --- |
| `patient3` | Bệnh nhân | Tài khoản của Trần Hoàng Minh. Xem các lịch mẫu, bệnh án và đơn thuốc sau khi nạp ca đã khám. |
| `doctor2` | Bác sĩ | Tài khoản của Nguyễn Minh An. Xem ca, giờ nghỉ, hàng đợi và tham gia lịch khám từ xa trong bộ demo. |
| `doctor3` | Bác sĩ | Lê Hải Yến, chuyên khoa Tim mạch. |
| `doctor4` | Bác sĩ | Phạm Quốc Huy, chuyên khoa Nhi khoa. |
| `doctor5` | Bác sĩ | Võ Thanh Tâm, khám tổng quát. Có mặt trong cả General practice và Nội tổng quát. |
| `doctor6` | Bác sĩ | Đặng Bảo Ngọc, chuyên khoa Da liễu. |
| `doctor7` | Bác sĩ | Bùi Đức Thành, chuyên khoa Tim mạch. |
| `doctor8` | Bác sĩ | Hoàng Mai Anh, chuyên khoa Nhi khoa. |
| `receptionist` | Lễ tân | Check-in lịch trực tiếp, xem hàng đợi và thông báo. |
| `admin` | Quản trị ứng dụng | Kiểm tra bác sĩ, chuyên khoa, lịch và vai trò. |
| `auditor` | Kiểm toán viên | Tra nhật ký thao tác. |
| `doctor` | Bác sĩ | Đối chiếu lịch hoặc dùng cho ca thử riêng. |
| `patient` | Bệnh nhân | Đặt lịch mới trong luồng trình diễn. |
| `patient2` | Bệnh nhân | Thử đặt cùng lượt hoặc kiểm tra quyền xem lịch của người khác. |

## 3. Dữ liệu có sẵn

| Dữ liệu bổ sung | Dùng để demo |
| --- | --- |
| Ít nhất hai bác sĩ cho mỗi chuyên khoa của bộ demo, kể cả General practice có sẵn | Chọn giữa nhiều bác sĩ. Mỗi bác sĩ bổ sung từ `doctor3` đến `doctor8` có một ca trực tiếp 15 phút/lượt vào mỗi ngày nạp. |
| Hai ca trực tiếp 15 phút/lượt và hai ca từ xa 30 phút/lượt | Xem lịch tuần, tìm và lọc khung giờ theo hình thức. |
| Khoảng nghỉ 14:30–15:00 vào ngày thứ hai | Lượt từ xa 14:30 bị ẩn trong danh sách đặt, các lượt ngoài thời gian nghỉ vẫn có. |
| Bốn lịch tương lai | Lịch trực tiếp 09:00, từ xa 14:00 và lịch đã hủy 09:15 vào ngày đầu. Lịch trực tiếp ngày thứ hai đã dời từ 10:00 sang 10:30. |
| Thông báo, audit | Sinh qua các thao tác đặt, đổi, hủy và khám. Xem bằng lễ tân/quản trị hoặc kiểm toán viên theo quyền. Mailpit ở `http://localhost:8025`. |

## 4. Tạo thêm bệnh án và đơn thuốc

Trong giờ làm việc từ thứ Hai đến thứ Bảy, chọn giờ bắt đầu ca **trong 14 phút tới theo giờ Việt Nam**. Chọn khoảng 15 phút không trùng lịch của bác sĩ demo mới, kết thúc chậm nhất lúc 17:00. Ví dụ dưới đây tự chọn giờ bắt đầu sau sáu phút. Chạy trong giờ làm việc và đối chiếu lịch trước:

```powershell
$start = [DateTimeOffset]::UtcNow.ToOffset([TimeSpan]::FromHours(7)).AddMinutes(6).ToString('HH:mm')
.\data_demo\nap-du-lieu.cmd --clinical-at $start
```

Script đặt thêm lịch, check-in đúng cửa sổ, gọi lượt, bắt đầu khám, lưu bản nháp rồi chốt bệnh án, phát hành đơn mô phỏng và hoàn tất lịch. Chạy lại đúng ngày và giờ đã chọn để tiếp tục ca đang dang dở nếu trạng thái cho phép. Nếu đã qua cửa sổ check-in và chưa check-in được, dùng một giờ mới hợp lệ. Các quyết định về thứ tự hàng đợi và trạng thái vẫn do backend kiểm tra.

Trên FE gộp, mở **Lịch hẹn** hoặc **Hồ sơ** với tài khoản bệnh nhân mới. Với bác sĩ demo, mở **Lịch làm việc** hoặc **Hàng đợi**. Lịch từ xa được nạp ở trạng thái `CONFIRMED`. Đến giờ hẹn, mở hai phiên trình duyệt với hai vai trò để kiểm thử phòng và cuộc gọi theo [kịch bản demo](guides/demo-runbook.md).

Trong buổi demo, dùng ca đã khám để trình bày ngay bệnh án và đơn thuốc. Dùng **một lịch trực tiếp khác đang ở trạng thái `CONFIRMED`** để lễ tân và bác sĩ diễn luồng check-in, gọi lượt và khám. Chọn lịch theo giờ trình diễn để vào đúng cửa sổ nghiệp vụ. Chốt trước cặp bác sĩ/bệnh nhân và giờ hẹn nếu demo video.

## Kết quả chạy local ngày 18/11/2026

- Nạp vào project tích hợp đang chạy, thêm hai tài khoản, hai chuyên khoa, một bác sĩ, bốn ca tương lai, một khoảng nghỉ và bốn lịch vào ngày 19–20/11.
- Tạo thêm ca khám trực tiếp ngày 18/11 lúc 09:46 giờ Việt Nam, cho tổng cộng năm lịch của bệnh nhân demo mới. API xác nhận ba `CONFIRMED`, một `CANCELLED`, một `COMPLETED` và phiên khám hoàn tất có phiếu `DONE`.
- Chạy lại cùng tham số và đọc lại qua API. Năm lịch giữ nguyên ID, thời gian nghỉ loại đúng lượt 14:30, bệnh nhân đọc được bệnh án `FINAL` và đơn `ISSUED`, job đổi/hủy đã `SENT` và kiểm toán viên truy được audit của lịch đã khám.
- Tài khoản trình diễn hiện dùng `doctor2` và `patient3`. Việc chuẩn hóa tên giữ nguyên ID người dùng, ca và lịch hẹn. Hồ sơ đã chốt cũ được giữ trong lịch sử và có bản bổ sung với nội dung mô phỏng đã chuẩn hóa.
- Trạng thái đang chờ, đã gọi và đang khám xuất hiện khi thao tác theo luồng. `NO_SHOW` cần đợi mốc sau giờ hẹn 15 phút. Lịch từ xa và dữ liệu local sẵn để thử phòng, còn phiên gọi hai phía và TURN cần nghiệm thu riêng.

[Hướng dẫn thao tác theo vai trò](guides/user-guide.md) · [Mẫu API và dữ liệu đối chiếu](../docs/contributions/52400244_NguyenThuong/test-data/README.md)
