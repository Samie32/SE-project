# ClinicCare — Coding Convention

- **Phiên bản:** 1.0
- **Trạng thái:** Đề xuất áp dụng cho đồ án
- **Phạm vi:** C#, WPF, ASP.NET Core Web API, ADO.NET và PostgreSQL

## 1. Mục đích và mức độ bắt buộc

Tài liệu này thống nhất cách viết, tổ chức, kiểm thử và bảo vệ mã nguồn ClinicCare.

- **MUST / BẮT BUỘC:** phải tuân thủ.
- **SHOULD / NÊN:** nên tuân thủ; nếu không áp dụng cần có lý do.
- **MAY / CÓ THỂ:** tùy tình huống.

Nếu quy định của giảng viên hoặc cấu hình repository mâu thuẫn với tài liệu này, Tech Lead cần làm rõ và cập nhật convention trước khi áp dụng thay đổi diện rộng.

## 2. Nguyên tắc chung

1. Mỗi thay đổi có mục tiêu rõ ràng, phạm vi nhỏ và có thể review.
2. Code dễ đọc, dễ kiểm thử; tránh lặp logic nghiệp vụ.
3. Không tự ý đổi kiến trúc, thư viện nền tảng hoặc API contract khi chưa trao đổi với Tech Lead và thành viên liên quan.
4. Không đưa secret, token, mật khẩu hoặc dữ liệu bệnh nhân thật vào Git.
5. Không đánh dấu task hoàn thành khi chưa kiểm tra tiêu chí nghiệm thu liên quan.
6. Tránh format toàn bộ file không liên quan đến task.

## 3. Quy ước đặt tên

| Thành phần | Quy tắc | Ví dụ |
|---|---|---|
| Class, record, struct | `PascalCase` | `AppointmentService` |
| Interface | `I` + `PascalCase` | `IAppointmentRepository` |
| Method | `PascalCase` | `GetAvailableSlotsAsync()` |
| Property | `PascalCase` | `AppointmentId` |
| Public constant | `PascalCase` | `DefaultSlotDuration` |
| Local variable, parameter | `camelCase` | `appointmentId` |
| Private field | `_camelCase` | `_appointmentRepository` |
| Enum | `PascalCase` | `AppointmentStatus` |
| Enum member | `PascalCase` | `Confirmed`, `Cancelled` |
| Database table, column | `snake_case` | `appointments`, `created_at` |
| SQL constraint/index | tiền tố có ý nghĩa | `pk_appointments`, `ix_appointments_patient_id` |
| XAML control có tên | tên mô tả + loại control | `AppointmentDataGrid`, `ConfirmButton` |
| Async method | hậu tố `Async` | `CreateAppointmentAsync()` |
| Test method | mô tả hành vi | `CreateBooking_WhenSlotIsTaken_ReturnsConflict()` |

Quy tắc bổ sung:
- MUST dùng tên có ý nghĩa; tránh `a`, `b`, `temp1`, `data1` trong logic nghiệp vụ.
- MUST dùng tiếng Anh cho identifier trong code.
- SHOULD tránh viết tắt khó hiểu; chỉ dùng viết tắt phổ biến như `Id`, `DTO`, `API`.
- Tên file C# SHOULD khớp tên class chính.
- Không đổi tên public API hoặc schema nếu chưa đánh giá ảnh hưởng.

## 4. Tổ chức và phân lớp

Luồng truy cập dữ liệu của ClinicCare:

`WPF → HTTP/JSON API → Application/Domain → Repository → ADO.NET/Npgsql → PostgreSQL`

### 4.1. WPF / MVVM

- MUST để View (`.xaml`) tập trung vào hiển thị và binding.
- MUST đặt trạng thái màn hình, command và điều phối tương tác trong ViewModel theo mô hình MVVM đã thống nhất.
- MUST gọi Web API qua client/service phù hợp; WPF không kết nối trực tiếp PostgreSQL.
- MUST tránh đặt nghiệp vụ đặt lịch, SQL hoặc quy tắc phân quyền trong code-behind.
- SHOULD thể hiện trạng thái loading, empty, error và forbidden khi phù hợp.
- SHOULD không dùng màu sắc làm dấu hiệu duy nhất để phân biệt trạng thái.
- Không thêm thư viện MVVM mới nếu chưa thống nhất trong nhóm.

### 4.2. ASP.NET Core Web API

- Controller/endpoint MUST tập trung vào HTTP concerns: nhận request, gọi service/use case và trả response.
- Nghiệp vụ MUST được đặt trong lớp phù hợp, không dồn toàn bộ vào controller.
- Request/response MUST dùng DTO phù hợp; không trả trực tiếp đối tượng dữ liệu nội bộ nếu có nguy cơ lộ trường không cần thiết.
- Endpoint cần xác thực/phân quyền MUST được cấu hình và kiểm tra ở server.
- Validation lỗi đầu vào MUST trả phản hồi nhất quán và không tiết lộ thông tin nội bộ.
- Khi đổi route, DTO, status code hoặc schema response, MUST cập nhật API contract và thông báo cho người làm UI/QA.

