import api from "./client";

export const recetasApi = {
  get: (productoId) => api.get(`/recetas/${productoId}`).then((r) => r.data),
  set: (productoId, items) =>
    api.put(`/recetas/${productoId}`, { items }).then((r) => r.data),
};
