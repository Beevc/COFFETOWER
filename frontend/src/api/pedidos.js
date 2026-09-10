import api from "./client";

export const pedidosApi = {
  // Pedidos no entregados (en espera / en preparación / listos).
  activos: () => api.get("/pedidos/activos").then((r) => r.data.pedidos),
  entregadosHoy: () => api.get("/pedidos/entregados-hoy").then((r) => r.data.pedidos),
  // estado: "en_preparacion" | "listo" | "entregado"
  cambiarEstado: (id, estado) =>
    api.post(`/pedidos/${id}/estado`, { estado }).then((r) => r.data.pedido),
};
