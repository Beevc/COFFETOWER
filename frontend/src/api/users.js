import api from "./client";

export const usersApi = {
  list: () => api.get("/users").then((r) => r.data.usuarios),
  create: (data) => api.post("/users", data).then((r) => r.data.usuario),
  update: (id, data) => api.patch(`/users/${id}`, data).then((r) => r.data.usuario),
};
