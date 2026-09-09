/**
 * Seed inicial (idempotente).
 * Crea el local y el usuario administrador a partir de las variables
 * de entorno (ver .env). Si ya existen, no los duplica.
 *
 * Uso: node src/db/seeds/seed.js   (o: npm run seed)
 */
const { pool } = require("../../config/db");
const { env } = require("../../config/env");
const { hashPassword } = require("../../utils/password");

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) Local: si no hay ninguno, lo creamos.
    let { rows: locales } = await client.query("SELECT id FROM local ORDER BY id LIMIT 1");
    let localId;
    if (locales.length === 0) {
      const res = await client.query(
        "INSERT INTO local (nombre, direccion) VALUES ($1, $2) RETURNING id",
        [env.seed.localNombre, env.seed.localDireccion]
      );
      localId = res.rows[0].id;
      console.log(`✔ Local creado (id=${localId}): ${env.seed.localNombre}`);
    } else {
      localId = locales[0].id;
      console.log(`• Local ya existe (id=${localId}), no se crea otro.`);
    }

    // 2) Admin: solo si no existe ese email.
    const { rows: existentes } = await client.query(
      "SELECT id FROM usuario WHERE email = $1",
      [env.seed.adminEmail]
    );
    if (existentes.length === 0) {
      const passwordHash = await hashPassword(env.seed.adminPassword);
      const res = await client.query(
        `INSERT INTO usuario (local_id, nombre, email, password_hash, rol)
         VALUES ($1, $2, $3, $4, 'admin') RETURNING id`,
        [localId, env.seed.adminNombre, env.seed.adminEmail, passwordHash]
      );
      console.log(`✔ Admin creado (id=${res.rows[0].id}): ${env.seed.adminEmail}`);
      console.log(`  Contraseña inicial: ${env.seed.adminPassword}  (cámbiala luego)`);
    } else {
      console.log(`• Admin ya existe (${env.seed.adminEmail}), no se recrea.`);
    }

    await client.query("COMMIT");
    console.log("Seed completado.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error en el seed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
