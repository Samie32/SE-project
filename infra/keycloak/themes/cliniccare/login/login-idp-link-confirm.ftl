<#ftl output_format="HTML" auto_esc=true>
<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Liên kết tài khoản — ClinicCare</title>
  <link rel="stylesheet" href="${url.resourcesPath}/css/cliniccare.css?v=3">
  <script src="${url.resourcesPath}/js/auth.js?v=3" defer></script>
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
      <span class="eyebrow">LIÊN KẾT ĐĂNG NHẬP NHANH</span>
      <h1>Xác nhận liên kết<br>tài khoản hiện có.</h1>
      <p>Email của bạn đã tồn tại trong ClinicCare. Xác nhận liên kết để giữ nguyên toàn bộ lịch hẹn và hồ sơ trước đó.</p>
    </div>
    <small class="privacy">Phiên đăng nhập bảo vệ bằng OIDC PKCE</small>
  </section>
  <section class="form-panel">
    <div class="form-wrap">
      <div class="mobile-brand"><@logo dark=true /></div>
      <span class="eyebrow">XÁC NHẬN LIÊN KẾT</span>
      <h2>Tài khoản đã tồn tại</h2>
      <p class="subtitle">Đã có tài khoản sử dụng email hoặc thông tin này (${(brokerContext.username!'')}). Bạn có muốn liên kết với tài khoản hiện có để tiếp tục?</p>
      <#if message?has_content>
        <div class="alert ${message.type!'info'}" role="status">${kcSanitize(message.summary)?no_esc}</div>
      </#if>
      <form id="kc-confirm-link-form" action="${url.loginAction}" method="post" data-auth-form="1">
        <div class="btn-stack">
          <button type="submit" name="submitAction" value="linkAccount" class="btn-primary" data-loading-text="Đang liên kết…">Liên kết vào tài khoản hiện có</button>
          <button type="submit" name="submitAction" value="updateProfile" class="btn-secondary">Xem lại thông tin hồ sơ</button>
        </div>
      </form>
    </div>
  </section>
</main>
</body>
</html>
