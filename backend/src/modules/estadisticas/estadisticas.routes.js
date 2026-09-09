const { Router } = require("express");
const { resumen } = require("./estadisticas.controller");
const { authenticate, requireRole } = require("../../middleware/auth");

const router = Router();

// Solo el administrador ve estadísticas globales.
router.get("/", authenticate, requireRole("admin"), resumen);

module.exports = router;
