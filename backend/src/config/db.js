const { Pool } = require("pg");
const { env } = require("./env");

// Supabase (y la mayoría de Postgres en la nube) exige conexión SSL.
// Activamos SSL si la URL apunta a Supabase o si DB_SSL=true en el .env.
const needsSsl =
  process.env.DB_SSL === "true" || /supabase\.(co|com)/i.test(env.databaseUrl);

const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  console.error("Error inesperado en el pool de PostgreSQL:", err);
});

function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
