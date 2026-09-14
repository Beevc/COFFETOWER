import api from "./client";

export const inventarioApi = {
  listConteos: () => api.get("/inventario/conteos").then((r) => r.data.conteos),
  conteo: (id) => api.get(`/inventario/conteos/${id}`).then((r) => r.data.conteo),
  crearConteo: (items, nota) =>
    api.post("/inventario/conteos", { items, nota }).then((r) => r.data),
};
