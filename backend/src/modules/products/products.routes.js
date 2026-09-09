const { Router } = require("express");
const { list, getOne, create, update, createSchema, updateSchema } = require("./products.controller");
const { validateBody } = require("../../middleware/validate");
const { authenticate, requireRole } = require("../../middleware/auth");

const router = Router();

// Lecturas: cualquier usuario autenticado (el cajero las usa para vender).
router.get("/", authenticate, list);
router.get("/:id", authenticate, getOne);

// Modificaciones: solo admin.
router.post("/", authenticate, requireRole("admin"), validateBody(createSchema), create);
router.patch("/:id", authenticate, requireRole("admin"), validateBody(updateSchema), update);

module.exports = router;
