# Bảo trì sơ đồ thiết kế

Hướng dẫn nhanh để cập nhật sơ đồ và trạng thái đồng bộ giữa `SE-project-main` và trang tài liệu tĩnh `clinic-spec`.

## Tổng quan tài nguyên

| Thư mục | Nội dung | Số lượng |
|---|---|---|
| `use-case/` | Sơ đồ use-case tổng quan (27 UC) + 4 nhóm | 5 puml + 5 png |
| `sequence-diagrams/` | Tuần tự cho từng UC & cơ chế lõi (`M01–M09`) | 16 puml + 16 png |
| `activity-diagrams/` | Hoạt động có swimlane & CI/CD Auto-Rollback | 5 puml + 5 png |
| `state-diagrams/` | Trạng thái thực thể | 4 puml + 4 png |
| `class-diagram/` | Mô hình miền PIM (đồng bộ 24 thực thể `V1..V11`) | 1 puml + 1 png |
| `database/` | ERD tổng (24 bảng) + 3 góc nhìn | 4 puml + 4 png |
| `architecture/` | Kiến trúc 4+1 + Triển khai local + Triển khai Azure VM | 3 puml + 3 png |

**Tổng: 38 file `.puml` → 38 file `.png`**

## Render lại sơ đồ sau khi sửa

### Yêu cầu

- Java 8+ (đã cài) và Graphviz (`dot.exe`)
- PlantUML jar (lưu ở thư mục scratch ngoài repo):

```bash
curl -L -o plantuml-1.2024.8.jar \
  https://github.com/plantuml/plantuml/releases/download/v1.2024.8/plantuml-1.2024.8.jar
```

### Render một file / toàn bộ thư mục

```powershell
java -Dfile.encoding=UTF-8 -jar <path>\plantuml-1.2024.8.jar -tpng -charset UTF-8 `
  -graphvizdot "C:\Program Files\Graphviz\bin\dot.exe" `
  "docs\design\sequence-diagrams\*.puml"
```

## Cập nhật trang đặc tả `clinic-spec`

Trang đặc tả tĩnh nằm ở repo `clinic-spec` (`index.html`, `requirements.html`, `usecases.html`, `diagrams.html`, `testing.html`). Khi sửa sơ đồ trong `SE-project-main/docs/design/`:

1. Sửa `.puml` và render lại `.png` (DPI 150) trong `docs/design/<nhóm>/`.
2. Đồng bộ file `.png` sang `clinic-spec/assets/design/<nhóm>/`.
3. Cập nhật `clinic-spec/sections/diagrams.js`, thumbnail ở `requirements.js` và bảng trong `docs/design/README.md`.

## Lưu ý encoding tiếng Việt

- Luôn truyền `-Dfile.encoding=UTF-8` và `-charset UTF-8` khi gọi PlantUML.
- Ưu tiên `note as N1` hoặc `note over` thay vì `note bottom of` để tránh lỗi vỡ UTF-8 trên một số phiên bản PlantUML/Graphviz.
- Giữ thống nhất `skinparam dpi 150`.

## Checklist đồng bộ cuối kỳ

- [ ] Tất cả **38 `.puml`** render thành **38 `.png`**, không có PNG mồ côi hoặc `.puml` chưa render.
- [ ] `docs/design/README.md` — liệt kê đủ 38 sơ đồ và bảng chuẩn áp dụng.
- [ ] `docs/design/database/data-dictionary.md` & `erd*.puml` — khớp 100% 24 bảng từ `V1..V11` (không sót bảng cũ giả định).
- [ ] `clinic-spec/assets/design/` — khớp mã băm SHA-256 từng file `.png` với `SE-project-main/docs/design/`.
- [ ] `clinic-spec/sections/diagrams.js`, `requirements.js`, `usecases.js`, `overview.js`, `testing.js` — không có chú thích trạng thái cũ hoặc ảnh gãy.
- [ ] Dữ liệu minh họa/kiểm thử chỉ dùng dữ liệu giả; không đưa secret/token/PHI thật lên repo.
