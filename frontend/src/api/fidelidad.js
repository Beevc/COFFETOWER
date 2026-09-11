import api from "./client";

export const fidelidadApi = {
  getConfig: () => api.get("/fidelidad/config").then((r) => r.data.config),
  setConfig: (data) => api.put("/fidelidad/config", data).then((r) => r.data.config),
  // Premios por nivel
  listPremios: () => api.get("/fidelidad/premios").then((r) => r.data.premios),
  crearPremio: (data) => api.post("/fidelidad/premios", data).then((r) => r.data.premio),
  actualizarPremio: (id, data) => api.patch(`/fidelidad/premios/${id}`, data).then((r) => r.data.premio),
  eliminarPremio: (id) => api.delete(`/fidelidad/premios/${id}`).then((r) => r.data),
  listClientes: (q) =>
    api.get("/fidelidad/clientes", { params: q ? { q } : {} }).then((r) => r.data.clientes),
  crearCliente: (data) =>
    api.post("/fidelidad/clientes", data).then((r) => r.data.cliente),
  actualizarCliente: (id, data) =>
    api.patch(`/fidelidad/clientes/${id}`, data).then((r) => r.data.cliente),
};
