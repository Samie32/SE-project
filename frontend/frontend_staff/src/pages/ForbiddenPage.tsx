import { Link } from "react-router-dom";

export function ForbiddenPage() {
  return (
    <div className="panel" style={{ maxWidth: 560, margin: "40px auto", textAlign: "center" }}>
      <h1 style={{ marginTop: 0 }}>403 — Không đủ quyền</h1>
      <p className="sub">Vai trò của tài khoản không được phép sử dụng chức năng này.</p>
      <Link className="btn primary" to="/">
        Về trang chính
      </Link>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="panel" style={{ maxWidth: 560, margin: "40px auto", textAlign: "center" }}>
      <h1 style={{ marginTop: 0 }}>404 — Không tìm thấy trang</h1>
      <Link className="btn primary" to="/">
        Về trang chính
      </Link>
    </div>
  );
}
