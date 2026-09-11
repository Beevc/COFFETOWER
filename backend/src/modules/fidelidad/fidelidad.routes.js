const { Router } = require("express");
const {
  verConfig, guardarConfig,
  listPremios, crearPremio, actualizarPremio, eliminarPremio,
  listClientes, crearCliente, actualizarCliente,
  configSchema, clienteSchema, clienteUpdateSchema, premioSchema, premioUpdateSchema,
} = require("./fidelidad.controller");
const { validateBody } = require("../../middleware/validate");
const { authenticate, requireRole } = require("../../middleware/auth");

const router = Router();
router.use(authenticate);

// Config: ver cualquiera autenticado; editar solo admin.
router.get("/config", verConfig);
router.put("/config", requireRole("admin"), validateBody(configSchema), guardarConfig);

// Premios (niveles): ver cualquiera autenticado (el POS muestra el progreso); editar solo admin.
router.get("/premios", listPremios);
router.post("/premios", requireRole("admin"), validateBody(premioSchema), crearPremio);
router.patch("/premios/:id", requireRole("admin"), validateBody(premioUpdateSchema), actualizarPremio);
router.delete("/premios/:id", requireRole("admin"), eliminarPremio);

// Clientes: cajero y admin.
router.get("/clientes", listClientes);
router.post("/clientes", requireRole("admin", "cajero"), validateBody(clienteSchema), crearCliente);
router.patch("/clientes/:id", requireRole("admin", "cajero"), validateBody(clienteUpdateSchema), actualizarCliente);

module.exports = router;
