const { verifyToken } = require("../utils/jwt");
const { HttpError } = require("../utils/errors");

// Verifica el JWT del header Authorization: Bearer <token>.
// Deja los datos del usuario en req.user.
function authenticate(req, _res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(new HttpError(401, "Falta el token de autenticación"));
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      rol: payload.rol,
      localId: payload.localId,
      nombre: payload.nombre,
      email: payload.email,
    };
    next();
  } catch {
    next(new HttpError(401, "Token inválido o expirado"));
  }
}

// Restringe el acceso a ciertos roles. Uso: requireRole("admin")
function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, "No autenticado"));
    if (!roles.includes(req.user.rol)) {
      return next(new HttpError(403, "No tienes permiso para esta acción"));
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
