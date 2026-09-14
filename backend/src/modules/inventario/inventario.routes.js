const { Router } = require("express");
const { list, getOne, crear, crearSchema } = require("./inventario.controller");
const { validateBody } = require("../../middleware/validate");
const { authenticate, requireRole } = require("../../middleware/auth");

const router = Router();

// Conteo de inventario: solo administrador.
router.use(authenticate, requireRole("admin"));

router.get("/conteos", list);
router.get("/conteos/:id", getOne);
router.post("/conteos", validateBody(crearSchema), crear);

module.exports = router;
