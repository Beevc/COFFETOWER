const { Router } = require("express");
const { getReceta, setReceta, setRecetaSchema } = require("./recetas.controller");
const { validateBody } = require("../../middleware/validate");
const { authenticate, requireRole } = require("../../middleware/auth");

const router = Router();

router.use(authenticate);

// Ver receta: cualquier autenticado. Definir: solo admin.
router.get("/:productoId", getReceta);
router.put("/:productoId", requireRole("admin"), validateBody(setRecetaSchema), setReceta);

module.exports = router;
