<#ftl output_format="HTML" auto_esc=true>
<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><#if isAppInitiatedAction??>Đổi mật khẩu<#else>Thiết lập mật khẩu mới</#if> — ClinicCare</title>
  <link rel="stylesheet" href="${url.resourcesPath}/css/cliniccare.css?v=3">
  <script src="${url.resourcesPath}/js/auth.js?v=3" defer></script>
</head>
<body>
<#macro icon kind>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
<#if kind == "lock"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
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
      <span class="eyebrow"><#if isAppInitiatedAction??>BẢO MẬT TÀI KHOẢN<#else>THIẾT LẬP BẢO MẬT</#if></span>
      <h1>Bảo vệ tài khoản<br>bằng mật khẩu mạnh.</h1>
      <p>Hệ thống áp dụng cho mọi vai trò (bệnh nhân, bác sĩ, lễ tân, quản trị và kiểm toán). Mật khẩu được quản lý trực tiếp tại máy chủ xác thực.</p>
      <ul class="visual-points">
        <li><@icon kind="check" /> Tối thiểu 8 ký tự, nên kết hợp chữ hoa, số và ký tự đặc biệt</li>
        <li><@icon kind="check" /> Tùy chọn đăng xuất các thiết bị khác ngay khi cập nhật</li>
      </ul>
    </div>
    <small class="privacy"><@icon kind="shield" />Ứng dụng không bao giờ lưu trữ hoặc đọc mật khẩu của bạn</small>
  </section>
  <section class="form-panel">
    <div class="form-wrap">
      <div class="mobile-brand"><@logo dark=true /></div>
      <#if isAppInitiatedAction??>
        <span class="eyebrow">TÀI KHOẢN CỦA TÔI</span>
        <h2>Đổi mật khẩu</h2>
        <p class="subtitle">Cập nhật mật khẩu mới (tối thiểu 8 ký tự). Sau khi hoàn tất, bạn sẽ quay lại trang Tài khoản.</p>
      <#else>
        <span class="eyebrow">CẬP NHẬT MẬT KHẨU</span>
        <h2>Thiết lập mật khẩu mới</h2>
        <p class="subtitle">Nhập mật khẩu mới tối thiểu 8 ký tự để tiếp tục truy cập hệ thống ClinicCare.</p>
      </#if>
      <#if message?has_content && !messagesPerField.existsError('password','password-confirm')>
        <div class="alert ${message.type}" role="alert">${kcSanitize(message.summary)?no_esc}</div>
      </#if>
      <form id="kc-passwd-update-form" action="${url.loginAction}" method="post" data-auth-form="1">
        <div class="field-group" style="margin-top:0">
          <label for="password-new">Mật khẩu mới <span class="req">*</span></label>
          <div class="input<#if messagesPerField.existsError('password','password-confirm')> is-invalid</#if>">
            <@icon kind="lock" />
            <input id="password-new" name="password-new" type="password" autocomplete="new-password"
                   placeholder="Tối thiểu 8 ký tự"
                   minlength="8" autofocus required
                   aria-invalid="${messagesPerField.existsError('password','password-confirm')?c}">
            <button type="button" class="pw-toggle" data-target="password-new" aria-label="Hiện mật khẩu" aria-pressed="false"></button>
          </div>
          <#if messagesPerField.existsError('password')>
            <p class="field-error" role="alert">${kcSanitize(messagesPerField.get('password'))?no_esc}</p>
          </#if>
        </div>

        <div class="field-group">
          <label for="password-confirm">Nhập lại mật khẩu mới <span class="req">*</span></label>
          <div class="input<#if messagesPerField.existsError('password-confirm')> is-invalid</#if>">
            <@icon kind="lock" />
            <input id="password-confirm" name="password-confirm" type="password" autocomplete="new-password"
                   placeholder="Nhập lại mật khẩu mới"
                   minlength="8" required
                   aria-invalid="${messagesPerField.existsError('password-confirm')?c}">
            <button type="button" class="pw-toggle" data-target="password-confirm" aria-label="Hiện mật khẩu" aria-pressed="false"></button>
          </div>
          <#if messagesPerField.existsError('password-confirm')>
            <p class="field-error" role="alert">${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}</p>
          </#if>
        </div>

        <div class="options">
          <label class="remember"><input id="logout-sessions" name="logout-sessions" type="checkbox" value="on" checked>Đăng xuất khỏi các thiết bị khác</label>
        </div>
        <div class="btn-stack">
          <button type="submit" class="btn-primary" data-loading-text="Đang cập nhật…">
            <#if isAppInitiatedAction??>Cập nhật mật khẩu<#else>Lưu mật khẩu mới</#if>
          </button>
          <#if isAppInitiatedAction??>
            <button type="submit" name="cancel-aia" value="true" class="btn-secondary" formnovalidate>Quay lại tài khoản</button>
          </#if>
        </div>
      </form>
    </div>
  </section>
</main>
</body>
</html>
