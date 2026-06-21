"use strict";

const express = require("express");
const {
  findLoginByUsername,
  findUserByEmail,
  findUserByUsername,
  createUser,
  setSessionUser,
  verifyPassword,
} = require("../services/auth");
const { redirectIfLoggedIn } = require("../middleware/auth");

const router = express.Router();

router.get("/login", redirectIfLoggedIn, (req, res) => {
  res.render("login", { activePage: "login", error: null });
});

router.post("/login", redirectIfLoggedIn, async (req, res) => {
  const username = (req.body.username || "").trim();
  const password = req.body.password || "";

  if (!username || !password) {
    return res.render("login", {
      activePage: "login",
      error: "Username and password are required.",
    });
  }

  try {
    const account = await findLoginByUsername(username);
    if (!account) {
      return res.render("login", { activePage: "login", error: "User not found." });
    }
    const valid = await verifyPassword(password, account.password_hash);
    if (!valid) {
      return res.render("login", { activePage: "login", error: "Invalid password." });
    }
    setSessionUser(req, account);
    return res.redirect("/my_reservations");
  } catch (err) {
    console.error("Login error:", err);
    return res.render("login", {
      activePage: "login",
      error: "Something went wrong. Please try again.",
    });
  }
});

router.get("/register", redirectIfLoggedIn, (req, res) => {
  res.render("register", { activePage: "register", error: null, values: {} });
});

router.post("/register", redirectIfLoggedIn, async (req, res) => {
  const firstName = (req.body.first_name || "").trim();
  const lastName = (req.body.last_name || "").trim();
  const email = (req.body.email || "").trim();
  const username = (req.body.username || "").trim();
  const password = req.body.password || "";
  const values = { first_name: firstName, last_name: lastName, email, username };

  if (!firstName || !lastName || !email || !username || !password) {
    return res.render("register", {
      activePage: "register",
      error: "All fields are required.",
      values,
    });
  }

  if (password.length < 6) {
    return res.render("register", {
      activePage: "register",
      error: "Password must be at least 6 characters.",
      values,
    });
  }

  try {
    if (await findUserByEmail(email)) {
      return res.render("register", {
        activePage: "register",
        error: "An account with that email already exists.",
        values,
      });
    }
    if (await findUserByUsername(username)) {
      return res.render("register", {
        activePage: "register",
        error: "That username is already taken.",
        values,
      });
    }

    const user = await createUser({ firstName, lastName, email, username, password });
    setSessionUser(req, {
      user_id: user.user_id,
      username,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      is_admin: user.is_admin,
    });
    req.session.flash = { type: "success", message: "Account created. Welcome!" };
    return res.redirect("/my_reservations");
  } catch (err) {
    console.error("Registration error:", err);
    return res.render("register", {
      activePage: "register",
      error: "Could not create account. Please try again.",
      values,
    });
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

module.exports = router;
