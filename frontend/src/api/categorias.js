import api from "./client";

export const categoriasApi = {
  list: () => api.get("/categorias").then((r) => r.data.categorias),
  create: (data) => api.post("/categorias", data).then((r) => r.data.categoria),
  update: (id, data) => api.patch(`/categorias/${id}`, data).then((r) => r.data.categoria),
  remove: (id) => api.delete(`/categorias/${id}`).then((r) => r.data),
};
