const { Router } = require("express");
const { list, create, update, remove, createSchema, updateSchema } = require("./opciones.controller");
const { validateBody } = require("../../middleware/validate");
const { authenticate, requireRole } = require("../../middleware/auth");

const router = Router();
router.use(authenticate);

// Ver opciones: cualquiera autenticado (el POS del cajero las usa). Editar: admin.
router.get("/", list);
router.post("/", requireRole("admin"), validateBody(createSchema), create);
router.patch("/:id", requireRole("admin"), validateBody(updateSchema), update);
router.delete("/:id", requireRole("admin"), remove);

module.exports = router;
