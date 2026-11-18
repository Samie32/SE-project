# Bảo trì sơ đồ thiết kế

Hướng dẫn nhanh để cập nhật sơ đồ và trạng thái khi hoàn thiện dự án.

## Tổng quan tài nguyên

| Thư mục | Nội dung | Số lượng |
|---------|----------|----------|
| `use-case/` | Sơ đồ use-case tổng quan + 4 nhóm | 5 puml + 5 png |
| `sequence-diagrams/` | Tuần tự cho từng UC chính | 10 puml + 10 png |
| `activity-diagrams/` | Hoạt động có swimlane | 3 puml + 3 png |
| `state-diagrams/` | Trạng thái thực thể | 4 puml + 4 png |
| `class-diagram/` | Mô hình miền PIM | 1 puml + 1 png |
| `database/` | ERD tổng + 3 góc nhìn | 4 puml + 4 png |
| `architecture/` | Kiến trúc + triển khai | 2 puml + 2 png |

**Tổng: 29 file `.puml` → 29 file `.png`**

## Render lại sơ đồ sau khi sửa

### Yêu cầu

- Java 8+ (đã cài)
- PlantUML jar — tải nếu chưa có:

```bash
curl -L -o /tmp/plantuml.jar \
  https://github.com/plantuml/plantuml/releases/download/v1.2024.8/plantuml-1.2024.8.jar
```

### Render một file

```bash
java -jar /tmp/plantuml.jar -tpng -Dfile.encoding=UTF-8 \
  docs/design/sequence-diagrams/book-appointment.puml
```

### Render toàn bộ thư mục

```bash
java -jar /tmp/plantuml.jar -tpng -Dfile.encoding=UTF-8 \
  "docs/design/sequence-diagrams/*.puml"
```

### Render tất cả sơ đồ trong dự án

```bash
for dir in use-case sequence-diagrams activity-diagrams state-diagrams \
           class-diagram database architecture; do
  java -jar /tmp/plantuml.jar -tpng -Dfile.encoding=UTF-8 \
    "docs/design/$dir/*.puml"
done
```

## Cập nhật trang đặc tả HTML

Trang HTML tại `Report/spec/index.html` — mở trực tiếp bằng trình duyệt (file://), không cần server.

### Thêm sơ đồ mới

1. Viết file `.puml` trong thư mục tương ứng
2. Render ra `.png` (lệnh ở trên)
3. Thêm thẻ `<img>` vào file JS tương ứng trong `Report/spec/sections/`:

| Loại sơ đồ | File JS cần sửa |
|-------------|-----------------|
| Use-case, Sequence, Activity, State, Class, ERD, Architecture | `diagrams.js` |
| Yêu cầu chức năng (FR) kèm thumbnail sơ đồ | `requirements.js` |
| Đặc tả use-case (UC) | `usecases.js` |

Mẫu thêm ảnh vào `diagrams.js`:

```html
<div class="img-card" onclick="lb('../../docs/design/<thư-mục>/<tên>.png')">
  <img src="../../docs/design/<thư-mục>/<tên>.png" alt="<mô tả>"
       onerror="this.style.height='100px';this.alt='Không tìm thấy ảnh'">
  <div class="ic-label"><tiêu đề></div>
</div>
```

### Cập nhật trạng thái module

Trạng thái module nằm trong `Report/spec/sections/overview.js`. Mỗi module có badge trạng thái — sửa trực tiếp text trong file.

## Lưu ý encoding tiếng Việt

- PlantUML title/label dùng tiếng Việt **không dấu** (do bug encoding của PlantUML với `note bottom` block)
- Nhãn trên mũi tên (transition label) giữ được dấu tiếng Việt bình thường
- Workaround nếu mất dấu: dùng `note right of` thay vì `note bottom of`
- Tất cả sơ đồ render ở `skinparam dpi 150` để đảm bảo độ phân giải đồng nhất

## Checklist hoàn thiện dự án

Khi hoàn thiện dự án, kiểm tra theo danh sách sau:

- [ ] Tất cả `.puml` render lại thành `.png` sau lần sửa cuối
- [ ] `docs/design/README.md` — bảng danh mục sơ đồ khớp với file thực tế
- [ ] `Report/spec/sections/diagrams.js` — mọi PNG đều có `<img>` tham chiếu
- [ ] `Report/spec/sections/requirements.js` — FR-01→FR-24 đầy đủ thumbnail sơ đồ liên quan
- [ ] `Report/spec/sections/usecases.js` — UC-01→UC-24 khớp tên với sơ đồ use-case
- [ ] Mở `Report/spec/index.html` bằng trình duyệt — không có ảnh "Không tìm thấy"
- [ ] Không có file `.env`, secret, token, dữ liệu bệnh nhân thật trong repo
- [ ] Dữ liệu demo/kiểm thử dùng dữ liệu giả; mật khẩu/token đã che khi chụp màn hình

## Lệnh kiểm tra nhanh

```bash
# Liệt kê PNG không có .puml tương ứng (file legacy)
for f in docs/design/*/*.png; do
  puml="${f%.png}.puml"
  [ ! -f "$puml" ] && echo "Thiếu nguồn: $f"
done

# Liệt kê .puml không có .png (chưa render)
for f in docs/design/*/*.puml; do
  png="${f%.puml}.png"
  [ ! -f "$png" ] && echo "Chưa render: $f"
done

# Kiểm tra link gãy trong HTML spec
grep -oP 'src="[^"]*\.png"' Report/spec/sections/*.js | \
  sed 's/.*src="//;s/"//' | \
  while read p; do
    ref="Report/spec/$p"
    [ ! -f "$ref" ] && echo "Link gãy: $p"
  done
```
