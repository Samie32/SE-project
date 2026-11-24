<#ftl output_format="HTML" auto_esc=true>
<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Quên mật khẩu — ClinicCare</title>
  <link rel="stylesheet" href="${url.resourcesPath}/css/cliniccare.css?v=3">
  <script src="${url.resourcesPath}/js/auth.js?v=3" defer></script>
</head>
<body>
<#macro icon kind>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
<#if kind == "user"><circle cx="12" cy="8" r="3.2"/><path d="M5 20.5v-2a6.5 6.5 0 0 1 14 0v2"/>
<#elseif kind == "check"><path d="m5 12 4.5 4.5L19 7"/>
<#else><path d="m12 3 8 4v5c0 5-8 9-8 9s-8-4-8-9V7z"/><path d="m8 12 3 3 5-6"/></#if>
</svg>
</#macro>
<#macro logo dark=false>
  <div class="brand<#if dark> brand--dark</#if>">
    <span class="brand-logo"><img src="${url.resourcesPath}/img/logo-icon.png" alt="" aria-hidden="true"></span>
    <span class="brand-name">Clinic<em>Care</em></span>
  </div>
</#macro>
<main class="login">
  <section class="visual">
    <@logo />
    <div class="intro">
      <span class="eyebrow">KHÔI PHỤC QUYỀN TRUY CẬP</span>
      <h1>Đặt lại mật khẩu<br>an toàn qua email.</h1>
      <p>Áp dụng cho cả tài khoản bệnh nhân và tài khoản nhân sự phòng khám đã có email xác thực.</p>
      <ul class="visual-points">
        <li><@icon kind="check" /> Liên kết khôi phục có thời hạn ngắn và dùng một lần</li>
        <li><@icon kind="check" /> Tự động mở khóa tạm nếu nhập sai mật khẩu trước đó</li>
      </ul>
    </div>
    <small class="privacy"><@icon kind="shield" />Phản hồi trung tính để bảo vệ quyền riêng tư tài khoản</small>
  </section>
  <section class="form-panel">
    <div class="form-wrap">
      <div class="mobile-brand"><@logo dark=true /></div>
      <span class="eyebrow">KHÔI PHỤC TÀI KHOẢN</span>
      <h2>Quên mật khẩu</h2>
      <p class="subtitle">Nhập email hoặc tên đăng nhập của tài khoản để nhận liên kết đặt lại mật khẩu qua email.</p>
      <#if message?has_content>
        <div class="alert ${message.type}" role="alert">${kcSanitize(message.summary)?no_esc}</div>
      </#if>
      <form id="kc-reset-password-form" action="${url.loginAction}" method="post" data-auth-form="1">
        <div class="field-group" style="margin-top:0">
          <label for="username">Email hoặc tên đăng nhập <span class="req">*</span></label>
          <div class="input<#if messagesPerField.existsError('username')> is-invalid</#if>">
            <@icon kind="user" />
            <input id="username" name="username" type="text" value="${(auth.attemptedUsername!'')}"
                   placeholder="ten@example.com hoặc tên đăng nhập"
                   autocomplete="username" autofocus required
                   aria-invalid="${messagesPerField.existsError('username')?c}">
          </div>
          <#if messagesPerField.existsError('username')>
            <p class="field-error" role="alert">${kcSanitize(messagesPerField.get('username'))?no_esc}</p>
          </#if>
        </div>
        <div class="btn-stack">
          <button type="submit" class="btn-primary" data-loading-text="Đang gửi liên kết…">Gửi liên kết đặt lại mật khẩu</button>
        </div>
      </form>
      <p class="account-link"><a href="${url.loginUrl}">← Quay lại đăng nhập</a></p>
    </div>
  </section>
</main>
</body>
</html>
