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
const { requireLogin } = require("../middleware/auth");

const router = express.Router();

function renderBookingForm(req, res, { sessionUser, error, values }) {
  const playMoneyBalance = ensurePlayMoneyBalance(req.session);
  return getAllRooms().then((rooms) =>
    res.render("room_reservation", {
      activePage: "lodging",
      rooms,
      user: sessionUser || null,
      roomRates: NIGHTLY_RATES,
      playMoneyBalance,
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

  const values = {
    start_date: startDate,
    end_date: endDate,
    room_id: roomId,
    notes,
    guest_email: guestEmail,
    guest_first_name: guestFirstName,
    guest_last_name: guestLastName,
    card_number: cardNumber,
    card_name: cardName,
  };

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
      return renderBookingForm(req, res, { sessionUser, error: "Name on card is required.", values });
    }

    if (!isValidDemoCardNumber(cardNumber)) {
      return renderBookingForm(req, res, {
        sessionUser,
        error: "Enter a valid 16-digit demo card number (e.g. 4111 1111 1111 1111).",
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

    req.session.lastReservationId = reservationId;
    return res.redirect("/reservation_summary");
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
  const reservationId = req.session.lastReservationId;
  if (!reservationId) {
    return res.render("reservation_summary", {
      activePage: "lodging",
      reservation: null,
      playMoneyBalance: ensurePlayMoneyBalance(req.session),
    });
  }

  try {
    const reservation = await getReservationById(reservationId);
    res.render("reservation_summary", {
      activePage: "lodging",
      reservation,
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
