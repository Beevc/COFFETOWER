const { HttpError } = require("../utils/errors");

// Valida req.body contra un schema de zod.
// Reemplaza req.body por los datos ya parseados/tipados.
function validateBody(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        campo: i.path.join("."),
        mensaje: i.message,
      }));
      return next(new HttpError(400, "Datos inválidos", details));
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validateBody };