### 4.3. Application/Domain và Repository

- Quy tắc nghiệp vụ MUST có một nơi xử lý chính, có thể kiểm thử độc lập.
- Repository chịu trách nhiệm truy cập dữ liệu; không đặt quy tắc UI trong repository.
- Dùng interface cho dependency khi kiến trúc hiện tại yêu cầu hoặc khi cần tách biệt để kiểm thử.
- Không tạo abstraction chỉ để tăng số lớp; abstraction cần có mục đích rõ ràng.

## 5. C# và .NET

- MUST dùng `async`/`await` cho I/O bất đồng bộ khi thư viện hỗ trợ.
- MUST tránh `.Result` và `.Wait()` trong luồng UI và các đường đi bất đồng bộ thông thường.
- MUST giải phóng connection, command, reader và stream bằng `using`/`await using` phù hợp.
- SHOULD truyền `CancellationToken` cho thao tác dài nếu chuỗi gọi hỗ trợ.
- SHOULD dùng constructor injection cho dependency.
- SHOULD bật và xử lý nullable reference types nếu cấu hình solution hỗ trợ.
- Không dùng `catch (Exception)` để bỏ qua lỗi hoặc trả kết quả thành công giả.
- Chỉ bắt exception khi có thể xử lý, bổ sung ngữ cảnh hoặc chuyển đổi lỗi ở đúng tầng.
- Tránh magic number/string; đặt giá trị nghiệp vụ dùng nhiều nơi vào hằng số hoặc cấu hình có tên rõ ràng.
- Không dùng `async void`, ngoại trừ event handler bắt buộc theo framework.

Ví dụ:

```csharp
public async Task<Appointment?> GetByIdAsync(
    Guid appointmentId,
    CancellationToken cancellationToken)
{
    return await _appointmentRepository.GetByIdAsync(
        appointmentId,
        cancellationToken);
}
```

Đây là ví dụ quy ước; chữ ký method thực tế phải khớp interface và kiểu ID của dự án.

## 6. ADO.NET và PostgreSQL

> Nếu yêu cầu đồ án bắt buộc ADO.NET, mọi truy cập dữ liệu runtime phải tuân thủ quyết định kiến trúc đã được nhóm chốt. Không tự ý thay ADO.NET bằng Entity Framework Core. Nếu scaffold hiện tại đang dùng EF Core, Tech Lead cần ghi nhận quyết định chuyển đổi hoặc ngoại lệ trong ADR trước khi thay đổi.

- MUST dùng parameterized query; không nối chuỗi input người dùng vào SQL.
- MUST quản lý vòng đời `NpgsqlConnection`, `NpgsqlCommand`, `NpgsqlDataReader` đúng cách.
- MUST dùng transaction cho thao tác nhiều bước cần tính nguyên tử.
- MUST xử lý lỗi constraint/xung đột dữ liệu theo quy tắc nghiệp vụ.
- MUST bảo vệ chống đặt lịch trùng ở backend/database; kiểm tra slot ở UI không đủ khi có request đồng thời.
- SHOULD dùng khóa ngoại, unique/exclusion constraint và index phù hợp để bảo vệ tính toàn vẹn và hiệu năng.
- SHOULD dùng migration/script có phiên bản và lưu trong Git.
- SHOULD chọn kiểu dữ liệu .NET/PostgreSQL tương thích rõ ràng.
- Thời gian MUST theo quy ước thống nhất; lưu/trao đổi theo UTC khi phù hợp và chuyển sang múi giờ hiển thị ở lớp giao diện.
- Không lưu password dạng plaintext; dùng cơ chế hash mật khẩu phù hợp ở backend.
- Không ghi connection string chứa secret vào mã nguồn hoặc tài liệu công khai.

Ví dụ parameterized query:

```csharp
const string sql = """
    SELECT appointment_id, patient_id, status
    FROM appointments
    WHERE appointment_id = @appointment_id;
    """;

await using var command = new NpgsqlCommand(sql, connection);
command.Parameters.AddWithValue("appointment_id", appointmentId);
```

Ví dụ chỉ minh họa cách truyền tham số. Code thực tế phải bảo đảm kiểu tham số tương thích, kết nối được mở đúng cách và tài nguyên được giải phóng.

### 6.1. Quy ước SQL

- Table/column dùng `snake_case`, tên rõ nghĩa và nhất quán.
- Primary key: `pk_<table>`.
- Foreign key: `fk_<table>_<referenced_table>`.
- Index: `ix_<table>_<columns>`.
- Unique constraint: `uq_<table>_<columns>`.
- Check constraint: `ck_<table>_<rule>`.
- Mỗi thay đổi schema MUST có script/migration và được kiểm tra trên database phát triển.
- Không sửa schema trên môi trường dùng chung mà không ghi lại thay đổi trong Git.

## 7. API, validation và lỗi

