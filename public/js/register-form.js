(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("register-form");
    if (!form) return;

    var password = document.getElementById("password");
    var confirmPassword = document.getElementById("confirm_password");
    var submitBtn = document.getElementById("register-submit");
    var mismatchMsg = document.getElementById("password-mismatch");

    function passwordsMatch() {
      return password.value.length > 0 && password.value === confirmPassword.value;
    }

    function updatePasswordState() {
      var match = passwordsMatch();
      var bothFilled = password.value.length > 0 && confirmPassword.value.length > 0;

      if (bothFilled && !match) {
        mismatchMsg.hidden = false;
        confirmPassword.classList.add("field-error");
        submitBtn.disabled = true;
      } else {
        mismatchMsg.hidden = true;
        if (match || confirmPassword.value.length === 0) {
          confirmPassword.classList.remove("field-error");
        }
        submitBtn.disabled = bothFilled ? !match : false;
      }
    }

    password.addEventListener("input", updatePasswordState);
    confirmPassword.addEventListener("input", updatePasswordState);

    window.LoreineFormValidation.attachRequiredValidation(form, function () {
      updatePasswordState();
      if (!passwordsMatch()) {
        mismatchMsg.hidden = false;
        mismatchMsg.textContent = "Passwords do not match.";
        submitBtn.disabled = true;
        return false;
      }
      return true;
    });
  });
})();
