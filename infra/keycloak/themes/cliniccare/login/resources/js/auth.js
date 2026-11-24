(function () {
  const EYE_OPEN =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>';

  document.querySelectorAll(".pw-toggle").forEach(function (button) {
    const targetId = button.getAttribute("data-target");
    const input = targetId ? document.getElementById(targetId) : null;
    if (!input) return;

    button.innerHTML = EYE_OPEN;
    button.addEventListener("click", function () {
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      button.setAttribute("aria-pressed", String(!showing));
      button.setAttribute("aria-label", showing ? "Hiện mật khẩu" : "Ẩn mật khẩu");
      button.innerHTML = showing ? EYE_OPEN : EYE_OFF;
      input.focus();
    });
  });

  function setInlineError(input, message) {
    const wrapper = input.closest(".input");
    const group = input.closest(".field-group");
    if (!group) return;
    let err = group.querySelector("[data-client-error]");
    if (!message) {
      if (wrapper) wrapper.classList.remove("is-invalid");
      input.removeAttribute("aria-invalid");
      if (err) err.remove();
      return;
    }
    if (wrapper) wrapper.classList.add("is-invalid");
    input.setAttribute("aria-invalid", "true");
    if (!err) {
      err = document.createElement("p");
      err.className = "field-error";
      err.setAttribute("role", "alert");
      err.setAttribute("data-client-error", "1");
      group.appendChild(err);
    }
    err.textContent = message;
  }

  const updateForm = document.getElementById("kc-passwd-update-form");
  if (updateForm) {
    const pwNew = document.getElementById("password-new");
    const pwConfirm = document.getElementById("password-confirm");
    if (pwNew && pwConfirm) {
      const clearErrors = function () {
        setInlineError(pwNew, "");
        setInlineError(pwConfirm, "");
      };
      pwNew.addEventListener("input", clearErrors);
      pwConfirm.addEventListener("input", clearErrors);
      updateForm.addEventListener("submit", function (event) {
        const submitter = event.submitter;
        if (submitter && submitter.getAttribute("name") === "cancel-aia") {
          return;
        }
        clearErrors();
        if (pwNew.value.length < 8) {
          event.preventDefault();
          setInlineError(pwNew, "Mật khẩu mới phải có ít nhất 8 ký tự.");
          pwNew.focus();
          return;
        }
        if (pwNew.value !== pwConfirm.value) {
          event.preventDefault();
          setInlineError(pwConfirm, "Mật khẩu nhập lại không khớp.");
          pwConfirm.focus();
        }
      });
    }
  }

  document.querySelectorAll("form[data-auth-form]").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      if (event.defaultPrevented) return;
      const submitter = event.submitter;
      if (submitter && submitter.hasAttribute("formnovalidate")) return;
      const btn = submitter || form.querySelector("button[type=submit]");
      if (!btn || btn.disabled) return;
      const loadingText = btn.getAttribute("data-loading-text");
      if (loadingText) {
        btn.textContent = loadingText;
      }
      btn.disabled = true;
    });
  });
})();
