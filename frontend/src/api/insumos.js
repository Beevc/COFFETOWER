import api from "./client";

export const insumosApi = {
  list: (params = {}) =>
    api.get("/insumos", { params }).then((r) => r.data.insumos),
  create: (data) => api.post("/insumos", data).then((r) => r.data.insumo),
  update: (id, data) => api.patch(`/insumos/${id}`, data).then((r) => r.data.insumo),
  movimiento: (id, data) =>
    api.post(`/insumos/${id}/movimientos`, data).then((r) => r.data.insumo),
  historial: (id) =>
    api.get(`/insumos/${id}/movimientos`).then((r) => r.data.movimientos),
};
