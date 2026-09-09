import api from "./client";

export const ventasApi = {
  // Devuelve { venta, alertas, descuento, beneficio }
  registrar: (medioPago, items, clienteId) =>
    api.post("/ventas", { medioPago, items, clienteId }).then((r) => r.data),
  listar: (turnoId) =>
    api
      .get("/ventas", { params: turnoId ? { turnoId } : {} })
      .then((r) => r.data.ventas),
  detalle: (id) => api.get(`/ventas/${id}`).then((r) => r.data.venta),
  anular: (id, motivo) =>
    api.post(`/ventas/${id}/anular`, { motivo }).then((r) => r.data.venta),
  registrarConvenio: (items, motivo) =>
    api.post("/ventas/convenio", { items, motivo }).then((r) => r.data),
  listarConvenio: () =>
    api.get("/ventas/convenio").then((r) => r.data.convenios),
};
