import api from "./client";

export const finanzasApi = {
  resumen: (params = {}) => api.get("/finanzas/resumen", { params }).then((r) => r.data),
  costos: () => api.get("/finanzas/costos").then((r) => r.data.productos),

  proveedores: (activo) =>
    api.get("/finanzas/proveedores", { params: activo != null ? { activo } : {} }).then((r) => r.data.proveedores),
  crearProveedor: (data) => api.post("/finanzas/proveedores", data).then((r) => r.data.proveedor),
  actualizarProveedor: (id, data) => api.patch(`/finanzas/proveedores/${id}`, data).then((r) => r.data.proveedor),

  facturas: (params = {}) => api.get("/finanzas/facturas", { params }).then((r) => r.data.facturas),
  factura: (id) => api.get(`/finanzas/facturas/${id}`).then((r) => r.data.factura),
  crearFactura: (data) => api.post("/finanzas/facturas", data).then((r) => r.data.factura),
  actualizarFactura: (id, data) => api.patch(`/finanzas/facturas/${id}`, data).then((r) => r.data.factura),
  eliminarFactura: (id) => api.delete(`/finanzas/facturas/${id}`).then((r) => r.data),

  agregarPago: (id, data) => api.post(`/finanzas/facturas/${id}/pagos`, data).then((r) => r.data.factura),
  eliminarPago: (id) => api.delete(`/finanzas/pagos/${id}`).then((r) => r.data),
};
