"use strict";

const { DEMO_CARD_NUMBER_DIGITS } = require("../constants/demoPayment");

const STARTING_BALANCE = 10000;

function ensurePlayMoneyBalance(session) {
  if (session.playMoneyBalance === undefined || session.playMoneyBalance === null) {
    session.playMoneyBalance = STARTING_BALANCE;
  }
  return session.playMoneyBalance;
}

function normalizeCardNumber(raw) {
  return String(raw || "").replace(/\D/g, "");
}

/** Only the single approved demo test card is accepted — never real cards. */
function isValidDemoCardNumber(raw) {
  return normalizeCardNumber(raw) === DEMO_CARD_NUMBER_DIGITS;
}

function processDemoPayment(session, amount) {
  ensurePlayMoneyBalance(session);
  const total = Number(amount);
  if (!Number.isFinite(total) || total <= 0) {
    return { ok: false, error: "Invalid payment amount." };
  }
  if (session.playMoneyBalance < total) {
    return {
      ok: false,
      error: `Insufficient play money balance. You have $${session.playMoneyBalance.toFixed(2)} but need $${total.toFixed(2)}.`,
    };
  }
  session.playMoneyBalance = Math.round((session.playMoneyBalance - total) * 100) / 100;
  return { ok: true, balanceAfter: session.playMoneyBalance };
}

module.exports = {
  STARTING_BALANCE,
  ensurePlayMoneyBalance,
  normalizeCardNumber,
  isValidDemoCardNumber,
  processDemoPayment,
};
