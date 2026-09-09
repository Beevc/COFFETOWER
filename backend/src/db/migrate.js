/**
 * Runner de migraciones minimalista.
 * Aplica los archivos .sql de ./migrations en orden alfabético
 * y registra los ya aplicados en la tabla schema_migrations.
 *
 * Uso:
 *   node src/db/migrate.js up       -> aplica las pendientes
 *   node src/db/migrate.js status   -> muestra el estado de cada migración
 */
const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

function readMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

async function getApplied() {
  const { rows } = await pool.query("SELECT name FROM schema_migrations");
  return new Set(rows.map((r) => r.name));
}

async function up() {
  await ensureMigrationsTable();
  const applied = await getApplied();
  const files = readMigrationFiles();
  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log("No hay migraciones pendientes.");
    return;
  }

  for (const file of pending) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`✔ Aplicada: ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`x Fallo: ${file}`);
      throw err;
    } finally {
      client.release();
    }
  }
}

async function status() {
  await ensureMigrationsTable();
  const applied = await getApplied();
  const files = readMigrationFiles();
  if (files.length === 0) {
    console.log("No hay archivos de migración.");
    return;
  }
  for (const file of files) {
    console.log(`${applied.has(file) ? "[aplicada] " : "[pendiente]"} ${file}`);
  }
}

async function main() {
  const cmd = process.argv[2] || "up";
  try {
    if (cmd === "up") await up();
    else if (cmd === "status") await status();
    else {
      console.error(`Comando desconocido: ${cmd} (usa "up" o "status")`);
      process.exitCode = 1;
    }
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
