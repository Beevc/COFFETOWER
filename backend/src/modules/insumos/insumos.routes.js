const { Router } = require("express");
const {
  list, create, update, registrarMovimiento, historial,
  createSchema, updateSchema, movimientoSchema,
} = require("./insumos.controller");
const { validateBody } = require("../../middleware/validate");
const { authenticate, requireRole } = require("../../middleware/auth");

const router = Router();

router.use(authenticate);

// Lectura: cualquier autenticado (para ver alertas). Escritura: solo admin.
router.get("/", list);
router.get("/:id/movimientos", historial);
router.post("/", requireRole("admin"), validateBody(createSchema), create);
router.patch("/:id", requireRole("admin"), validateBody(updateSchema), update);
router.post("/:id/movimientos", requireRole("admin"), validateBody(movimientoSchema), registrarMovimiento);

module.exports = router;
