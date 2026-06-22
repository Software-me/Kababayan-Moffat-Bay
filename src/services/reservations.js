"use strict";

const { query } = require("../db");

async function getAllRooms() {
  const result = await query(
    `SELECT room_id, room_type, description, total_rooms, available_rooms, image_url
     FROM rooms
     ORDER BY room_id`
  );
  return result.rows;
}

async function getRoomById(roomId) {
  const result = await query(
    `SELECT room_id, room_type, description, total_rooms, available_rooms, image_url
     FROM rooms WHERE room_id = $1`,
    [roomId]
  );
  return result.rows[0] || null;
}

async function countOverlappingReservations(roomId, startDate, endDate, excludeReservationId = null) {
  const params = [roomId, endDate, startDate];
  let sql = `
    SELECT COUNT(*)::int AS count
    FROM reservations
    WHERE room_id = $1
      AND status <> 'Cancelled'
      AND start_date < $2
      AND end_date > $3`;
  if (excludeReservationId) {
    params.push(excludeReservationId);
    sql += ` AND reservation_id <> $${params.length}`;
  }
  const result = await query(sql, params);
  return result.rows[0].count;
}

async function isRoomAvailable(roomId, startDate, endDate, excludeReservationId = null) {
  const room = await getRoomById(roomId);
  if (!room) return false;
  const overlapping = await countOverlappingReservations(roomId, startDate, endDate, excludeReservationId);
  return overlapping < room.total_rooms;
}

async function createReservation({
  userId,
  guestEmail,
  guestFirstName,
  guestLastName,
  roomId,
  startDate,
  endDate,
  notes,
  nights,
  totalPrice,
  paymentStatus,
}) {
  const result = await query(
    `INSERT INTO reservations
       (user_id, guest_email, guest_first_name, guest_last_name, room_id,
        start_date, end_date, notes, nights, total_price, payment_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING reservation_id`,
    [
      userId || null,
      guestEmail || null,
      guestFirstName || null,
      guestLastName || null,
      roomId,
      startDate,
      endDate,
      notes || null,
      nights ?? null,
      totalPrice ?? null,
      paymentStatus || "Pending",
    ]
  );
  return result.rows[0].reservation_id;
}

async function getReservationById(reservationId) {
  const result = await query(
    `SELECT r.reservation_id, r.user_id, r.guest_email, r.guest_first_name, r.guest_last_name,
            r.start_date, r.end_date, r.status, r.payment_status, r.notes, r.nights, r.total_price,
            rm.room_id, rm.room_type, rm.description AS room_description
     FROM reservations r
     JOIN rooms rm ON rm.room_id = r.room_id
     WHERE r.reservation_id = $1`,
    [reservationId]
  );
  return result.rows[0] || null;
}

async function getReservationsForUser(userId) {
  const result = await query(
    `SELECT r.reservation_id, r.start_date, r.end_date, r.status, r.payment_status, r.notes,
            rm.room_type, rm.description AS room_description
     FROM reservations r
     JOIN rooms rm ON rm.room_id = r.room_id
     WHERE r.user_id = $1 AND r.status <> 'Cancelled'
     ORDER BY r.start_date DESC`,
    [userId]
  );
  return result.rows;
}

async function cancelReservation(reservationId, userId) {
  const result = await query(
    `UPDATE reservations
     SET status = 'Cancelled'
     WHERE reservation_id = $1 AND user_id = $2 AND status <> 'Cancelled'
     RETURNING reservation_id`,
    [reservationId, userId]
  );
  return result.rows[0] || null;
}

async function lookupReservations({ reservationId, email }) {
  const conditions = [];
  const params = [];

  if (reservationId) {
    params.push(reservationId);
    conditions.push(`r.reservation_id = $${params.length}`);
  }
  if (email) {
    params.push(email.toLowerCase());
    conditions.push(
      `(LOWER(u.email) = $${params.length} OR LOWER(r.guest_email) = $${params.length})`
    );
  }

  if (conditions.length === 0) return [];

  const result = await query(
    `SELECT r.reservation_id,
            COALESCE(u.first_name, r.guest_first_name) AS first_name,
            COALESCE(u.last_name, r.guest_last_name) AS last_name,
            COALESCE(u.email, r.guest_email) AS email,
            rm.room_type, rm.description AS room_description,
            r.start_date, r.end_date, r.status
     FROM reservations r
     JOIN rooms rm ON rm.room_id = r.room_id
     LEFT JOIN users u ON u.user_id = r.user_id
     WHERE (${conditions.join(" OR ")})
       AND r.status <> 'Cancelled'
     ORDER BY r.start_date DESC`,
    params
  );
  return result.rows;
}

async function updateRoomInventory(roomId, totalRooms, availableRooms) {
  const result = await query(
    `UPDATE rooms
     SET total_rooms = $2, available_rooms = $3
     WHERE room_id = $1
     RETURNING room_id, room_type, total_rooms, available_rooms`,
    [roomId, totalRooms, availableRooms]
  );
  return result.rows[0] || null;
}

function validateBookingDates(startDate, endDate) {
  const checkIn = new Date(startDate + "T12:00:00");
  const checkOut = new Date(endDate + "T12:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkInDay = new Date(startDate + "T12:00:00");
  checkInDay.setHours(0, 0, 0, 0);

  if (checkInDay <= today) {
    return "Check-in date must be in the future.";
  }
  if (checkOut <= checkIn) {
    return "Check-out date must be at least one day after check-in.";
  }
  return null;
}

module.exports = {
  getAllRooms,
  getRoomById,
  isRoomAvailable,
  createReservation,
  getReservationById,
  getReservationsForUser,
  cancelReservation,
  lookupReservations,
  updateRoomInventory,
  validateBookingDates,
};
