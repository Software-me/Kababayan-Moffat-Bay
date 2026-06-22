(function () {
  "use strict";

  function markFieldError(input, message) {
    input.classList.add("field-error");
    input.setAttribute("aria-invalid", "true");

    var group = input.closest(".form-group") || input.parentElement;
    if (!group) return;

    var existing = group.querySelector(".field-error-msg");
    if (!existing) {
      existing = document.createElement("p");
      existing.className = "field-error-msg";
      existing.setAttribute("role", "alert");
      group.appendChild(existing);
    }
    existing.textContent = message;

    var star = group.querySelector(".field-required-star");
    if (!star && group.querySelector("label")) {
      star = document.createElement("span");
      star.className = "field-required-star";
      star.setAttribute("aria-hidden", "true");
      star.textContent = " ⚠";
      group.querySelector("label").appendChild(star);
    }
  }

  function clearFieldError(input) {
    input.classList.remove("field-error");
    input.removeAttribute("aria-invalid");
    var group = input.closest(".form-group") || input.parentElement;
    if (!group) return;
    var msg = group.querySelector(".field-error-msg");
    if (msg) msg.remove();
    var star = group.querySelector(".field-required-star");
    if (star) star.remove();
  }

  function validateRequiredForm(form) {
    var required = form.querySelectorAll("[required]");
    var firstInvalid = null;
    var valid = true;

    required.forEach(function (input) {
      if (input.disabled) return;
      var empty =
        input.type === "checkbox" ? !input.checked : String(input.value || "").trim() === "";
      if (empty) {
        valid = false;
        markFieldError(input, "This field is required.");
        if (!firstInvalid) firstInvalid = input;
      } else {
        clearFieldError(input);
      }
    });

    if (!valid) {
      var banner = form.querySelector(".form-validation-banner");
      if (!banner) {
        banner = document.createElement("p");
        banner.className = "form-validation-banner error";
        banner.setAttribute("role", "alert");
        form.insertBefore(banner, form.firstChild);
      }
      banner.textContent = "Please complete all required fields marked with a red warning.";
      if (firstInvalid) firstInvalid.focus();
    } else {
      var existing = form.querySelector(".form-validation-banner");
      if (existing) existing.remove();
    }

    return valid;
  }

  function attachRequiredValidation(form, extraCheck) {
    if (!form) return;

    form.querySelectorAll("[required]").forEach(function (input) {
      input.addEventListener("input", function () {
        if (String(input.value || "").trim() !== "") clearFieldError(input);
      });
      input.addEventListener("blur", function () {
        if (String(input.value || "").trim() === "") {
          markFieldError(input, "This field is required.");
        }
      });
    });

    form.addEventListener("submit", function (e) {
      var ok = validateRequiredForm(form);
      if (ok && typeof extraCheck === "function") {
        ok = extraCheck(form, e);
      }
      if (!ok) e.preventDefault();
    });
  }

  window.LoreineFormValidation = {
    attachRequiredValidation: attachRequiredValidation,
    validateRequiredForm: validateRequiredForm,
    markFieldError: markFieldError,
    clearFieldError: clearFieldError,
  };
})();
