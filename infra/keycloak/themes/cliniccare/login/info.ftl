<#ftl output_format="HTML" auto_esc=true>
<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Thông tin tài khoản — ClinicCare</title>
  <link rel="stylesheet" href="${url.resourcesPath}/css/cliniccare.css?v=3">
</head>
<body>
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
      <span class="eyebrow">HỆ THỐNG CLINICCARE</span>
      <h1>Cập nhật trạng thái<br>xác thực tài khoản.</h1>
      <p>Thông báo trạng thái dành cho tài khoản bệnh nhân và nhân sự phòng khám.</p>
    </div>
    <small class="privacy">Hệ thống phòng khám &amp; khám từ xa ClinicCare</small>
  </section>
  <section class="form-panel">
    <div class="form-wrap">
      <div class="mobile-brand"><@logo dark=true /></div>
      <span class="eyebrow">THÔNG TIN XÁC THỰC</span>
      <h2><#if messageHeader?has_content>${kcSanitize(messageHeader)?no_esc}<#else>Thông báo tài khoản</#if></h2>
      <#if message?has_content>
        <div class="alert ${message.type!'info'}" role="status">${kcSanitize(message.summary)?no_esc}</div>
      </#if>
      <div class="btn-stack">
        <#if !skipLink??>
          <#if pageRedirectUri?has_content>
            <a class="btn-primary" href="${pageRedirectUri}">Quay lại ứng dụng</a>
          <#elseif actionUri?has_content>
            <a class="btn-primary" href="${actionUri}">Tiếp tục</a>
          <#elseif client?? && client.baseUrl?has_content>
            <a class="btn-primary" href="${client.baseUrl}">Về trang chủ ClinicCare</a>
          </#if>
        </#if>
      </div>
    </div>
  </section>
</main>
</body>
</html>
