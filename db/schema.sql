-- Loreine's Bay Resort Lodge — PostgreSQL schema
-- Mirrors the original PHP/MySQL course design (User, Login, Rooms, Reservation)

CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logins (
  login_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
  room_id SERIAL PRIMARY KEY,
  room_type VARCHAR(150) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  total_rooms INTEGER NOT NULL CHECK (total_rooms >= 0),
  available_rooms INTEGER NOT NULL CHECK (available_rooms >= 0),
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS reservations (
  reservation_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  guest_email VARCHAR(255),
  guest_first_name VARCHAR(100),
  guest_last_name VARCHAR(100),
  room_id INTEGER NOT NULL REFERENCES rooms(room_id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Confirmed',
  payment_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_room_dates ON reservations(room_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_reservations_guest_email ON reservations(guest_email);

CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS IDX_session_expire ON session(expire);
