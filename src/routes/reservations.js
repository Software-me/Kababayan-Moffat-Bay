"use strict";

const express = require("express");
const {
  getAllRooms,
  getRoomById,
  isRoomAvailable,
  createReservation,
  getReservationById,
  getReservationsForUser,
  cancelReservation,
  lookupReservations,
  validateBookingDates,
} = require("../services/reservations");
const { NIGHTLY_RATES, calculateStayTotal } = require("../services/pricing");
const {
  ensurePlayMoneyBalance,
  isValidDemoCardNumber,
  processDemoPayment,
} = require("../services/playMoney");
const {
  DEMO_CARD_NUMBER_DISPLAY,
  DEMO_CARDHOLDER_NAME,
  DEMO_EXPIRATION_LABEL,
} = require("../constants/demoPayment");
const { sendBookingConfirmation } = require("../services/email");
const { requireLogin } = require("../middleware/auth");

const router = express.Router();

const demoPayment = {
  cardNumber: DEMO_CARD_NUMBER_DISPLAY,
  cardName: DEMO_CARDHOLDER_NAME,
  expiration: DEMO_EXPIRATION_LABEL,
};

function bookingValues(body) {
  return {
    start_date: body.start_date,
    end_date: body.end_date,
    room_id: parseInt(body.room_id, 10),
    notes: (body.notes || "").trim(),
    guest_email: (body.guest_email || "").trim(),
    guest_first_name: (body.guest_first_name || "").trim(),
    guest_last_name: (body.guest_last_name || "").trim(),
  };
}

function renderBookingForm(req, res, { sessionUser, error, values }) {
  const playMoneyBalance = ensurePlayMoneyBalance(req.session);
  return getAllRooms().then((rooms) =>
    res.render("room_reservation", {
      activePage: "lodging",
      rooms,
      user: sessionUser || null,
      roomRates: NIGHTLY_RATES,
      playMoneyBalance,
      demoPayment,
      error,
      values: values || {},
    })
  );
}

router.get("/room_reservation", async (req, res) => {
  try {
    ensurePlayMoneyBalance(req.session);
    const rooms = await getAllRooms();
    res.render("room_reservation", {
      activePage: "lodging",
      rooms,
      user: req.session.user || null,
      roomRates: NIGHTLY_RATES,
      playMoneyBalance: req.session.playMoneyBalance,
      demoPayment,
      error: null,
      values: {},
    });
  } catch (err) {
    console.error("Lodging page error:", err);
    res.status(500).render("error", { message: "Could not load lodging page." });
  }
});

router.post("/room_reservation", async (req, res) => {
  const startDate = req.body.start_date;
  const endDate = req.body.end_date;
  const roomId = parseInt(req.body.room_id, 10);
  const notes = (req.body.notes || "").trim();
  const guestEmail = (req.body.guest_email || "").trim();
  const guestFirstName = (req.body.guest_first_name || "").trim();
  const guestLastName = (req.body.guest_last_name || "").trim();
  const cardNumber = req.body.card_number || "";
  const cardName = (req.body.card_name || "").trim();
  const sessionUser = req.session.user;

  const values = bookingValues(req.body);

  ensurePlayMoneyBalance(req.session);

  try {
    const dateError = validateBookingDates(startDate, endDate);
    if (dateError) {
      return renderBookingForm(req, res, { sessionUser, error: dateError, values });
    }

    const room = await getRoomById(roomId);
    if (!room) {
      return renderBookingForm(req, res, { sessionUser, error: "Invalid room selection.", values });
    }

    if (!sessionUser && (!guestEmail || !guestFirstName || !guestLastName)) {
      return renderBookingForm(req, res, {
        sessionUser,
        error: "Please log in or provide your name and email to book as a guest.",
        values,
      });
    }

    if (!cardName) {
      return renderBookingForm(req, res, { sessionUser, error: "Demo cardholder name is required.", values });
    }

    if (cardName.toLowerCase() !== DEMO_CARDHOLDER_NAME.toLowerCase()) {
      return renderBookingForm(req, res, {
        sessionUser,
        error: `Play-money checkout only accepts the demo name "${DEMO_CARDHOLDER_NAME}".`,
        values,
      });
    }

    if (!isValidDemoCardNumber(cardNumber)) {
      return renderBookingForm(req, res, {
        sessionUser,
        error: `Play-money checkout only accepts demo card ${DEMO_CARD_NUMBER_DISPLAY}. No real cards are processed.`,
        values,
      });
    }

    const pricing = calculateStayTotal(roomId, startDate, endDate);
    if (!pricing) {
      return renderBookingForm(req, res, {
        sessionUser,
        error: "Could not calculate price for the selected stay.",
        values,
      });
    }

    const clientTotal = parseFloat(req.body.total_price);
    if (!Number.isFinite(clientTotal) || Math.abs(clientTotal - pricing.total) > 0.01) {
      return renderBookingForm(req, res, {
        sessionUser,
        error: "Price mismatch. Please review your dates and room selection.",
        values,
      });
    }

    const payment = processDemoPayment(req.session, pricing.total);
    if (!payment.ok) {
      return renderBookingForm(req, res, { sessionUser, error: payment.error, values });
    }

    const available = await isRoomAvailable(roomId, startDate, endDate);
    if (!available) {
      req.session.playMoneyBalance += pricing.total;
      return renderBookingForm(req, res, {
        sessionUser,
        error: "No rooms of that type are available for the selected dates. Your play-money charge was refunded.",
        values,
      });
    }

    const reservationId = await createReservation({
      userId: sessionUser?.userId,
      guestEmail: sessionUser ? sessionUser.email : guestEmail,
      guestFirstName: sessionUser ? sessionUser.firstName : guestFirstName,
      guestLastName: sessionUser ? sessionUser.lastName : guestLastName,
      roomId,
      startDate,
      endDate,
      notes,
      nights: pricing.nights,
      totalPrice: pricing.total,
      paymentStatus: "Paid",
    });

    const reservation = await getReservationById(reservationId);
    const recipientEmail = sessionUser ? sessionUser.email : guestEmail;

    let emailSent = false;
    try {
      const emailResult = await sendBookingConfirmation({
        to: recipientEmail,
        reservation,
        playMoneyBalance: req.session.playMoneyBalance,
      });
      emailSent = Boolean(emailResult?.sent);
    } catch (emailErr) {
      console.error("Confirmation email failed:", emailErr.message);
    }

    req.session.lastReservationId = reservationId;
    req.session.emailConfirmationSent = emailSent;

    return new Promise((resolve, reject) => {
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Session save error:", saveErr);
        }
        res.redirect(`/reservation_summary?id=${reservationId}`);
        resolve();
      });
    });
  } catch (err) {
    console.error("Booking error:", err);
    return renderBookingForm(req, res, {
      sessionUser,
      error: "Could not complete booking. Please try again.",
      values,
    });
  }
});

