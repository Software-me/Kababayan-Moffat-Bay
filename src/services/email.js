"use strict";

const nodemailer = require("nodemailer");
const { formatUsd } = require("./pricing");
const { DEMO_CARD_NUMBER_DISPLAY, DEMO_CARDHOLDER_NAME } = require("../constants/demoPayment");

function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function createTransport() {
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function formatDate(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toLocaleDateString("en-CA");
  return String(value).slice(0, 10);
}

function buildConfirmationText(reservation, playMoneyBalance) {
  const guestName = [reservation.guest_first_name, reservation.guest_last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return [
    "Loreine's Bay Resort Lodge — Booking Confirmation",
    "",
    `Hello${guestName ? ` ${guestName}` : ""},`,
    "",
    "Thank you for your reservation. Your play-money demo payment was processed successfully.",
    "",
    `Reservation ID: ${reservation.reservation_id}`,
    `Room: ${reservation.room_type}`,
    `Check-in: ${formatDate(reservation.start_date)}`,
    `Check-out: ${formatDate(reservation.end_date)}`,
    `Nights: ${reservation.nights || "—"}`,
    `Total paid (play money): ${reservation.total_price != null ? formatUsd(Number(reservation.total_price)) : "—"}`,
    `Payment status: ${reservation.payment_status}`,
    `Reservation status: ${reservation.status}`,
    "",
    "Demo payment details (not a real charge):",
    `  Card: ${DEMO_CARD_NUMBER_DISPLAY}`,
    `  Name: ${DEMO_CARDHOLDER_NAME}`,
    `  Remaining play balance: ${formatUsd(playMoneyBalance)}`,
    "",
    reservation.notes ? `Notes: ${reservation.notes}` : null,
    "",
    "View your booking online:",
    process.env.APP_URL || "https://loreines-bay-resort-lodge.onrender.com",
    "",
    "— Loreine's Bay Resort Lodge",
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendBookingConfirmation({ to, reservation, playMoneyBalance }) {
  if (!to) {
    console.warn("Booking confirmation email skipped: no recipient address.");
    return { sent: false, reason: "no_email" };
  }

  if (!isEmailConfigured()) {
    console.warn(
      `Booking confirmation email skipped (SMTP not configured). Would send to ${to} for reservation #${reservation.reservation_id}.`
    );
    return { sent: false, reason: "smtp_not_configured" };
  }

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const subject = `Booking confirmed — Reservation #${reservation.reservation_id} | Loreine's Bay Resort Lodge`;
  const text = buildConfirmationText(reservation, playMoneyBalance);

  const transport = createTransport();
  await transport.sendMail({ from, to, subject, text });
  console.log(`Confirmation email sent to ${to} for reservation #${reservation.reservation_id}`);
  return { sent: true };
}

module.exports = { sendBookingConfirmation, isEmailConfigured, buildConfirmationText };
