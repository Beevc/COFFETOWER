import api from "./client";

export const estadisticasApi = {
  // params: { periodo } o { desde, hasta }
  resumen: (params) => api.get("/estadisticas", { params }).then((r) => r.data),
  serie: (desde, hasta) => api.get("/estadisticas/serie", { params: { desde, hasta } }).then((r) => r.data.dias),
  periodos: (tipo, n = 6) => api.get("/estadisticas/periodos", { params: { tipo, n } }).then((r) => r.data.periodos),
};
