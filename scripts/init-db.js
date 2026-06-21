"use strict";

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const { pool } = require("../src/db");

function splitSqlStatements(sql) {
  const withoutComments = sql.replace(/^--.*$/gm, "").trim();
  return withoutComments
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function runSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, "utf8");
  const statements = splitSqlStatements(sql);

  for (const statement of statements) {
    await pool.query(statement);
  }
}

async function seedUsers() {
  const demoHash = await bcrypt.hash("demo", 10);
  const adminHash = await bcrypt.hash("admin", 10);

  await pool.query(
    `INSERT INTO users (user_id, first_name, last_name, email, is_admin)
     VALUES
       (1, 'Alex', 'Rivera', 'alex.rivera@example.com', false),
       (2, 'Admin', 'Staff', 'admin@loreinesbay.com', true)
     ON CONFLICT (email) DO UPDATE SET
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       is_admin = EXCLUDED.is_admin`
  );

  await pool.query(
    `INSERT INTO logins (user_id, username, password_hash)
     VALUES
       (1, 'demo', $1),
       (2, 'admin', $2)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [demoHash, adminHash]
  );

  await pool.query(`SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users))`);

  const existingRes = await pool.query(`SELECT COUNT(*)::int AS c FROM reservations`);
  if (existingRes.rows[0].c === 0) {
    await pool.query(
      `INSERT INTO reservations
         (user_id, room_id, start_date, end_date, status, payment_status, notes)
       VALUES
         (1, 4, '2026-05-10', '2026-05-14', 'Confirmed', 'Paid', 'Late arrival after 9pm'),
         (1, 3, '2026-06-01', '2026-06-04', 'Confirmed', 'Pending', NULL)`
    );
  }
}

async function main() {
  const schemaPath = path.join(__dirname, "..", "db", "schema.sql");
  const seedPath = path.join(__dirname, "..", "db", "seed.sql");

  console.log("Applying schema...");
  await runSqlFile(schemaPath);

  console.log("Seeding rooms...");
  await runSqlFile(seedPath);

  console.log("Seeding users and sample reservations...");
  await seedUsers();

  console.log("Database ready.");
  console.log("  Demo login:  demo / demo");
  console.log("  Admin login: admin / admin");
}

main()
  .catch((err) => {
    console.error("Database init failed:", err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
