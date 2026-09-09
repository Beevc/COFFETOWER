import api from "./client";

export const fidelidadApi = {
  getConfig: () => api.get("/fidelidad/config").then((r) => r.data.config),
  setConfig: (data) => api.put("/fidelidad/config", data).then((r) => r.data.config),
  listClientes: (q) =>
    api.get("/fidelidad/clientes", { params: q ? { q } : {} }).then((r) => r.data.clientes),
  crearCliente: (data) =>
    api.post("/fidelidad/clientes", data).then((r) => r.data.cliente),
  actualizarCliente: (id, data) =>
    api.patch(`/fidelidad/clientes/${id}`, data).then((r) => r.data.cliente),
};
