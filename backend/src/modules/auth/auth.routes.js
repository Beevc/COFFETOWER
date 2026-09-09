const { Router } = require("express");
const { login, me, loginSchema } = require("./auth.controller");
const { validateBody } = require("../../middleware/validate");
const { authenticate } = require("../../middleware/auth");

const router = Router();

router.post("/login", validateBody(loginSchema), login);
router.get("/me", authenticate, me);

module.exports = router;
