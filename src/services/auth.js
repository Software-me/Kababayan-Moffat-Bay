"use strict";

const bcrypt = require("bcrypt");
const { query } = require("../db");

async function findLoginByUsername(username) {
  const result = await query(
    `SELECT l.login_id, l.username, l.password_hash,
            u.user_id, u.first_name, u.last_name, u.email, u.is_admin
     FROM logins l
     JOIN users u ON u.user_id = l.user_id
     WHERE l.username = $1`,
    [username]
  );
  return result.rows[0] || null;
}

async function findUserByEmail(email) {
  const result = await query(`SELECT user_id FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
  return result.rows[0] || null;
}

async function findUserByUsername(username) {
  const result = await query(`SELECT user_id FROM logins WHERE username = $1`, [username]);
  return result.rows[0] || null;
}

async function createUser({ firstName, lastName, email, username, password }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const client = await require("../db").pool.connect();
  try {
    await client.query("BEGIN");
    const userResult = await client.query(
      `INSERT INTO users (first_name, last_name, email)
       VALUES ($1, $2, $3)
       RETURNING user_id, first_name, last_name, email, is_admin`,
      [firstName, lastName, email]
    );
    const user = userResult.rows[0];
    await client.query(
      `INSERT INTO logins (user_id, username, password_hash) VALUES ($1, $2, $3)`,
      [user.user_id, username, passwordHash]
    );
    await client.query("COMMIT");
    return user;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

function setSessionUser(req, row) {
  req.session.user = {
    userId: row.user_id,
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    isAdmin: row.is_admin,
  };
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = {
  findLoginByUsername,
  findUserByEmail,
  findUserByUsername,
  createUser,
  setSessionUser,
  verifyPassword,
};
