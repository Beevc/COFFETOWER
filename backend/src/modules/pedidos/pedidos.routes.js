const { Router } = require("express");
const { pendientes, preparadosHoy, preparar } = require("./pedidos.controller");
const { authenticate, requireRole } = require("../../middleware/auth");

const router = Router();
router.use(authenticate);

// El barista (y el admin) ven y preparan pedidos.
router.get("/pendientes", requireRole("barista", "admin"), pendientes);
router.get("/preparados-hoy", requireRole("barista", "admin"), preparadosHoy);
router.post("/:id/preparar", requireRole("barista", "admin"), preparar);

module.exports = router;
