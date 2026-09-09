const { Router } = require("express");
const {
  verConfig, guardarConfig, listClientes, crearCliente, actualizarCliente,
  configSchema, clienteSchema, clienteUpdateSchema,
} = require("./fidelidad.controller");
const { validateBody } = require("../../middleware/validate");
const { authenticate, requireRole } = require("../../middleware/auth");

const router = Router();
router.use(authenticate);

// Config: ver cualquiera autenticado; editar solo admin.
router.get("/config", verConfig);
router.put("/config", requireRole("admin"), validateBody(configSchema), guardarConfig);

// Clientes: cajero y admin (el cajero los registra/usa en el POS).
router.get("/clientes", listClientes);
router.post("/clientes", requireRole("admin", "cajero"), validateBody(clienteSchema), crearCliente);
router.patch("/clientes/:id", requireRole("admin", "cajero"), validateBody(clienteUpdateSchema), actualizarCliente);

module.exports = router;
