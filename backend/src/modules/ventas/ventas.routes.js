const { Router } = require("express");
const {
  registrar, listar, detalle, anular, registrarConvenio, listarConvenio,
  registrarSchema, anularSchema, convenioSchema,
} = require("./ventas.controller");
const { validateBody } = require("../../middleware/validate");
const { authenticate, requireRole } = require("../../middleware/auth");

const router = Router();

router.use(authenticate);

// Convenio gimnasio (solo admin). Va antes de "/:id" para no chocar.
router.post("/convenio", requireRole("admin"), validateBody(convenioSchema), registrarConvenio);
router.get("/convenio", listarConvenio);

// Registrar y anular: cajero y admin.
router.post("/", requireRole("cajero", "admin"), validateBody(registrarSchema), registrar);
router.post("/:id/anular", requireRole("cajero", "admin"), validateBody(anularSchema), anular);

// Consultas.
router.get("/", listar);
router.get("/:id", detalle);

module.exports = router;
