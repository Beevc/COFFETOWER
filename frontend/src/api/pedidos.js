import api from "./client";

export const pedidosApi = {
  pendientes: () => api.get("/pedidos/pendientes").then((r) => r.data.pedidos),
  preparadosHoy: () => api.get("/pedidos/preparados-hoy").then((r) => r.data.pedidos),
  preparar: (id) => api.post(`/pedidos/${id}/preparar`).then((r) => r.data),
};
