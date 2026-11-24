(function () {
  const form = document.querySelector("#kc-register-form");
  if (!form) return;

  const email = form.elements.namedItem("email");
  const username = form.elements.namedItem("username");
  const password = form.elements.namedItem("password");
  const passwordConfirm = form.elements.namedItem("password-confirm");
  const phone = form.elements.namedItem("phoneNumber");
  const birthDate = form.elements.namedItem("birthDate");
  const submitBtn = form.querySelector("button[type=submit]");

  const today = new Date();
  if (birthDate) {
    birthDate.max = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function normalizeVnPhone(raw) {
    const cleaned = raw.trim().replace(/[\s.\-()]/g, "");
    if (!cleaned) return "";
    let normalized = cleaned;
    if (cleaned.startsWith("+84")) {
      normalized = "0" + cleaned.slice(3);
    } else if (cleaned.startsWith("84") && cleaned.length === 11) {
      normalized = "0" + cleaned.slice(2);
    }
    return /^0(3|5|7|8|9)[0-9]{8}$/.test(normalized) ? normalized : null;
  }

  function setClientError(input, message) {
    if (!input) return;
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

  if (phone) {
    phone.addEventListener("input", function () {
      setClientError(phone, "");
    });
    phone.addEventListener("blur", function () {
      const raw = phone.value.trim();
      if (!raw) return;
      const normalized = normalizeVnPhone(raw);
      if (normalized) {
        phone.value = normalized;
      } else {
        setClientError(
          phone,
          "Số điện thoại Việt Nam phải gồm 10 chữ số (bắt đầu bằng 03, 05, 07, 08, 09 hoặc +84).",
        );
      }
    });
  }

  if (password && passwordConfirm) {
    const clearPwError = function () {
      setClientError(password, "");
      setClientError(passwordConfirm, "");
    };
    password.addEventListener("input", clearPwError);
    passwordConfirm.addEventListener("input", clearPwError);
  }

  form.addEventListener("submit", function (event) {
    if (password && password.value.length < 8) {
      event.preventDefault();
      setClientError(password, "Mật khẩu phải có ít nhất 8 ký tự.");
      password.focus();
      return;
    }
    if (password && passwordConfirm && password.value !== passwordConfirm.value) {
      event.preventDefault();
      setClientError(passwordConfirm, "Mật khẩu nhập lại không khớp.");
      passwordConfirm.focus();
      return;
    }
    if (phone && phone.value.trim()) {
      const normalized = normalizeVnPhone(phone.value);
      if (!normalized) {
        event.preventDefault();
        setClientError(
          phone,
          "Số điện thoại Việt Nam phải gồm 10 chữ số (bắt đầu bằng 03, 05, 07, 08, 09 hoặc +84).",
        );
        phone.focus();
        return;
      }
      phone.value = normalized;
    }
    if (username && email) {
      username.value = email.value.trim().toLowerCase();
    }
  });

  if (submitBtn) {
    submitBtn.disabled = false;
  }
})();
