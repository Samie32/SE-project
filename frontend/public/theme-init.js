/* Áp cài đặt giao diện (theme/cỡ chữ/ngôn ngữ) trước khi React chạy để tránh nháy sáng/tối.
   Tách file ngoài trong public/ để tuân thủ CSP `script-src 'self'`.
   Phải khớp với src/core/preferences/settingsStorage.ts. */
(function () {
  try {
    var d = document.documentElement;
    var g = function (k) {
      return localStorage.getItem("cliniccare_settings_" + k);
    };
    var t = g("theme");
    var f = g("fontSize");
    var l = g("language");
    if (t !== "light" && t !== "dark" && t !== "system") t = "light";
    if (f !== "small" && f !== "medium" && f !== "large" && f !== "xlarge") f = "large";
    if (l !== "vi" && l !== "en") l = "vi";
    if (t === "system") {
      t = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    d.setAttribute("data-theme", t);
    d.setAttribute("data-font-size", f);
    d.setAttribute("lang", l);
  } catch (e) {
    /* localStorage bị chặn: giữ mặc định light / large / vi */
  }
})();
