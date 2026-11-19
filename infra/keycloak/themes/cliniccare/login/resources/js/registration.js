const form = document.querySelector("#kc-register-form");
const birthDate = form.elements.namedItem("birthDate");
const today = new Date();
birthDate.max = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, "0"),
  String(today.getDate()).padStart(2, "0"),
].join("-");

form.addEventListener("submit", () => {
  // Use email for patient self-registration while preserving staff usernames.
  form.elements.namedItem("username").value = form.elements.namedItem("email").value.trim();
});
form.querySelector("button[type=submit]").disabled = false;
