<#ftl output_format="HTML" auto_esc=true>
<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Đặt lại mật khẩu — ClinicCare</title>
  <link rel="stylesheet" href="${url.resourcesPath}/css/cliniccare.css?v=2">
</head>
<body>
<main class="form-panel registration">
  <div class="form-wrap">
    <div class="brand"><b>Clinic<em>Care</em></b></div>
    <h2>Đặt lại mật khẩu</h2>
    <p class="subtitle">Nhập mật khẩu mới tối thiểu 8 ký tự để tiếp tục đăng nhập vào ClinicCare.</p>
    <#if message?has_content && !messagesPerField.existsError('password','password-confirm')>
      <div class="alert ${message.type}" role="alert">${kcSanitize(message.summary)?no_esc}</div>
    </#if>
    <form id="kc-passwd-update-form" action="${url.loginAction}" method="post">
      <label for="password-new">Mật khẩu mới *</label>
      <div class="input">
        <input id="password-new" name="password-new" type="password" autocomplete="new-password"
               minlength="8" autofocus required
               aria-invalid="${messagesPerField.existsError('password','password-confirm')?c}">
      </div>
      <#if messagesPerField.existsError('password')>
        <p class="field-error" role="alert">${kcSanitize(messagesPerField.get('password'))?no_esc}</p>
      </#if>

      <label for="password-confirm">Nhập lại mật khẩu mới *</label>
      <div class="input">
        <input id="password-confirm" name="password-confirm" type="password" autocomplete="new-password"
               minlength="8" required
               aria-invalid="${messagesPerField.existsError('password-confirm')?c}">
      </div>
      <#if messagesPerField.existsError('password-confirm')>
        <p class="field-error" role="alert">${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}</p>
      </#if>

      <div class="options">
        <label class="remember"><input id="logout-sessions" name="logout-sessions" type="checkbox" value="on" checked>Đăng xuất khỏi các thiết bị khác</label>
      </div>
      <button type="submit">Cập nhật mật khẩu</button>
    </form>
  </div>
</main>
</body>
</html>
