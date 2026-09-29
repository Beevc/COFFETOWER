const { Router } = require("express");
const { resumen, serie, periodos, ventasDetalle } = require("./estadisticas.controller");
const { authenticate, requireRole } = require("../../middleware/auth");

const router = Router();

// Solo el administrador ve estadísticas globales.
router.use(authenticate, requireRole("admin"));
router.get("/", resumen);
router.get("/serie", serie);
router.get("/periodos", periodos);
router.get("/ventas", ventasDetalle);

module.exports = router;
