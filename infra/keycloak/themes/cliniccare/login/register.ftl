<#ftl output_format="HTML" auto_esc=true>
<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tạo tài khoản — ClinicCare</title>
  <link rel="stylesheet" href="${url.resourcesPath}/css/cliniccare.css?v=2">
  <script src="${url.resourcesPath}/js/registration.js" defer></script>
</head>
<body>
<#assign values = {}>
<#list profile.attributes as attribute>
  <#assign values = values + {attribute.name: (attribute.value!'')}>
</#list>
<#macro field name label type autocomplete limit required=false>
  <label for="${name}">${label}<#if required> *</#if></label>
  <div class="input">
    <input id="${name}" name="${name}" type="${type}" autocomplete="${autocomplete}"
           <#if type != "password">value="${values[name]!''}"</#if>
           <#if limit gt 0>maxlength="${limit?c}"</#if>
           <#if type == "password">minlength="8"</#if>
           <#if required>required</#if>
           <#if messagesPerField.existsError(name)>aria-invalid="true" aria-describedby="error-${name}"</#if>>
  </div>
  <#if messagesPerField.existsError(name)>
    <p class="field-error" id="error-${name}" role="alert">${messagesPerField.get(name)}</p>
  </#if>
</#macro>
<main class="form-panel registration">
  <div class="form-wrap">
    <div class="brand"><b>Clinic<em>Care</em></b></div>
    <h2>Tạo tài khoản</h2>
    <p class="subtitle">Đăng ký tài khoản bệnh nhân. Các trường có dấu * là bắt buộc.</p>
    <#if message?has_content && messagesPerField.exists('global')>
      <div class="alert error" role="alert">${message.summary}</div>
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
    <form id="kc-register-form" action="${url.registrationAction}" method="post">
      <input type="hidden" name="username">
      <@field name="email" label="Email" type="email" autocomplete="email" limit=255 required=true />
      <#if messagesPerField.existsError('username')>
        <p class="field-error" role="alert">${messagesPerField.get('username')}</p>
      </#if>
      <@field name="password" label="Mật khẩu" type="password" autocomplete="new-password" limit=0 required=true />
      <@field name="password-confirm" label="Nhập lại mật khẩu" type="password" autocomplete="new-password" limit=0 required=true />
      <@field name="firstName" label="Họ và tên" type="text" autocomplete="name" limit=255 required=true />
      <@field name="birthDate" label="Ngày tháng năm sinh" type="date" autocomplete="bday" limit=0 />
      <@field name="hometown" label="Quê quán" type="text" autocomplete="off" limit=255 />
      <@field name="permanentAddress" label="Địa chỉ thường trú" type="text" autocomplete="street-address" limit=255 />
      <noscript><p class="field-error">Vui lòng bật JavaScript để tạo tài khoản.</p></noscript>
      <button type="submit" disabled>Tạo tài khoản</button>
    </form>
    <p class="account-link">Đã có tài khoản? <a href="${url.loginUrl}">Đăng nhập</a></p>
  </div>
</main>
</body>
</html>
