(function () {
  "use strict";

  function formatUsd(n) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  }

  function formatCardDisplay(digits) {
    var g = digits.replace(/\D/g, "").slice(0, 16);
    return g.replace(/(.{4})/g, "$1 ").trim() || "•••• •••• •••• ••••";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("booking-form");
    if (!form || !window.ROOM_RATES) return;

    var startInput = document.getElementById("start_date");
    var endInput = document.getElementById("end_date");
    var roomSelect = document.getElementById("room_id");
    var priceBox = document.getElementById("price-summary");
    var nightsEl = document.getElementById("price-nights");
    var rateEl = document.getElementById("price-nightly");
    var totalEl = document.getElementById("price-total");
    var totalHidden = document.getElementById("total_price");
    var cardNumber = document.getElementById("card_number");
    var cardName = document.getElementById("card_name");
    var cardDisplayNumber = document.getElementById("demo-card-number");
    var cardDisplayName = document.getElementById("demo-card-name");
    var cardError = document.getElementById("card-error");
    var payBtn = document.getElementById("booking-submit");

    function countNights() {
      if (!startInput.value || !endInput.value) return 0;
      var start = new Date(startInput.value + "T12:00:00");
      var end = new Date(endInput.value + "T12:00:00");
      return Math.max(0, Math.round((end - start) / 86400000));
    }

    function updatePricing() {
      var roomId = roomSelect.value;
      var rate = window.ROOM_RATES[roomId];
      var nights = countNights();

      if (!rate || nights <= 0) {
        priceBox.hidden = true;
        totalHidden.value = "";
        return null;
      }

      var total = Math.round(rate * nights * 100) / 100;
      priceBox.hidden = false;
      nightsEl.textContent = nights + (nights === 1 ? " night" : " nights");
      rateEl.textContent = formatUsd(rate) + " / night";
      totalEl.textContent = formatUsd(total);
      totalHidden.value = String(total);
      return total;
    }

    function cardDigitsValid() {
      var digits = cardNumber.value.replace(/\D/g, "");
      return digits.length === 16;
    }

    function updateCardPreview() {
      cardDisplayNumber.textContent = formatCardDisplay(cardNumber.value);
      cardDisplayName.textContent = (cardName.value || "YOUR NAME").toUpperCase();
    }

    function updatePayButton() {
      var total = updatePricing();
      var cardOk = cardDigitsValid() && cardName.value.trim().length > 0;
      if (total && !cardOk && cardNumber.value.length > 0 && !cardDigitsValid()) {
        cardError.hidden = false;
        cardError.textContent = "Enter a valid 16-digit demo card number.";
      } else {
        cardError.hidden = true;
      }
      payBtn.disabled = !(total > 0 && cardOk);
    }

    [startInput, endInput, roomSelect].forEach(function (el) {
      el.addEventListener("change", updatePayButton);
      el.addEventListener("input", updatePayButton);
    });

    cardNumber.addEventListener("input", function () {
      var digits = cardNumber.value.replace(/\D/g, "").slice(0, 16);
      cardNumber.value = digits.replace(/(.{4})/g, "$1 ").trim();
      updateCardPreview();
      updatePayButton();
    });

    cardName.addEventListener("input", function () {
      updateCardPreview();
      updatePayButton();
    });

    window.LoreineFormValidation.attachRequiredValidation(form, function () {
      if (!validateDates()) return false;
      var total = updatePricing();
      if (!total) {
        alert("Select valid dates and a room to calculate your total.");
        return false;
      }
      if (!cardDigitsValid()) {
        cardError.hidden = false;
        cardError.textContent = "Enter a valid 16-digit demo card number (e.g. 4111 1111 1111 1111).";
        cardNumber.focus();
        return false;
      }
      if (!cardName.value.trim()) {
        window.LoreineFormValidation.markFieldError(cardName, "Name on card is required.");
        return false;
      }
      return true;
    });

    updatePayButton();
    updateCardPreview();
  });

  function validateDates() {
    var checkInDate = document.getElementsByName("start_date")[0].value;
    var checkOutDate = document.getElementsByName("end_date")[0].value;
    if (!checkInDate || !checkOutDate) return true;

    var checkIn = new Date(checkInDate + "T12:00:00");
    var checkOut = new Date(checkOutDate + "T12:00:00");
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var checkInDay = new Date(checkInDate + "T12:00:00");
    checkInDay.setHours(0, 0, 0, 0);

    if (checkInDay <= today) {
      alert("Check-in date must be in the future.");
      return false;
    }
    if (checkOut <= checkIn) {
      alert("Check-out date must be at least one day after check-in.");
      return false;
    }
    return true;
  }

  window.validateDates = validateDates;
})();
