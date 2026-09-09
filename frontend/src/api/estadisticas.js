import api from "./client";

export const estadisticasApi = {
  resumen: (periodo) =>
    api.get("/estadisticas", { params: { periodo } }).then((r) => r.data),
};
