"use strict";

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        reject(err);
        return;
      }
      resolve();
    });
  });
}

async function redirectWithSession(req, res, url, status = 302) {
  try {
    await saveSession(req);
  } catch (_err) {
    // Still redirect so the user is not stuck on a blank response.
  }
  return res.redirect(status, url);
}

module.exports = { saveSession, redirectWithSession };
