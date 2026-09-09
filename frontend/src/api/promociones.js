import api from "./client";

export const promocionesApi = {
  list: () => api.get("/promociones").then((r) => r.data.promociones),
  create: (data) => api.post("/promociones", data).then((r) => r.data.promocion),
  update: (id, data) => api.patch(`/promociones/${id}`, data).then((r) => r.data.promocion),
};
