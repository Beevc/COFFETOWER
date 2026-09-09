const { z } = require("zod");
const { query } = require("../../config/db");
const { hashPassword } = require("../../utils/password");
const { HttpError } = require("../../utils/errors");
const { asyncHandler } = require("../../utils/asyncHandler");

const ROLES = ["admin", "cajero", "barista"];

const createSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  rol: z.enum(ROLES, { message: "Rol inválido" }),
});

// En update todos los campos son opcionales, pero debe venir al menos uno.
const updateSchema = z
  .object({
    nombre: z.string().trim().min(1, "El nombre es obligatorio").optional(),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional(),
    rol: z.enum(ROLES, { message: "Rol inválido" }).optional(),
    activo: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
  });

const publicUser = (u) => ({
  id: u.id,
  nombre: u.nombre,
  email: u.email,
  rol: u.rol,
  activo: u.activo,
  localId: u.local_id,
  createdAt: u.created_at,
});

// Cuenta admins activos en el local (excluyendo opcionalmente un id).
async function contarAdminsActivos(localId, exceptId = null) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS n FROM usuario
      WHERE local_id = $1 AND rol = 'admin' AND activo = true
        AND ($2::int IS NULL OR id <> $2)`,
    [localId, exceptId]
  );
  return rows[0].n;
}

async function getUsuarioDelLocal(id, localId) {
  const { rows } = await query(
    `SELECT id, local_id, nombre, email, rol, activo, created_at
       FROM usuario WHERE id = $1 AND local_id = $2`,
    [id, localId]
  );
  return rows[0] || null;
}

// GET /api/users
const list = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT id, local_id, nombre, email, rol, activo, created_at
       FROM usuario WHERE local_id = $1 ORDER BY created_at ASC`,
    [req.user.localId]
  );
  res.json({ usuarios: rows.map(publicUser) });
});

// GET /api/users/:id
const getOne = asyncHandler(async (req, res) => {
  const usuario = await getUsuarioDelLocal(Number(req.params.id), req.user.localId);
  if (!usuario) throw new HttpError(404, "Usuario no encontrado");
  res.json({ usuario: publicUser(usuario) });
});

// POST /api/users
const create = asyncHandler(async (req, res) => {
  const { nombre, email, password, rol } = req.body;
  const passwordHash = await hashPassword(password);
  try {
    const { rows } = await query(
      `INSERT INTO usuario (local_id, nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, local_id, nombre, email, rol, activo, created_at`,
      [req.user.localId, nombre, email.toLowerCase(), passwordHash, rol]
    );
    res.status(201).json({ usuario: publicUser(rows[0]) });
  } catch (err) {
    if (err.code === "23505") {
      throw new HttpError(409, "Ya existe un usuario con ese email");
    }
    throw err;
  }
});

// PATCH /api/users/:id
const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const localId = req.user.localId;
  const actual = await getUsuarioDelLocal(id, localId);
  if (!actual) throw new HttpError(404, "Usuario no encontrado");

  const { nombre, password, rol, activo } = req.body;

  // No puedes desactivarte a ti mismo/a.
  if (activo === false && id === req.user.id) {
    throw new HttpError(400, "No puedes desactivar tu propia cuenta");
  }

  // Proteger al último admin activo: si este usuario es admin activo y se lo
  // va a desactivar o a cambiar de rol, debe quedar al menos otro admin activo.
  const dejaDeSerAdminActivo =
    actual.rol === "admin" &&
    actual.activo === true &&
    ((rol && rol !== "admin") || activo === false);

  if (dejaDeSerAdminActivo) {
    const otros = await contarAdminsActivos(localId, id);
    if (otros === 0) {
      throw new HttpError(400, "Debe quedar al menos un administrador activo");
    }
  }

  // Construcción dinámica del UPDATE solo con los campos enviados.
  const sets = [];
  const values = [];
  let i = 1;
  if (nombre !== undefined) { sets.push(`nombre = $${i++}`); values.push(nombre); }
  if (rol !== undefined) { sets.push(`rol = $${i++}`); values.push(rol); }
  if (activo !== undefined) { sets.push(`activo = $${i++}`); values.push(activo); }
  if (password !== undefined) {
    sets.push(`password_hash = $${i++}`);
    values.push(await hashPassword(password));
  }
  sets.push(`updated_at = now()`);

  values.push(id, localId);
  const { rows } = await query(
    `UPDATE usuario SET ${sets.join(", ")}
      WHERE id = $${i++} AND local_id = $${i}
      RETURNING id, local_id, nombre, email, rol, activo, created_at`,
    values
  );
  res.json({ usuario: publicUser(rows[0]) });
});

module.exports = { list, getOne, create, update, createSchema, updateSchema };
