const { HttpError } = require("../utils/errors");

// Middleware final de manejo de errores.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.message,
      ...(err.details ? { detalles: err.details } : {}),
    });
  }

  console.error("Error no controlado:", err);
  return res.status(500).json({ error: "Error interno del servidor" });
}

// Para rutas no encontradas.
function notFound(_req, res) {
  res.status(404).json({ error: "Recurso no encontrado" });
}

module.exports = { errorHandler, notFound };
