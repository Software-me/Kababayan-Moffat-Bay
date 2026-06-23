"use strict";

const { redirectWithSession } = require("../utils/session");

function requireLogin(req, res, next) {
  if (!req.session.user) {
    req.session.flash = { type: "error", message: "Please log in to continue." };
    return redirectWithSession(req, res, "/login");
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user?.isAdmin) {
    req.session.flash = { type: "error", message: "Admin access required." };
    return redirectWithSession(req, res, "/");
  }
  next();
}

function redirectIfLoggedIn(req, res, next) {
  if (req.session.user) {
    return redirectWithSession(req, res, "/my_reservations");
  }
  next();
}

module.exports = { requireLogin, requireAdmin, redirectIfLoggedIn };
