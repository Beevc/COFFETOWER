import api from "./client";

export const cajaApi = {
  estado: () => api.get("/caja/estado").then((r) => r.data.turno),
  abrir: (montoInicial) =>
    api.post("/caja/abrir", { montoInicial }).then((r) => r.data.turno),
  cerrar: (efectivoContado) =>
    api.post("/caja/cerrar", { efectivoContado }).then((r) => r.data.turno),
};
