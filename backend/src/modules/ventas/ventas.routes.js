const { Router } = require("express");
const { registrar, listar, detalle, anular, registrarSchema, anularSchema } = require("./ventas.controller");
const { validateBody } = require("../../middleware/validate");
const { authenticate, requireRole } = require("../../middleware/auth");

const router = Router();

router.use(authenticate);

// Registrar y anular: cajero y admin.
router.post("/", requireRole("cajero", "admin"), validateBody(registrarSchema), registrar);
router.post("/:id/anular", requireRole("cajero", "admin"), validateBody(anularSchema), anular);

// Consultas: cualquier usuario autenticado (el admin ve en remoto).
router.get("/", listar);
router.get("/:id", detalle);

module.exports = router;
