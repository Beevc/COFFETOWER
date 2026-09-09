const { z } = require("zod");
const { query } = require("../../config/db");
const { verifyPassword } = require("../../utils/password");
const { signToken } = require("../../utils/jwt");
const { HttpError } = require("../../utils/errors");
const { asyncHandler } = require("../../utils/asyncHandler");

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { rows } = await query(
    `SELECT id, local_id, nombre, email, password_hash, rol, activo
       FROM usuario WHERE email = $1`,
    [email.toLowerCase()]
  );
  const usuario = rows[0];

  // Mensaje genérico para no revelar si el email existe.
  if (!usuario || !usuario.activo) {
    throw new HttpError(401, "Credenciales inválidas");
  }

  const ok = await verifyPassword(password, usuario.password_hash);
  if (!ok) {
    throw new HttpError(401, "Credenciales inválidas");
  }

  const token = signToken({
    sub: usuario.id,
    rol: usuario.rol,
    localId: usuario.local_id,
    nombre: usuario.nombre,
    email: usuario.email,
  });

  res.json({
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      localId: usuario.local_id,
    },
  });
});

// GET /api/auth/me  (requiere token)
const me = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT id, local_id, nombre, email, rol, activo
       FROM usuario WHERE id = $1`,
    [req.user.id]
  );
  const usuario = rows[0];
  if (!usuario || !usuario.activo) {
    throw new HttpError(401, "Usuario no disponible");
  }
  res.json({
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      localId: usuario.local_id,
    },
  });
});

module.exports = { login, me, loginSchema };