router.get("/reservation_summary", async (req, res) => {
  const queryId = parseInt(req.query.id, 10);
  const reservationId = queryId || req.session.lastReservationId;

  if (!reservationId) {
    return res.render("reservation_summary", {
      activePage: "lodging",
      reservation: null,
      emailSent: false,
      playMoneyBalance: ensurePlayMoneyBalance(req.session),
    });
  }

  try {
    const reservation = await getReservationById(reservationId);
    if (!reservation) {
      return res.render("reservation_summary", {
        activePage: "lodging",
        reservation: null,
        emailSent: false,
        playMoneyBalance: ensurePlayMoneyBalance(req.session),
      });
    }

    const emailSent = Boolean(req.session.emailConfirmationSent);
    delete req.session.emailConfirmationSent;

    res.render("reservation_summary", {
      activePage: "lodging",
      reservation,
      emailSent,
      playMoneyBalance: ensurePlayMoneyBalance(req.session),
    });
  } catch (err) {
    console.error("Summary error:", err);
    res.status(500).render("error", { message: "Could not load reservation summary." });
  }
});

router.get("/my_reservations", requireLogin, async (req, res) => {
  try {
    const reservations = await getReservationsForUser(req.session.user.userId);
    res.render("my_reservations", {
      activePage: "reservations",
      reservations,
      lookupResults: null,
      lookupError: null,
    });
  } catch (err) {
    console.error("My reservations error:", err);
    res.status(500).render("error", { message: "Could not load your reservations." });
  }
});

router.post("/my_reservations/cancel", requireLogin, async (req, res) => {
  const reservationId = parseInt(req.body.reservation_id, 10);
  try {
    await cancelReservation(reservationId, req.session.user.userId);
    req.session.flash = { type: "success", message: "Reservation cancelled." };
  } catch (err) {
    console.error("Cancel error:", err);
    req.session.flash = { type: "error", message: "Could not cancel reservation." };
  }
  res.redirect("/my_reservations");
});

router.post("/lookup", async (req, res) => {
  const reservationIdRaw = (req.body.reservation_ID || "").trim();
  const email = (req.body.email || "").trim();
  const reservationId = reservationIdRaw ? parseInt(reservationIdRaw, 10) : null;

  if (!reservationId && !email) {
    const renderOpts = {
      activePage: "reservations",
      reservations: req.session.user
        ? await getReservationsForUser(req.session.user.userId).catch(() => [])
        : [],
      lookupResults: null,
      lookupError: "Enter a reservation ID and/or email to search.",
    };
    if (req.session.user) {
      return res.render("my_reservations", renderOpts);
    }
    return res.render("lookup", renderOpts);
  }

  try {
    const lookupResults = await lookupReservations({ reservationId, email });
    const renderOpts = {
      activePage: "reservations",
      lookupResults,
      lookupError: lookupResults.length === 0 ? "No reservation found with the given information." : null,
    };

    if (req.session.user) {
      renderOpts.reservations = await getReservationsForUser(req.session.user.userId);
      return res.render("my_reservations", renderOpts);
    }
    return res.render("lookup", renderOpts);
  } catch (err) {
    console.error("Lookup error:", err);
    res.status(500).render("error", { message: "Lookup failed." });
  }
});

module.exports = router;
