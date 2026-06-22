(function () {
  "use strict";

  function formatUsd(n) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  }

  function formatCardDisplay(digits) {
    var g = digits.replace(/\D/g, "").slice(0, 16);
    return g.replace(/(.{4})/g, "$1 ").trim() || "•••• •••• •••• ••••";
  }

  function normalizeDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("booking-form");
    if (!form || !window.ROOM_RATES || !window.DEMO_PAYMENT) return;

    var demo = window.DEMO_PAYMENT;
    var demoDigits = normalizeDigits(demo.cardNumber);
    var demoName = demo.cardName;

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
    var fillDemoBtn = document.getElementById("fill-demo-payment");

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

    function isDemoPaymentValid() {
      return (
        normalizeDigits(cardNumber.value) === demoDigits &&
        cardName.value.trim().toLowerCase() === demoName.toLowerCase()
      );
    }

    function updateCardPreview() {
      var digits = normalizeDigits(cardNumber.value);
      cardDisplayNumber.textContent = digits ? formatCardDisplay(digits) : demo.cardNumber;
      cardDisplayName.textContent = (cardName.value.trim() || demoName).toUpperCase();
    }

    function updatePayButton() {
      var total = updatePricing();
      var paymentOk = isDemoPaymentValid();

      if (total && cardNumber.value.length > 0 && !paymentOk) {
        cardError.hidden = false;
        cardError.textContent =
          "Play-money only: use card " + demo.cardNumber + " and name \"" + demoName + "\".";
      } else {
        cardError.hidden = true;
      }

      payBtn.disabled = !(total > 0 && paymentOk);
    }

    function fillDemoPayment() {
      cardNumber.value = demo.cardNumber;
      cardName.value = demoName;
      updateCardPreview();
      updatePayButton();
    }

    if (fillDemoBtn) {
      fillDemoBtn.addEventListener("click", fillDemoPayment);
    }

    [startInput, endInput, roomSelect].forEach(function (el) {
      el.addEventListener("change", updatePayButton);
      el.addEventListener("input", updatePayButton);
    });

    cardNumber.addEventListener("input", function () {
      var digits = normalizeDigits(cardNumber.value).slice(0, 16);
      cardNumber.value = digits ? formatCardDisplay(digits) : "";
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
      if (!isDemoPaymentValid()) {
        cardError.hidden = false;
        cardError.textContent =
          "Play-money only: use card " + demo.cardNumber + " and name \"" + demoName + "\". Real cards are not accepted.";
        cardNumber.focus();
        return false;
      }
      return true;
    });

    updateCardPreview();
    updatePayButton();
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
