const { Router } = require("express");
const { estado, abrir, cerrar, arqueo, abrirSchema, cerrarSchema, arqueoSchema } = require("./caja.controller");
const { validateBody } = require("../../middleware/validate");
const { authenticate, requireRole } = require("../../middleware/auth");

const router = Router();

// Cualquier usuario autenticado puede ver el estado de la caja.
router.get("/estado", authenticate, estado);

// Abrir/cerrar caja: SOLO admin (asigna cajero y monto; los cajeros no pueden).
router.post("/abrir", authenticate, requireRole("admin"), validateBody(abrirSchema), abrir);
router.post("/cerrar", authenticate, requireRole("admin"), validateBody(cerrarSchema), cerrar);

// Arqueo / mini cierre: el cajero (y admin) cuentan el efectivo sin cerrar la caja.
router.post("/arqueo", authenticate, requireRole("cajero", "admin"), validateBody(arqueoSchema), arqueo);

module.exports = router;
