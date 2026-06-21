"use strict";

function requireLogin(req, res, next) {
  if (!req.session.user) {
    req.session.flash = { type: "error", message: "Please log in to continue." };
    return res.redirect("/login");
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user?.isAdmin) {
    req.session.flash = { type: "error", message: "Admin access required." };
    return res.redirect("/");
  }
  next();
}

function redirectIfLoggedIn(req, res, next) {
  if (req.session.user) {
    return res.redirect("/my_reservations");
  }
  next();
}

module.exports = { requireLogin, requireAdmin, redirectIfLoggedIn };
