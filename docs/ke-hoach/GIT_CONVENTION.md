# ClinicCare — Git & Commit Convention

- **Phiên bản:** 1.0
- **Trạng thái:** Đề xuất áp dụng cho đồ án
- **Phạm vi:** Git, branch, commit message, Pull Request và merge

## 1. Mục đích và mức độ bắt buộc

Tài liệu này giúp nhóm có lịch sử Git dễ đọc, dễ truy vết theo task và giảm xung đột khi tích hợp code.

- **MUST / BẮT BUỘC:** phải tuân thủ.
- **SHOULD / NÊN:** nên tuân thủ; nếu không áp dụng cần có lý do.

## 2. Quy tắc chung

1. MUST tạo branch riêng cho mỗi task hoặc thay đổi có mục tiêu rõ ràng.
2. MUST không phát triển trực tiếp trên `main`.
3. MUST không commit secret, token, mật khẩu, dữ liệu bệnh nhân thật hoặc file build không cần thiết.
4. MUST tự kiểm tra thay đổi trước khi commit và trước khi tạo Pull Request.
5. SHOULD giữ commit nhỏ, tập trung vào một thay đổi logic chính.
6. MUST đồng bộ với branch đích trước khi merge và xử lý conflict có kiểm tra.
7. Không dùng `git push --force` trên branch dùng chung hoặc branch `main`.

## 3. Quy ước đặt tên branch

Định dạng:

```text
<type>/<ticket-id>-<short-description>
```

Ví dụ:

```text
feature/CC-101-patient-profile
feature/CC-102-appointment-booking
fix/CC-115-double-booking
docs/CC-120-coding-convention
test/CC-130-booking-conflict
refactor/CC-140-appointment-service
chore/CC-150-ci-validation
hotfix/CC-160-authentication-error
```

### 3.1. Prefix được phép

| Prefix | Mục đích |
|---|---|
| `feature/` | Chức năng mới |
| `fix/` | Sửa lỗi |
| `refactor/` | Tái cấu trúc, không nhằm thay đổi hành vi |
| `test/` | Thêm hoặc sửa kiểm thử |
| `docs/` | Tài liệu |
| `chore/` | Bảo trì hoặc công việc phụ trợ |
| `build/` | Cấu hình build/dependency |
| `ci/` | CI/CD |
| `hotfix/` | Sửa lỗi khẩn cấp trên bản phát hành |

### 3.2. Quy tắc tên branch

- Dùng chữ thường, từ cách nhau bằng dấu gạch ngang.
- `ticket-id` là mã task/issue của nhóm. Nếu nhóm chưa dùng mã ticket, hãy thống nhất cách thay thế trước khi áp dụng.
- Mỗi branch chỉ nên giải quyết một task hoặc một mục tiêu liên quan.
- Không dùng tên mơ hồ như `my-branch`, `test1`, `final-code`.
- Sau khi merge, xóa branch nếu không còn cần dùng.

## 4. Quy ước commit message

Định dạng dựa trên Conventional Commits:

```text
<type>(<scope>): <short summary>
```

Ví dụ:

```text
feat(appointment): add appointment booking endpoint
fix(booking): prevent duplicate appointment slots
feat(patient): add patient profile screen
test(appointment): cover booking conflict scenarios
docs(api): document appointment endpoints
refactor(repository): simplify appointment queries
ci(build): validate solution on pull request
```

`scope` nên là module hoặc phần bị ảnh hưởng, ví dụ `auth`, `patient`, `doctor`, `appointment`, `repository`, `database`, `ui`, `api`, `test`, `docs`.

### 4.1. Commit type được phép

| Type | Sử dụng khi |
|---|---|
| `feat` | Thêm chức năng |
| `fix` | Sửa lỗi |
| `refactor` | Tái cấu trúc mà không chủ đích đổi hành vi |
| `test` | Thêm/sửa test |
| `docs` | Thay đổi tài liệu |
| `style` | Chỉ format hoặc chỉnh style code, không đổi logic |
| `perf` | Cải thiện hiệu năng |
| `build` | Build system hoặc dependency |
| `ci` | Pipeline CI/CD |
| `chore` | Bảo trì khác |
| `revert` | Hoàn tác commit |

### 4.2. Quy tắc summary

- Viết summary bằng tiếng Anh để thống nhất với code và branch.
- Bắt đầu bằng hành động cụ thể; mô tả thay đổi đã thực hiện.
- Nên giữ dòng đầu khoảng 72 ký tự hoặc ngắn hơn.
- Không kết thúc summary bằng dấu chấm.
- Không viết chung chung như `update`, `fix bug`, `changes`, `final version`.
- Một commit nên chứa một thay đổi logic chính.
- Không commit code chưa hoàn chỉnh để tích hợp/review trừ khi nhóm đã thống nhất cách xử lý.

### 4.3. Ví dụ tốt và chưa tốt

Tốt:

```text
feat(appointment): validate booking time window
fix(auth): reject requests without valid role
test(repository): cover transaction rollback
docs(setup): explain local database configuration
```

Không nên dùng:

```text
update
fix bug
done
final final
sua code
```

### 4.4. Commit có body

Với thay đổi phức tạp, có thể thêm body sau một dòng trống:

```text
fix(booking): prevent duplicate appointment slots

- Validate slot availability in the application layer.
- Handle database conflicts as a booking conflict response.
- Add tests for concurrent booking attempts.

Refs: CC-115
```

Không bắt buộc dùng body cho commit nhỏ; nên dùng khi cần giải thích lý do hoặc hệ quả của thay đổi.

