const { Router } = require("express");
const { list, getOne, create, update, createSchema, updateSchema } = require("./users.controller");
const { validateBody } = require("../../middleware/validate");
const { authenticate, requireRole } = require("../../middleware/auth");

const router = Router();

// Todo el módulo de usuarios es solo para admin.
router.use(authenticate, requireRole("admin"));

router.get("/", list);
router.get("/:id", getOne);
router.post("/", validateBody(createSchema), create);
router.patch("/:id", validateBody(updateSchema), update);

module.exports = router;
