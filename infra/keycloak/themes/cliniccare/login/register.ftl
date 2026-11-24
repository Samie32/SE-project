<#ftl output_format="HTML" auto_esc=true>
<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tạo tài khoản bệnh nhân — ClinicCare</title>
  <link rel="stylesheet" href="${url.resourcesPath}/css/cliniccare.css?v=3">
  <script src="${url.resourcesPath}/js/registration.js?v=3" defer></script>
  <script src="${url.resourcesPath}/js/auth.js?v=3" defer></script>
</head>
<body>
<#assign values = {}>
<#list profile.attributes as attribute>
  <#assign values = values + {attribute.name: (attribute.value!'')}>
</#list>
<#macro icon kind>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
<#if kind == "check"><path d="m5 12 4.5 4.5L19 7"/>
<#else><path d="m12 3 8 4v5c0 5-8 9-8 9s-8-4-8-9V7z"/><path d="m8 12 3 3 5-6"/></#if>
</svg>
</#macro>
<#macro logo dark=false>
  <div class="brand<#if dark> brand--dark</#if>">
    <span class="brand-logo"><img src="${url.resourcesPath}/img/logo-icon.png" alt="" aria-hidden="true"></span>
    <span class="brand-name">Clinic<em>Care</em></span>
  </div>
</#macro>
<#macro field name label type autocomplete limit required=false placeholder="" hint="" full=false>
  <div class="field-group<#if full> field-full</#if>">
    <label for="${name}">${label}<#if required> <span class="req">*</span></#if></label>
    <div class="input<#if messagesPerField.existsError(name)> is-invalid</#if>">
      <input id="${name}" name="${name}" type="${type}" autocomplete="${autocomplete}"
             <#if placeholder?has_content>placeholder="${placeholder}"</#if>
             <#if type != "password">value="${values[name]!''}"</#if>
             <#if limit gt 0>maxlength="${limit?c}"</#if>
             <#if type == "password">minlength="8"</#if>
             <#if required>required</#if>
             <#if messagesPerField.existsError(name)>aria-invalid="true" aria-describedby="error-${name}"</#if>>
      <#if type == "password">
        <button type="button" class="pw-toggle" data-target="${name}" aria-label="Hiện mật khẩu" aria-pressed="false"></button>
      </#if>
    </div>
    <#if hint?has_content && !messagesPerField.existsError(name)>
      <p class="field-hint">${hint}</p>
    </#if>
    <#if messagesPerField.existsError(name)>
      <p class="field-error" id="error-${name}" role="alert">${kcSanitize(messagesPerField.get(name))?no_esc}</p>
    </#if>
  </div>
</#macro>
<main class="login">
  <section class="visual">
    <@logo />
    <div class="intro">
      <span class="eyebrow">ĐĂNG KÝ CỔNG BỆNH NHÂN</span>
      <h1>Chủ động đặt lịch<br>và theo dõi sức khỏe.</h1>
      <p>Chỉ mất chưa tới 1 phút để tạo tài khoản bệnh nhân và đồng bộ thông tin hồ sơ của bạn.</p>
      <ul class="visual-points">
        <li><@icon kind="check" /> Đặt lịch khám trực tiếp hoặc từ xa nhanh chóng</li>
        <li><@icon kind="check" /> Nhận thông báo xác nhận và nhắc lịch tự động qua email</li>
        <li><@icon kind="check" /> Thông tin cá nhân được mã hóa và liên kết thẳng sang Tài khoản</li>
      </ul>
    </div>
    <small class="privacy"><@icon kind="shield" />Dữ liệu cá nhân được bảo vệ bằng mã hóa AES-256-GCM</small>
  </section>
  <section class="form-panel">
    <div class="form-wrap form-wrap--wide">
      <div class="mobile-brand"><@logo dark=true /></div>
      <span class="eyebrow">TẠO TÀI KHOẢN MỚI</span>
      <h2>Đăng ký bệnh nhân</h2>
      <p class="subtitle">Các trường có dấu <span class="req">*</span> là bắt buộc. Thông tin hồ sơ bên dưới sẽ tự động liên kết sang trang Tài khoản của bạn.</p>
      <#if message?has_content && !messagesPerField.existsError('firstName','email','username','password','password-confirm','phoneNumber','birthDate','hometown','permanentAddress')>
        <div class="alert ${message.type}" role="alert">${kcSanitize(message.summary)?no_esc}</div>
      </#if>
      <#if social?? && social.providers?has_content>
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
              <span>Đăng ký nhanh với ${p.displayName}</span>
            </a>
          </#list>
        </div>
        <div class="social-divider"><span>hoặc đăng ký bằng email</span></div>
      </#if>
      <form id="kc-register-form" action="${url.registrationAction}" method="post" data-auth-form="1">
        <input type="hidden" name="username">
        <div class="field-grid">
          <@field name="firstName" label="Họ và tên" type="text" autocomplete="name" limit=255 required=true placeholder="Nguyễn Văn An" full=true />
          <@field name="email" label="Email" type="email" autocomplete="email" limit=255 required=true placeholder="ten@example.com" full=true />
          <#if messagesPerField.existsError('username')>
            <p class="field-error field-full" role="alert">${kcSanitize(messagesPerField.get('username'))?no_esc}</p>
          </#if>
          <@field name="password" label="Mật khẩu" type="password" autocomplete="new-password" limit=0 required=true placeholder="Tối thiểu 8 ký tự" hint="Ít nhất 8 ký tự." />
          <@field name="password-confirm" label="Nhập lại mật khẩu" type="password" autocomplete="new-password" limit=0 required=true placeholder="Nhập lại mật khẩu" />
        </div>

        <div class="form-section-title">Thông tin hồ sơ cá nhân (tùy chọn)</div>
        <p class="form-section-note">Có thể bỏ qua và bổ sung sau tại trang Tài khoản. Sau khi đã điền, thông tin nhân thân chỉ được thay đổi mỗi 90 ngày/lần.</p>

        <div class="field-grid">
          <@field name="phoneNumber" label="Số điện thoại (VN)" type="tel" autocomplete="tel" limit=16 placeholder="0901 234 567" hint="10 chữ số (03, 05, 07, 08, 09 hoặc +84)." />
          <@field name="birthDate" label="Ngày sinh" type="date" autocomplete="bday" limit=0 />
          <@field name="hometown" label="Quê quán" type="text" autocomplete="off" limit=255 placeholder="Tỉnh / Thành phố" />
          <@field name="permanentAddress" label="Địa chỉ thường trú" type="text" autocomplete="street-address" limit=255 placeholder="Số nhà, đường, phường/xã…" />
        </div>

        <noscript><p class="field-error">Vui lòng bật JavaScript để tạo tài khoản.</p></noscript>
        <div class="btn-stack">
          <button type="submit" class="btn-primary" disabled data-loading-text="Đang tạo tài khoản…">Tạo tài khoản</button>
        </div>
      </form>
      <p class="account-link">Đã có tài khoản? <a href="${url.loginUrl}">Đăng nhập ngay</a></p>
    </div>
  </section>
</main>
</body>
</html>
