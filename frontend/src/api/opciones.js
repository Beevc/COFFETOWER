import api from "./client";

export const opcionesApi = {
  list: () => api.get("/opciones").then((r) => r.data.opciones),
  create: (data) => api.post("/opciones", data).then((r) => r.data.opcion),
  update: (id, data) => api.patch(`/opciones/${id}`, data).then((r) => r.data.opcion),
  remove: (id) => api.delete(`/opciones/${id}`).then((r) => r.data),
};
