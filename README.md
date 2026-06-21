# Loreine's Bay Resort Lodge

Full-stack resort reservation web application built with **Node.js**, **Express**, **EJS**, and **PostgreSQL**. Evolved from the original static HTML/PHP course design into a deployable app with real authentication, bookings, and admin room management.

## Features

- User registration and login (bcrypt password hashing, PostgreSQL-backed sessions)
- Room booking with date validation and overlap-based availability checks
- Reservation summary and lookup by ID or email
- My Reservations (view and cancel) for logged-in users
- Admin room inventory management (`admin` / `admin`)
- Marketing pages: Home, About, Attractions, Contact

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ (already sufficient — **no Docker or PostgreSQL install required** for local use)

The app uses an **embedded PostgreSQL-compatible database (PGlite)** by default. Data is stored in `./data/loreine`. For production or advanced setups, you can switch to full PostgreSQL (Docker or a cloud host).

## Quick start (works immediately on Windows)

### 1. Install dependencies

```bash
npm install
```

### 2. Initialize the database (one time)

```bash
npm run db:init
```

Creates tables, 8 room types, demo users, and sample reservations.

### 3. Start the app

```bash
npm start
```

Or for auto-reload during development:

```bash
npm run dev
```

Open **http://localhost:3000**

**One-command setup:** `npm run setup` (runs db:init + start)

## Optional: full PostgreSQL (Docker)

If you prefer a standalone PostgreSQL server:

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Run `docker compose up -d`
3. Change `.env` to:
   ```
   DATABASE_URL=postgresql://loreine:loreine@localhost:5432/loreine_bay
   ```
4. Run `npm run db:init` and `npm start`

## Demo accounts

| Role  | Username | Password |
|-------|----------|----------|
| Guest | `demo`   | `demo`   |
| Admin | `admin`  | `admin`  |

The demo user has two sample reservations. Admin users see **Manage Rooms** in the navigation.

## Project structure

```
├── db/                 # SQL schema and seed data
├── public/css/         # Static assets (CSS)
├── scripts/init-db.js  # Database setup script
├── src/
│   ├── server.js       # Express app entry point
│   ├── routes/         # HTTP routes
│   ├── services/       # Business logic
│   └── middleware/     # Auth guards
└── views/              # EJS templates
```

## Deploy to Render (recommended — live public URL)

This repo includes a **`render.yaml`** blueprint that provisions:

- A **Node.js web service** (auto-deploys on every push to `main`)
- A **free PostgreSQL database** (persistent reservations & users)

### One-time setup

1. Push this repo to GitHub (see below if not done yet).
2. Open [Render Blueprint deploy](https://dashboard.render.com/select-repo?type=blueprint).
3. Connect your GitHub account and select **LoreineResortBayLodge**.
4. Click **Apply** — Render reads `render.yaml` and creates the database + web service.
5. Wait for the first deploy to finish (~3–5 minutes).
6. Open your live URL: `https://loreines-bay-resort-lodge.onrender.com` (or the URL Render assigns).

After setup, **every push to `main` automatically redeploys** the live site.

### Alternative: Railway

Use **`railway.toml`** — create a project on [Railway](https://railway.app), connect GitHub, add a PostgreSQL plugin, and set `DATABASE_URL`, `SESSION_SECRET`, and `NODE_ENV=production`.

## Publish to GitHub + go live on Render

Git is initialized and the first commit is ready. To push and open Render setup:

```powershell
gh auth login
powershell -ExecutionPolicy Bypass -File scripts/publish.ps1
```

The publish script creates the GitHub repo, pushes `main`, and opens the Render Blueprint page. Connect the repo once — after that, **every push to `main` auto-deploys** the live site.

## Local development notes

The original `.html` files in the project root are kept for reference. The live app uses EJS routes (e.g. `/login` instead of `login.html`). Old URLs redirect automatically.

## License

Sample / portfolio project.
