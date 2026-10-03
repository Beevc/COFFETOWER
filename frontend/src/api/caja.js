import api from "./client";

export const cajaApi = {
  estado: () => api.get("/caja/estado").then((r) => r.data.turno),
  abrir: (montoInicial, cajeroId) =>
    api.post("/caja/abrir", { montoInicial, cajeroId }).then((r) => r.data.turno),
  // contados: { efectivoContado, debitoContado, creditoContado, transferenciaContado }
  cerrar: (contados) =>
    api.post("/caja/cerrar", contados).then((r) => r.data.turno),
  arqueo: (efectivoContado, nota) =>
    api.post("/caja/arqueo", { efectivoContado, nota }).then((r) => r.data.arqueo),
};
