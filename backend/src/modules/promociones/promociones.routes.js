const { Router } = require("express");
const { list, create, update, createSchema, updateSchema } = require("./promociones.controller");
const { validateBody } = require("../../middleware/validate");
const { authenticate, requireRole } = require("../../middleware/auth");

const router = Router();

router.use(authenticate);
router.get("/", list); // lectura: cualquiera autenticado
router.post("/", requireRole("admin"), validateBody(createSchema), create);
router.patch("/:id", requireRole("admin"), validateBody(updateSchema), update);

module.exports = router;
