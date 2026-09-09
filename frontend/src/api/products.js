import api from "./client";

export const productsApi = {
  list: (params = {}) =>
    api.get("/products", { params }).then((r) => r.data.productos),
  create: (data) => api.post("/products", data).then((r) => r.data.producto),
  update: (id, data) =>
    api.patch(`/products/${id}`, data).then((r) => r.data.producto),
};
