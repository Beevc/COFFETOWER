import { useEffect, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { finanzasApi } from "../../../api/finanzas";
import { money } from "../../../utils/format";

export default function CostosView() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    finanzasApi.costos()
      .then(setProductos)
      .catch(() => setError("No se pudieron cargar los costos"))
      .finally(() => setCargando(false));
  }, []);

  const margenColor = (m) => (m >= 60 ? "text-frappe-success" : m >= 30 ? "text-frappe-accentDark" : "text-frappe-danger");

  if (cargando) {
    return <div className="flex items-center justify-center gap-2 py-12 text-frappe-textSoft"><Loader2 size={18} className="animate-spin" /> Cargando…</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-frappe-textSoft">
        Cuánto cuesta hacer cada frappé (según su receta) y cuánto ganas. Para que el costo sea exacto,
        carga el <b>costo por unidad</b> de cada insumo en la pestaña <b>Insumos</b>.
      </p>

      {error && <div className="rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">{error}</div>}

      {productos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-frappe-border bg-frappe-surface py-12 text-center text-sm text-frappe-textSoft">
          No hay productos activos.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-frappe-border bg-frappe-surface">
          {productos.map((p, i) => (
            <div key={p.id} className={`px-4 py-3 ${i > 0 ? "border-t border-frappe-border" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-frappe-text">{p.nombre}</span>
                {p.tieneReceta ? (
                  <span className={`shrink-0 text-sm font-bold ${margenColor(p.margen)}`}>{p.margen}% margen</span>
                ) : (
                  <span className="shrink-0 rounded-full bg-frappe-dangerSoft px-2 py-0.5 text-xs font-semibold text-frappe-danger">sin receta</span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                <span className="text-frappe-textSoft">Precio: <b className="text-frappe-text">{money(p.precio)}</b></span>
                <span className="text-frappe-textSoft">Costo: <b className="text-frappe-text">{money(p.costo)}</b></span>
                <span className="text-frappe-textSoft">Ganancia: <b className={p.ganancia >= 0 ? "text-frappe-success" : "text-frappe-danger"}>{money(p.ganancia)}</b></span>
              </div>
              {p.costoIncompleto && (
                <div className="mt-1 flex items-center gap-1 text-xs text-frappe-danger">
                  <AlertTriangle size={11} /> Falta cargar el costo de algún insumo de esta receta.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
