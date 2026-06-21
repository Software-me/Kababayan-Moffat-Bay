"use strict";

require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { pool, isEmbeddedDb } = require("./db");

const authRoutes = require("./routes/auth");
const reservationRoutes = require("./routes/reservations");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..", "public")));

const sessionOptions = {
  secret: process.env.SESSION_SECRET || "dev-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  },
};

if (isEmbeddedDb) {
  console.log("Using embedded database (PGlite) — sessions stored in memory for this mode.");
} else {
  sessionOptions.store = new pgSession({
    pool,
    tableName: "session",
    createTableIfMissing: true,
  });
}

app.use(session(sessionOptions));

app.locals.formatDate = (value) => {
  if (!value) return "";
  if (value instanceof Date) return value.toLocaleDateString("en-CA");
  return String(value).slice(0, 10);
};

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});

app.get("/", (req, res) => {
  res.render("index", { activePage: "home" });
});

app.get("/about", (req, res) => {
  res.render("about", { activePage: "about" });
});

app.get("/attractions", (req, res) => {
  res.render("attractions", { activePage: "attractions" });
});

app.get("/contact", (req, res) => {
  res.render("contact", { activePage: "contact" });
});

app.get("/lookup", (req, res) => {
  res.render("lookup", {
    activePage: "reservations",
    lookupResults: null,
    lookupError: null,
  });
});

const htmlRedirects = {
  "/index.html": "/",
  "/about.html": "/about",
  "/attractions.html": "/attractions",
  "/contact.html": "/contact",
  "/login.html": "/login",
  "/register.html": "/register",
  "/logout.html": "/logout",
  "/room_reservation.html": "/room_reservation",
  "/reservation_summary.html": "/reservation_summary",
  "/my_reservations.html": "/my_reservations",
  "/update_room.html": "/update_room",
};

Object.entries(htmlRedirects).forEach(([from, to]) => {
  app.get(from, (req, res) => res.redirect(301, to));
});

app.use(authRoutes);
app.use(reservationRoutes);
app.use(adminRoutes);

app.use((req, res) => {
  res.status(404).render("error", { message: "Page not found." });
});

app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).render("error", { message: "Something went wrong." });
});

async function start() {
  try {
    await pool.query("SELECT 1");
    app.listen(PORT, () => {
      console.log(`Loreine's Bay Resort Lodge running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("\nCould not connect to the database.");
    console.error("Embedded mode (default):  npm run db:init && npm run dev");
    console.error("With Docker PostgreSQL:   docker compose up -d");
    console.error("  then set DATABASE_URL=postgresql://loreine:loreine@localhost:5432/loreine_bay\n");
    console.error(err.message);
    process.exit(1);
  }
}

start();
