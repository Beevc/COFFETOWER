import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { cajaApi } from "../../api/caja";

const CajaContext = createContext(null);

export function CajaProvider({ children }) {
  const [turno, setTurno] = useState(null);
  const [cargando, setCargando] = useState(true);

  const refrescar = useCallback(async () => {
    const t = await cajaApi.estado();
    setTurno(t);
    return t;
  }, []);

  useEffect(() => {
    refrescar().finally(() => setCargando(false));
  }, [refrescar]);

  const abrir = useCallback(async (monto) => {
    await cajaApi.abrir(monto);
    return refrescar();
  }, [refrescar]);

  const cerrar = useCallback(async (contado) => {
    const cerrado = await cajaApi.cerrar(contado);
    await refrescar();
    return cerrado; // incluye diferencia y totales para el resumen
  }, [refrescar]);

  const abierta = !!turno && turno.estado === "abierta";

  return (
    <CajaContext.Provider value={{ turno, abierta, cargando, refrescar, abrir, cerrar }}>
      {children}
    </CajaContext.Provider>
  );
}

export function useCaja() {
  const ctx = useContext(CajaContext);
  if (!ctx) throw new Error("useCaja debe usarse dentro de <CajaProvider>");
  return ctx;
}
