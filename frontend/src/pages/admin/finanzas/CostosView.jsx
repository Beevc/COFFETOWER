import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, ChevronDown } from "lucide-react";
import { finanzasApi } from "../../../api/finanzas";
import { money } from "../../../utils/format";

// Muestra costos con hasta 2 decimales (ej. 0,9 $/ml).
const costoUnitFmt = (n) => Number(n).toLocaleString("es-CL", { maximumFractionDigits: 2 });
const cantFmt = (n) => Number(n).toLocaleString("es-CL", { maximumFractionDigits: 3 });

export default function CostosView() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState(null); // productoId expandido
  const [detalles, setDetalles] = useState({}); // productoId -> detalle | 'cargando'

  useEffect(() => {
    finanzasApi.costos()
      .then(setProductos)
      .catch(() => setError("No se pudieron cargar los costos"))
      .finally(() => setCargando(false));
  }, []);

  const margenColor = (m) => (m >= 60 ? "text-frappe-success" : m >= 30 ? "text-frappe-accentDark" : "text-frappe-danger");

  const toggle = async (id) => {
    if (abierto === id) { setAbierto(null); return; }
    setAbierto(id);
    if (!detalles[id]) {
      setDetalles((d) => ({ ...d, [id]: "cargando" }));
      try {
        const det = await finanzasApi.costoDetalle(id);
        setDetalles((d) => ({ ...d, [id]: det }));
      } catch {
        setDetalles((d) => ({ ...d, [id]: { error: true } }));
      }
    }
  };

  if (cargando) {
    return <div className="flex items-center justify-center gap-2 py-12 text-frappe-textSoft"><Loader2 size={18} className="animate-spin" /> Cargando…</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-frappe-textSoft">
        Cuánto cuesta hacer cada frappé (según su receta) y cuánto ganas. <b>Toca un producto</b> para ver el desglose.
        El costo por unidad de cada insumo se carga en la pestaña <b>Insumos</b>.
      </p>

      {error && <div className="rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">{error}</div>}

      {productos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-frappe-border bg-frappe-surface py-12 text-center text-sm text-frappe-textSoft">
          No hay productos activos.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-frappe-border bg-frappe-surface">
          {productos.map((p, i) => {
            const det = detalles[p.id];
            const open = abierto === p.id;
            return (
              <div key={p.id} className={i > 0 ? "border-t border-frappe-border" : ""}>
                <button onClick={() => toggle(p.id)} className="flex w-full items-center gap-2 px-4 py-3 text-left transition hover:bg-frappe-bg">
                  <ChevronDown size={15} className={`shrink-0 text-frappe-textSoft transition ${open ? "rotate-180" : ""}`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-frappe-text">{p.nombre}</div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                      <span className="text-frappe-textSoft">Precio: <b className="text-frappe-text">{money(p.precio)}</b></span>
                      <span className="text-frappe-textSoft">Costo: <b className="text-frappe-text">{money(p.costo)}</b></span>
                      <span className="text-frappe-textSoft">Ganancia: <b className={p.ganancia >= 0 ? "text-frappe-success" : "text-frappe-danger"}>{money(p.ganancia)}</b></span>
                    </div>
                  </div>
                  {p.tieneReceta ? (
                    <span className={`shrink-0 text-sm font-bold ${margenColor(p.margen)}`}>{p.margen}%</span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-frappe-dangerSoft px-2 py-0.5 text-xs font-semibold text-frappe-danger">sin receta</span>
                  )}
                </button>

                {open && (
                  <div className="border-t border-frappe-border bg-frappe-bg/40 px-4 py-3">
                    {det === "cargando" || !det ? (
                      <div className="flex items-center gap-2 py-2 text-sm text-frappe-textSoft"><Loader2 size={15} className="animate-spin" /> Cargando desglose…</div>
                    ) : det.error ? (
                      <div className="text-sm text-frappe-danger">No se pudo cargar el desglose.</div>
                    ) : det.items.length === 0 ? (
                      <div className="text-sm text-frappe-textSoft">Este producto no tiene receta definida.</div>
                    ) : (
                      <>
                        <div className="mb-1 text-xs font-semibold text-frappe-textSoft">Desglose de la receta</div>
                        <div className="overflow-hidden rounded-lg border border-frappe-border bg-frappe-surface">
                          {det.items.map((it) => (
                            <div key={it.insumoId} className="border-b border-frappe-border px-3 py-2 last:border-b-0">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-frappe-text">{it.nombre}</span>
                                <span className="text-sm font-semibold text-frappe-text">{money(it.subtotal)}</span>
                              </div>
                              <div className="mt-0.5 text-xs text-frappe-textSoft">
                                {cantFmt(it.cantidad)} {it.unidadReceta || it.unidad}
                                {it.unidadReceta ? ` = ${cantFmt(it.baseCantidad)} ${it.unidad}` : ""}
                                {" × "}{costoUnitFmt(it.costoUnitario)} $/{it.unidad}
                              </div>
                              {it.sinCosto && (
                                <div className="mt-0.5 flex items-center gap-1 text-xs text-frappe-danger">
                                  <AlertTriangle size={11} /> Sin costo cargado (cuenta como $0)
                                </div>
                              )}
                            </div>
                          ))}
                          <div className="flex items-center justify-between bg-frappe-bg px-3 py-2 text-sm font-bold">
                            <span className="text-frappe-text">Costo total</span>
                            <span className="text-frappe-text">{money(det.costo)}</span>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 text-xs text-frappe-textSoft">
                          <span>Precio: <b className="text-frappe-text">{money(det.producto.precio)}</b></span>
                          <span>Ganancia: <b className={det.ganancia >= 0 ? "text-frappe-success" : "text-frappe-danger"}>{money(det.ganancia)}</b></span>
                          <span>Margen: <b className={margenColor(det.margen)}>{det.margen}%</b></span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
