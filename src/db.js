"use strict";

const path = require("path");
const fs = require("fs");

let pool;
let isEmbeddedDb = false;

function parseDatabaseUrl() {
  const url = process.env.DATABASE_URL || "pglite://./data/loreine";
  if (url.startsWith("pglite://")) {
    const dataDir = path.resolve(process.cwd(), url.replace("pglite://", "") || "./data/loreine");
    return { type: "pglite", dataDir };
  }
  return { type: "postgres", connectionString: url };
}

function createPglitePool(PGlite, dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);

  return {
    query: (text, params) => client.query(text, params),
    connect: async () => ({
      query: (text, params) => client.query(text, params),
      release: () => {},
    }),
    end: async () => {
      await client.close();
    },
  };
}

function initPool() {
  const config = parseDatabaseUrl();

  if (config.type === "pglite") {
    const { PGlite } = require("@electric-sql/pglite");
    isEmbeddedDb = true;
    pool = createPglitePool(PGlite, config.dataDir);
    return pool;
  }

  const { Pool } = require("pg");
  const poolConfig = { connectionString: config.connectionString };
  if (process.env.NODE_ENV === "production") {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
  pool = new Pool(poolConfig);
  pool.on("error", (err) => {
    console.error("Unexpected PostgreSQL pool error:", err);
  });
  return pool;
}

pool = initPool();

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query, isEmbeddedDb, parseDatabaseUrl };
