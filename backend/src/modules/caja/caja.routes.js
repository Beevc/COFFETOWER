const { Router } = require("express");
const { estado, abrir, cerrar, abrirSchema, cerrarSchema } = require("./caja.controller");
const { validateBody } = require("../../middleware/validate");
const { authenticate, requireRole } = require("../../middleware/auth");

const router = Router();

// Cualquier usuario autenticado puede ver el estado de la caja.
router.get("/estado", authenticate, estado);

// Abrir/cerrar caja: cajero y admin.
router.post("/abrir", authenticate, requireRole("cajero", "admin"), validateBody(abrirSchema), abrir);
router.post("/cerrar", authenticate, requireRole("cajero", "admin"), validateBody(cerrarSchema), cerrar);

module.exports = router;
