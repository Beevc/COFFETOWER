const { Router } = require("express");
const proveedores = require("./proveedores.controller");
const facturas = require("./facturas.controller");
const { resumen } = require("./resumen.controller");
const { costos, costoDetalle } = require("./costos.controller");
const { validateBody } = require("../../middleware/validate");
const { authenticate, requireRole } = require("../../middleware/auth");

const router = Router();

// Finanzas: solo administrador.
router.use(authenticate, requireRole("admin"));

// Resumen (dashboard).
router.get("/resumen", resumen);
// Costos y márgenes por producto.
router.get("/costos", costos);
router.get("/costos/:productoId", costoDetalle);

// Proveedores.
router.get("/proveedores", proveedores.list);
router.post("/proveedores", validateBody(proveedores.createSchema), proveedores.create);
router.patch("/proveedores/:id", validateBody(proveedores.updateSchema), proveedores.update);

// Facturas (cuentas por pagar).
router.get("/facturas", facturas.list);
router.get("/facturas/:id", facturas.getOne);
router.post("/facturas", validateBody(facturas.createSchema), facturas.create);
router.patch("/facturas/:id", validateBody(facturas.updateSchema), facturas.update);
router.delete("/facturas/:id", facturas.remove);

// Pagos (abonos).
router.post("/facturas/:id/pagos", validateBody(facturas.pagoSchema), facturas.addPago);
router.delete("/pagos/:id", facturas.removePago);

// Cuotas (plan de pagos programados).
router.post("/facturas/:id/cuotas", validateBody(facturas.generarCuotasSchema), facturas.generarCuotas);
router.post("/facturas/:id/cuotas/:cuotaId/pagar", validateBody(facturas.pagarCuotaSchema), facturas.pagarCuota);

module.exports = router;
