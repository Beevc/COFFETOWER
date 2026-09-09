import api from "./client";

export const ventasApi = {
  registrar: (medioPago, items) =>
    api.post("/ventas", { medioPago, items }).then((r) => r.data.venta),
  listar: (turnoId) =>
    api
      .get("/ventas", { params: turnoId ? { turnoId } : {} })
      .then((r) => r.data.ventas),
  detalle: (id) => api.get(`/ventas/${id}`).then((r) => r.data.venta),
  anular: (id, motivo) =>
    api.post(`/ventas/${id}/anular`, { motivo }).then((r) => r.data.venta),
};
