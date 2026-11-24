<#ftl output_format="HTML" auto_esc=true>
<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Thông báo xác thực — ClinicCare</title>
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
      <span class="eyebrow">BẢO MẬT PHIÊN ĐĂNG NHẬP</span>
      <h1>Phiên làm việc<br>cần xác thực lại.</h1>
      <p>Nếu bạn vừa nhấn nút quay lại hoặc liên kết xác thực đã hết hạn, hãy bắt đầu lại từ trang đăng nhập.</p>
    </div>
    <small class="privacy">Hệ thống phòng khám &amp; khám từ xa ClinicCare</small>
  </section>
  <section class="form-panel">
    <div class="form-wrap">
      <div class="mobile-brand"><@logo dark=true /></div>
      <span class="eyebrow">THÔNG BÁO HỆ THỐNG</span>
      <h2>Không thể tiếp tục yêu cầu</h2>
      <p class="subtitle">Yêu cầu xác thực đã hết hạn hoặc không còn hợp lệ.</p>
      <#if message?has_content>
        <div class="alert ${message.type!'error'}" role="alert">${kcSanitize(message.summary)?no_esc}</div>
      </#if>
      <div class="btn-stack">
        <#if client?? && client.baseUrl?has_content>
          <a class="btn-primary" href="${client.baseUrl}">Quay lại ClinicCare</a>
        <#elseif url.loginUrl?has_content>
          <a class="btn-primary" href="${url.loginUrl}">Về trang đăng nhập</a>
        </#if>
      </div>
    </div>
  </section>
</main>
</body>
</html>