## 5. Quy trình làm việc với Git

### Bước 1 — Cập nhật branch đích

```bash
git switch main
git pull origin main
```

### Bước 2 — Tạo branch cho task

```bash
git switch -c feature/CC-102-appointment-booking
```

### Bước 3 — Kiểm tra và stage thay đổi

```bash
git status
git diff
git diff --staged
```

Stage file có chủ đích:

```bash
git add path/to/changed-file
```

Chỉ dùng `git add .` khi đã kiểm tra kỹ để chắc chắn không stage secret, build output hoặc thay đổi ngoài phạm vi.

### Bước 4 — Commit

```bash
git commit -m "feat(appointment): add appointment booking endpoint"
```

### Bước 5 — Push branch

```bash
git push -u origin feature/CC-102-appointment-booking
```

### Bước 6 — Tạo Pull Request

Tạo PR từ branch task vào `main`, ghi mục tiêu, thay đổi chính, cách kiểm thử, liên kết task/issue và ảnh chụp UI nếu có thay đổi giao diện.

### Bước 7 — Review, merge và dọn branch

- Chờ ít nhất một thành viên khác review.
- Xử lý góp ý và chạy lại test cần thiết.
- Chỉ merge khi các điều kiện bắt buộc đạt.
- Xóa branch sau khi merge nếu không còn cần dùng.
- Cập nhật trạng thái task.

## 6. Quy tắc Pull Request

Mỗi PR SHOULD có:
- Tiêu đề rõ ràng theo mục tiêu thay đổi.
- Mô tả vấn đề và giải pháp.
- Danh sách thay đổi chính.
- Cách chạy test và kết quả test thực tế.
- Ảnh chụp màn hình nếu thay đổi WPF/UI.
- Liên kết task/issue.
- Ghi chú về schema, API contract, cấu hình hoặc migration nếu có.

PR MUST:
- Có phạm vi hợp lý, không gộp nhiều tính năng không liên quan.
- Không chứa secret hoặc dữ liệu nhạy cảm.
- Build thành công và test liên quan đã chạy.
- Được ít nhất một thành viên khác review.
- Không còn góp ý bắt buộc chưa giải quyết.
- Cập nhật tài liệu liên quan nếu thay đổi API, schema, cách chạy hoặc hành vi nghiệp vụ.

## 7. Chiến lược merge

- `main` SHOULD luôn ở trạng thái có thể build và demo theo mức hoàn thiện hiện tại.
- MUST không merge PR có lỗi build hoặc test bắt buộc thất bại.
- Nhóm SHOULD chọn một cách merge thống nhất trong GitHub repository settings.
- **Squash and merge** phù hợp nếu muốn mỗi PR tạo một commit tổng hợp gọn trong `main`.
- Nếu dùng squash merge, commit tổng hợp SHOULD theo format tại mục 4.
- Không sửa lịch sử hoặc force-push branch của thành viên khác nếu chưa trao đổi.

## 8. Xử lý conflict

1. Cập nhật branch đích theo quy trình nhóm đã thống nhất.
2. Xác định file và đoạn code bị conflict.
3. Không chọn toàn bộ một phía theo thói quen; đọc và kết hợp ý nghĩa của cả hai thay đổi.
4. Chạy build và test liên quan sau khi xử lý.
5. Thông báo cho tác giả thay đổi liên quan nếu conflict ảnh hưởng nghiệp vụ, API hoặc schema.

## 9. `.gitignore` và dữ liệu nhạy cảm

Các mẫu thường cần xem xét trong `.gitignore`:

```gitignore
# Visual Studio
.vs/
[Bb]in/
[Oo]bj/
*.user
*.suo

# Build/test output
artifacts/
TestResults/
*.log

# Local secrets
.env
.env.*
!.env.example
appsettings.Local.json
```

Đây là ví dụ tham khảo, không thay thế việc kiểm tra `.gitignore` hiện có. Chỉ ignore file cấu hình cục bộ nếu nhóm đã xác định file đó không phải cấu hình mẫu bắt buộc.

- MUST không commit secret thật, token, mật khẩu hoặc dữ liệu bệnh nhân thật.
- File cấu hình mẫu SHOULD dùng placeholder và không chứa thông tin đăng nhập hợp lệ.
- Nếu secret bị commit, báo Tech Lead ngay, thu hồi/đổi secret và phối hợp xử lý lịch sử Git. Xóa secret ở commit mới nhất không đảm bảo secret đã biến mất khỏi lịch sử.
- Không commit file sinh tự động hoặc output lớn trừ khi có lý do dự án rõ ràng.

## 10. Definition of Done cho PR

- [ ] Branch và commit message đúng convention.
- [ ] Phạm vi PR đúng task, diff đã được tự review.
- [ ] Build thành công.
- [ ] Test liên quan đã chạy và kết quả được ghi nhận.
- [ ] Không có secret hoặc dữ liệu nhạy cảm trong diff.
- [ ] Tài liệu/API/schema được cập nhật nếu cần.
- [ ] Đã có review và xử lý góp ý bắt buộc.
- [ ] PR được merge theo quy trình nhóm.
- [ ] Task board được cập nhật.

## 11. Ngoại lệ và cập nhật

- Ngoại lệ quan trọng cần nêu lý do trong PR và được Tech Lead chấp thuận.
- Thay đổi convention phải qua PR và thông báo cho toàn nhóm.
- Nếu repository có branch protection, CI hoặc quy tắc giảng viên yêu cầu, cập nhật tài liệu để khớp cấu hình thực tế.
