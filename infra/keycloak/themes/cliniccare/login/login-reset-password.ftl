<#ftl output_format="HTML" auto_esc=true>
<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Quên mật khẩu — ClinicCare</title>
  <link rel="stylesheet" href="${url.resourcesPath}/css/cliniccare.css?v=2">
</head>
<body>
<main class="form-panel registration">
  <div class="form-wrap">
    <div class="brand"><b>Clinic<em>Care</em></b></div>
    <h2>Quên mật khẩu</h2>
    <p class="subtitle">Nhập email hoặc tên đăng nhập của tài khoản để nhận liên kết đặt lại mật khẩu qua email.</p>
    <#if message?has_content>
      <div class="alert ${message.type}" role="alert">${kcSanitize(message.summary)?no_esc}</div>
    </#if>
    <form id="kc-reset-password-form" action="${url.loginAction}" method="post">
      <label for="username">Email hoặc tên đăng nhập *</label>
      <div class="input">
        <input id="username" name="username" type="text" value="${(auth.attemptedUsername!'')}"
               autocomplete="username" autofocus required
               aria-invalid="${messagesPerField.existsError('username')?c}">
      </div>
      <#if messagesPerField.existsError('username')>
        <p class="field-error" role="alert">${kcSanitize(messagesPerField.get('username'))?no_esc}</p>
      </#if>
      <button type="submit">Gửi liên kết đặt lại mật khẩu</button>
    </form>
    <p class="account-link"><a href="${url.loginUrl}">Quay lại đăng nhập</a></p>
  </div>
</main>
</body>
</html>
