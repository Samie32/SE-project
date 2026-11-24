<#ftl output_format="HTML" auto_esc=true>
<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Đăng nhập tài khoản — ClinicCare</title>
  <link rel="stylesheet" href="${url.resourcesPath}/css/cliniccare.css?v=3">
  <script src="${url.resourcesPath}/js/auth.js?v=3" defer></script>
</head>
<body>
<#macro icon kind>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
<#if kind == "user"><circle cx="12" cy="8" r="3.2"/><path d="M5 20.5v-2a6.5 6.5 0 0 1 14 0v2"/>
<#elseif kind == "lock"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
<#elseif kind == "arrow"><path d="M5 12h14m-6-6 6 6-6 6"/>
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
      <span class="eyebrow">HỆ THỐNG PHÒNG KHÁM &amp; KHÁM TỪ XA</span>
      <h1>Chăm sóc sức khỏe,<br>kết nối đồng bộ.</h1>
      <p>Nền tảng thống nhất dành cho bệnh nhân, bác sĩ và đội ngũ vận hành phòng khám.</p>
      <ul class="visual-points">
        <li><@icon kind="check" /> Đặt lịch trực tiếp &amp; khám từ xa theo thời gian thực</li>
        <li><@icon kind="check" /> Hồ sơ bệnh án điện tử và đơn thuốc bảo mật</li>
        <li><@icon kind="check" /> Tiếp đón, hàng đợi và điều phối ca khám minh bạch</li>
      </ul>
    </div>
    <small class="privacy"><@icon kind="shield" />Phiên đăng nhập bảo vệ bằng OIDC PKCE và mã hóa dữ liệu chuẩn y tế</small>
  </section>
  <section class="form-panel">
    <div class="form-wrap">
      <div class="mobile-brand"><@logo dark=true /></div>
      <span class="eyebrow">ĐĂNG NHẬP HỆ THỐNG</span>
      <h2>Đăng nhập tài khoản</h2>
      <p class="subtitle">Đăng nhập bằng tài khoản bệnh nhân hoặc tài khoản nhân sự phòng khám.</p>
      <#if messagesPerField.existsError('username','password')>
        <div class="alert error" role="alert">${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}</div>
      <#elseif message?has_content>
        <div class="alert ${message.type}" role="alert">${kcSanitize(message.summary)?no_esc}</div>
      </#if>
      <#if realm.password>
      <form id="kc-form-login" action="${url.loginAction}" method="post" data-auth-form="1">
        <#if !usernameHidden??>
        <div class="field-group" style="margin-top:0">
          <label for="username">Email hoặc tên đăng nhập</label>
          <div class="input<#if messagesPerField.existsError('username','password')> is-invalid</#if>">
            <@icon kind="user" />
            <input id="username" name="username" type="text" value="${(login.username!'')}"
                   placeholder="ten@example.com hoặc mã nhân sự"
                   autocomplete="username" autofocus required
                   aria-invalid="${messagesPerField.existsError('username','password')?c}">
          </div>
        </div>
        </#if>
        <div class="field-group">
          <label for="password">Mật khẩu</label>
          <div class="input<#if messagesPerField.existsError('username','password')> is-invalid</#if>">
            <@icon kind="lock" />
            <input id="password" name="password" type="password"
                   placeholder="Nhập mật khẩu của bạn"
                   autocomplete="current-password" required
                   aria-invalid="${messagesPerField.existsError('username','password')?c}">
            <button type="button" class="pw-toggle" data-target="password" aria-label="Hiện mật khẩu" aria-pressed="false"></button>
          </div>
        </div>
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
        <button id="kc-login" class="btn-primary" name="login" type="submit" data-loading-text="Đang đăng nhập…">
          Đăng nhập <@icon kind="arrow" />
        </button>
      </form>
      <#if social?? && social.providers?has_content>
        <div class="social-divider"><span>hoặc</span></div>
        <div class="social-providers">
          <#list social.providers as p>
            <a id="social-${p.alias}" class="social-btn social-${p.providerId}" href="${p.loginUrl}">
              <#if p.providerId == "google">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3.01h3.88c2.27-2.09 3.54-5.17 3.54-8.88Z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.01c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z"/>
                  <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11Z"/>
                  <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z"/>
                </svg>
              </#if>
              <span>Tiếp tục với ${p.displayName}</span>
            </a>
          </#list>
        </div>
      </#if>
      <#if realm.registrationAllowed && !registrationDisabled??>
        <p class="account-link">Bạn là bệnh nhân mới? <a href="${url.registrationUrl}">Tạo tài khoản bệnh nhân</a></p>
      </#if>
      <p class="role-note">Tài khoản bác sĩ và nhân sự do quản trị viên phòng khám cấp.</p>
      </#if>
    </div>
  </section>
</main>
</body>
</html>
