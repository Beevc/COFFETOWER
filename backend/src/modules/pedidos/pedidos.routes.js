const { Router } = require("express");
const { activos, entregadosHoy, cambiarEstado, cambiarEstadoSchema } = require("./pedidos.controller");
const { validateBody } = require("../../middleware/validate");
const { authenticate, requireRole } = require("../../middleware/auth");

const router = Router();
router.use(authenticate);

// Ver pedidos: barista, cajero y admin (el barista prepara, la caja entrega y ve estado).
router.get("/activos", requireRole("barista", "cajero", "admin"), activos);
router.get("/entregados-hoy", requireRole("barista", "cajero", "admin"), entregadosHoy);
// Cambiar estado: el controller valida el paso y el rol exacto (barista prepara, caja entrega).
router.post("/:id/estado", requireRole("barista", "cajero", "admin"), validateBody(cambiarEstadoSchema), cambiarEstado);

module.exports = router;