- Request MUST được validate ở backend, kể cả khi WPF đã kiểm tra đầu vào.
- Dùng status code nhất quán: ví dụ `400` cho request không hợp lệ, `401` cho chưa xác thực, `403` cho không đủ quyền, `404` cho tài nguyên không tồn tại, `409` cho xung đột nghiệp vụ khi phù hợp.
- Response lỗi SHOULD có cấu trúc nhất quán, mã lỗi có thể nhận diện và thông điệp an toàn.
- Không trả stack trace, câu SQL, đường dẫn máy chủ hoặc secret cho client.
- Không tin tưởng `patientId`, `role`, `userId` hoặc quyền sở hữu do client gửi nếu chưa xác minh ở server.
- Khi thay đổi contract API, cập nhật `openapi.yaml` và kiểm tra ảnh hưởng đến client/test.

## 8. Bảo mật và dữ liệu nhạy cảm

- MUST không commit password, token, API key, private key hoặc secret thật.
- MUST ưu tiên dữ liệu giả cho seed/demo/test; không dùng dữ liệu bệnh nhân thật nếu chưa có phê duyệt phù hợp.
- MUST không ghi password, token hoặc hồ sơ bệnh nhân nhạy cảm vào log.
- MUST kiểm tra authorization ở server cho mọi tài nguyên cần giới hạn quyền.
- MUST kiểm tra quyền sở hữu tài nguyên để giảm nguy cơ IDOR.
- SHOULD dùng `.env.example` hoặc cấu hình mẫu không chứa secret; secret thật phải được cung cấp qua môi trường cục bộ an toàn.
- Nếu secret đã commit, báo Tech Lead, thu hồi/đổi secret và xử lý lịch sử Git; xóa khỏi file mới nhất là chưa đủ.

## 9. Logging và cấu hình

- Log cần có ngữ cảnh như operation, request/correlation ID và mã lỗi khi phù hợp.
- Không log dữ liệu nhạy cảm chỉ để tiện debug.
- Cấu hình theo môi trường; không hardcode URL API, thông tin kết nối hoặc khóa bí mật trong logic nghiệp vụ.
- Cung cấp file cấu hình mẫu với giá trị placeholder.
- Không để lỗi bị nuốt; lỗi cần được xử lý hoặc truyền lên tầng chịu trách nhiệm.

## 10. Comment và tài liệu code

- Viết code tự mô tả trước khi thêm comment.
- Comment giải thích lý do, ràng buộc hoặc quyết định khó thấy; tránh lặp lại nguyên văn câu lệnh.
- Public API phức tạp SHOULD có XML documentation khi hữu ích.
- TODO MUST mô tả việc cần làm và SHOULD gắn ticket, ví dụ `// TODO(CC-123): handle retry policy`.
- Khi thay đổi hành vi, API, schema hoặc cách chạy, cập nhật tài liệu tương ứng.

## 11. Testing

- Logic nghiệp vụ quan trọng MUST có test tương ứng.
- Test MUST có tên diễn đạt điều kiện và kết quả mong đợi.
- Test dữ liệu MUST bao gồm trường hợp thành công, dữ liệu không hợp lệ và lỗi/xung đột quan trọng.
- Với đặt lịch, cần kiểm tra slot đã đặt, cutoff đổi/hủy, quyền sở hữu lịch hẹn và xung đột đồng thời.
- Không đánh dấu test là đạt nếu test chưa thực sự chạy.
- Test SHOULD độc lập, có dữ liệu thiết lập rõ ràng và không phụ thuộc thứ tự chạy.

Ví dụ tên test:

```csharp
CreateBooking_WhenSlotIsTaken_ReturnsConflict()
CancelAppointment_WhenOutsideAllowedWindow_ReturnsValidationError()
GetPatientProfile_WhenUserDoesNotOwnProfile_ReturnsForbidden()
```

## 12. Checklist trước Pull Request

- [ ] Thay đổi đúng phạm vi task; không có file debug hoặc output không cần thiết.
- [ ] Code tuân thủ quy tắc đặt tên và phân lớp.
- [ ] Build thành công.
- [ ] Test liên quan đã chạy; kết quả được ghi nhận trung thực.
- [ ] Không có secret hoặc dữ liệu nhạy cảm trong diff.
- [ ] SQL có parameter; transaction và xử lý lỗi phù hợp.
- [ ] API contract/schema/tài liệu được cập nhật nếu cần.
- [ ] Đã tự review diff và xử lý cảnh báo quan trọng.
- [ ] PR mô tả mục tiêu, cách kiểm thử và liên kết task.

## 13. Ngoại lệ và cập nhật

- Ngoại lệ quan trọng cần nêu lý do trong Pull Request và được Tech Lead chấp thuận.
- Mọi thay đổi convention phải qua Pull Request, được review và thông báo cho cả nhóm.
- Cập nhật tài liệu khi kiến trúc, framework hoặc yêu cầu môn học thay đổi.
