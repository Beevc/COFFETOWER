import api from "./client";

export const cajaApi = {
  estado: () => api.get("/caja/estado").then((r) => r.data.turno),
  abrir: (montoInicial, cajeroId) =>
    api.post("/caja/abrir", { montoInicial, cajeroId }).then((r) => r.data.turno),
  cerrar: (efectivoContado) =>
    api.post("/caja/cerrar", { efectivoContado }).then((r) => r.data.turno),
};
