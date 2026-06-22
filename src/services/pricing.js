"use strict";

/** Nightly rates in USD (exact values from product spec). */
const NIGHTLY_RATES = {
  1: 280.0,
  2: 250.0,
  3: 450.0,
  4: 600.0,
  5: 550.0,
  6: 650.0,
  7: 850.0,
  8: 1100.0,
};

const ROOM_TYPE_RATES = {
  "Standard - Single King": 280.0,
  "Standard - Single Queen": 250.0,
  "Standard - Double Queen": 450.0,
  "Deluxe - Single King": 600.0,
  "Deluxe - Single Queen": 550.0,
  "Deluxe - Double Queen": 650.0,
  "Suite - 1 Room": 850.0,
  "Suite - 2 Room": 1100.0,
};

function getNightlyRate(roomId) {
  return NIGHTLY_RATES[roomId] ?? null;
}

function countNights(startDate, endDate) {
  const start = new Date(startDate + "T12:00:00");
  const end = new Date(endDate + "T12:00:00");
  const ms = end - start;
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function calculateStayTotal(roomId, startDate, endDate) {
  const rate = getNightlyRate(roomId);
  if (rate == null) return null;
  const nights = countNights(startDate, endDate);
  if (nights <= 0) return null;
  return {
    nights,
    nightlyRate: rate,
    total: Math.round(rate * nights * 100) / 100,
  };
}

function formatUsd(amount) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

module.exports = {
  NIGHTLY_RATES,
  ROOM_TYPE_RATES,
  getNightlyRate,
  countNights,
  calculateStayTotal,
  formatUsd,
};
