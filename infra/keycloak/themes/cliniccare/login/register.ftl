<#ftl output_format="HTML" auto_esc=true>
<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tạo tài khoản — ClinicCare</title>
  <link rel="stylesheet" href="${url.resourcesPath}/css/cliniccare-v2.css">
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
    <form id="kc-register-form" action="${url.registrationAction}" method="post">
      <input type="hidden" name="username">
      <@field name="email" label="Email" type="email" autocomplete="email" limit=255 required=true />
      <#if messagesPerField.existsError('username')>
        <p class="field-error" role="alert">${messagesPerField.get('username')}</p>
      </#if>
      <@field name="password" label="Mật khẩu" type="password" autocomplete="new-password" limit=0 required=true />
      <@field name="password-confirm" label="Nhập lại mật khẩu" type="password" autocomplete="new-password" limit=0 required=true />
      <@field name="firstName" label="Họ và tên" type="text" autocomplete="name" limit=255 required=true />
      <@field name="phoneNumber" label="Số điện thoại" type="tel" autocomplete="tel" limit=16 />
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
