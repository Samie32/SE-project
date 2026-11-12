<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Đăng nhập tài khoản — ClinicCare</title>
  <link rel="stylesheet" href="${url.resourcesPath}/css/cliniccare.css">
</head>
<body>
<#macro icon kind>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
<#if kind == "logo"><path d="M6 3v5a4 4 0 0 0 8 0V3M4 3h4m4 0h4M10 12v3a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="10" r="2"/>
<#elseif kind == "user"><circle cx="12" cy="8" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/>
<#elseif kind == "arrow"><path d="M5 12h14m-6-6 6 6-6 6"/>
<#elseif kind == "info"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>
<#else><path d="m12 3 8 4v5c0 5-8 9-8 9s-8-4-8-9V7z"/><path d="m8 12 3 3 5-6"/></#if>
</svg>
</#macro>
<#macro logo><div class="brand"><span><@icon kind="logo" /></span><b>Clinic<em>Care</em></b></div></#macro>
<main class="login">
  <section class="visual">
    <@logo />
    <div class="intro"><span class="eyebrow">CHĂM SÓC SỨC KHỎE CHỦ ĐỘNG</span><h1>Sức khỏe của bạn,<br>luôn trong tầm tay.</h1><p>Đặt lịch, theo dõi hồ sơ và kết nối với bác sĩ mọi lúc, mọi nơi.</p></div>
    <small class="privacy"><@icon kind="shield" />Thông tin của bạn được bảo vệ trong hệ thống phòng khám</small>
  </section>
  <section class="form-panel">
    <div class="form-wrap">
      <div class="mobile-brand"><@logo /></div>
      <span class="eyebrow">CHÀO MỪNG TRỞ LẠI</span>
      <h2>Đăng nhập tài khoản</h2>
      <p class="subtitle">Nhập thông tin để tiếp tục đến cổng bệnh nhân.</p>
      <#if messagesPerField.existsError('username','password')>
        <div class="alert error" role="alert">${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}</div>
      <#elseif message?has_content>
        <div class="alert ${message.type}" role="alert">${kcSanitize(message.summary)?no_esc}</div>
      </#if>
      <#if realm.password>
      <form id="kc-form-login" action="${url.loginAction}" method="post">
        <#if !usernameHidden??>
        <label for="username">Tài khoản hoặc email</label>
        <div class="input"><@icon kind="user" /><input id="username" name="username" type="text" value="${(login.username!'')}" autocomplete="username" autofocus required aria-invalid="${messagesPerField.existsError('username','password')?c}"></div>
        </#if>
        <label for="password">Mật khẩu</label>
        <div class="input"><@icon kind="shield" /><input id="password" name="password" type="password" autocomplete="current-password" required aria-invalid="${messagesPerField.existsError('username','password')?c}"></div>
        <div class="options">
          <#if realm.rememberMe && !usernameHidden??>
          <label class="remember"><input id="rememberMe" name="rememberMe" type="checkbox" <#if login.rememberMe??>checked</#if>>Ghi nhớ đăng nhập</label>
          <#else><span></span></#if>
          <#if realm.resetPasswordAllowed>
          <a href="${url.loginResetCredentialsUrl}">Quên mật khẩu?</a>
          <#else>
          <details class="forgot"><summary>Quên mật khẩu?</summary><p>Vui lòng liên hệ quản trị viên phòng khám để được hỗ trợ đặt lại mật khẩu.</p></details>
          </#if>
        </div>
        <input type="hidden" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>>
        <button id="kc-login" name="login" type="submit">Đăng nhập <@icon kind="arrow" /></button>
      </form>
      </#if>
      <div class="demo"><@icon kind="info" /><span><b>Tài khoản dùng thử</b><small>patient · Mật khẩu do nhóm cung cấp</small></span></div>
    </div>
  </section>
</main>
</body>
</html>
