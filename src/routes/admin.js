"use strict";

const express = require("express");
const { getAllRooms, getRoomById, updateRoomInventory } = require("../services/reservations");
const { getReservationStats, getRecentReservations } = require("../services/adminStats");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/admin", requireAdmin, async (req, res) => {
  try {
    const stats = await getReservationStats();
    const recentReservations = await getRecentReservations();
    res.render("admin_dashboard", {
      activePage: "admin-dashboard",
      stats,
      recentReservations,
    });
  } catch (err) {
    console.error("Admin dashboard error:", err);
    res.status(500).render("error", { message: "Could not load admin dashboard." });
  }
});

router.get("/update_room", requireAdmin, async (req, res) => {
  try {
    const rooms = await getAllRooms();
    const selectedId = parseInt(req.query.room_id, 10) || rooms[0]?.room_id;
    const selectedRoom = rooms.find((r) => r.room_id === selectedId) || rooms[0];
    res.render("update_room", {
      activePage: "admin",
      rooms,
      selectedRoom,
      success: null,
      error: null,
    });
  } catch (err) {
    console.error("Update room page error:", err);
    res.status(500).render("error", { message: "Could not load room admin page." });
  }
});

router.post("/update_room", requireAdmin, async (req, res) => {
  const roomId = parseInt(req.body.room_id, 10);
  const totalRooms = parseInt(req.body.total_rooms, 10);
  const availableRooms = parseInt(req.body.available_rooms, 10);

  try {
    const rooms = await getAllRooms();
    if (Number.isNaN(totalRooms) || Number.isNaN(availableRooms) || totalRooms < 0 || availableRooms < 0) {
      const selectedRoom = await getRoomById(roomId);
      return res.render("update_room", {
        activePage: "admin",
        rooms,
        selectedRoom,
        success: null,
        error: "Enter valid non-negative numbers.",
      });
    }
    if (availableRooms > totalRooms) {
      const selectedRoom = await getRoomById(roomId);
      return res.render("update_room", {
        activePage: "admin",
        rooms,
        selectedRoom,
        success: null,
        error: "Available rooms cannot exceed total rooms.",
      });
    }

    const updated = await updateRoomInventory(roomId, totalRooms, availableRooms);
    if (!updated) {
      return res.status(404).render("error", { message: "Room not found." });
    }

    const refreshedRooms = await getAllRooms();
    res.render("update_room", {
      activePage: "admin",
      rooms: refreshedRooms,
      selectedRoom: updated,
      success: `Updated ${updated.room_type}: ${updated.total_rooms} total, ${updated.available_rooms} available.`,
      error: null,
    });
  } catch (err) {
    console.error("Update room error:", err);
    res.status(500).render("error", { message: "Could not update room." });
  }
});

module.exports = router;
