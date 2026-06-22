"use strict";

const { query } = require("../db");

async function getReservationStats() {
  const result = await query(`
    SELECT
      (SELECT COUNT(*)::int FROM reservations WHERE status <> 'Cancelled') AS total_reservations,
      (SELECT COUNT(*)::int FROM reservations WHERE status = 'Cancelled') AS cancelled_reservations,
      (SELECT COUNT(DISTINCT user_id)::int FROM reservations
        WHERE user_id IS NOT NULL AND status <> 'Cancelled') AS registered_users_with_reservations,
      (SELECT COUNT(*)::int FROM reservations
        WHERE user_id IS NULL AND status <> 'Cancelled') AS guest_reservations,
      (SELECT COUNT(*)::int FROM users) AS total_registered_users,
      (SELECT COALESCE(SUM(total_price), 0)::numeric FROM reservations
        WHERE payment_status = 'Paid' AND status <> 'Cancelled') AS total_revenue
  `);

  return result.rows[0];
}

async function getRecentReservations(limit = 25) {
  const result = await query(
    `SELECT r.reservation_id,
            r.start_date,
            r.end_date,
            r.status,
            r.payment_status,
            r.nights,
            r.total_price,
            r.guest_email,
            COALESCE(u.first_name, r.guest_first_name) AS first_name,
            COALESCE(u.last_name, r.guest_last_name) AS last_name,
            COALESCE(u.email, r.guest_email) AS email,
            CASE WHEN r.user_id IS NOT NULL THEN 'Registered' ELSE 'Guest' END AS booking_type,
            rm.room_type
     FROM reservations r
     JOIN rooms rm ON rm.room_id = r.room_id
     LEFT JOIN users u ON u.user_id = r.user_id
     ORDER BY r.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

module.exports = { getReservationStats, getRecentReservations };
