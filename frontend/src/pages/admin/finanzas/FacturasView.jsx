import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, CalendarClock } from "lucide-react";
import { finanzasApi } from "../../../api/finanzas";
import { money } from "../../../utils/format";
import { CATEGORIAS, catLabel, ESTADO_FACTURA } from "./constants";
import FacturaFormModal from "./FacturaFormModal";
import FacturaDetalleModal from "./FacturaDetalleModal";

const FILTROS_ESTADO = [
  { id: "", label: "Todas" },
  { id: "pendiente", label: "Pendientes" },
  { id: "parcial", label: "Parciales" },
  { id: "pagada", label: "Pagadas" },
];

export default function FacturasView({ proveedores, onData }) {
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [estado, setEstado] = useState("");
  const [categoria, setCategoria] = useState("");
  const [creando, setCreando] = useState(false);
  const [detalleId, setDetalleId] = useState(null);

  const cargar = useCallback(async () => {
    setError("");
    try {
      const params = {};
      if (estado) params.estado = estado;
      if (categoria) params.categoria = categoria;
      setFacturas(await finanzasApi.facturas(params));
    } catch {
      setError("No se pudieron cargar las facturas");
    } finally {
      setCargando(false);
    }
  }, [estado, categoria]);

  useEffect(() => { cargar(); }, [cargar]);

  const refrescar = () => { cargar(); onData?.(); };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 rounded-lg bg-frappe-accentSoft p-1">
          {FILTROS_ESTADO.map((f) => (
            <button key={f.id} onClick={() => setEstado(f.id)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${estado === f.id ? "bg-frappe-surface text-frappe-accentDark shadow-sm" : "text-frappe-textSoft hover:text-frappe-text"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={() => setCreando(true)} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-frappe-accent px-3 py-2 text-sm font-semibold text-white hover:bg-frappe-accentDark">
          <Plus size={16} /> Nueva factura
        </button>
      </div>

      <select className="mb-3 w-full rounded-lg border border-frappe-border bg-frappe-surface px-3 py-2 text-sm outline-none focus:border-frappe-accent sm:w-56" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
        <option value="">Todas las categorías</option>
        {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>

      {error && <div className="mb-3 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">{error}</div>}

      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-12 text-frappe-textSoft"><Loader2 size={18} className="animate-spin" /> Cargando…</div>
      ) : facturas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-frappe-border bg-frappe-surface py-12 text-center text-sm text-frappe-textSoft">
          No hay facturas. Crea la primera con “Nueva factura”.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-frappe-border bg-frappe-surface">
          {facturas.map((f, i) => (
            <button key={f.id} onClick={() => setDetalleId(f.id)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-frappe-bg ${i > 0 ? "border-t border-frappe-border" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-frappe-text">
                    {f.proveedorNombre || f.descripcion || catLabel(f.categoria)}
                  </span>
                  {f.vencida && <span className="flex shrink-0 items-center gap-1 rounded-full bg-frappe-dangerSoft px-1.5 py-0.5 text-[10px] font-bold text-frappe-danger"><CalendarClock size={9} /> vencida</span>}
                </div>
                <div className="truncate text-xs text-frappe-textSoft">
                  {catLabel(f.categoria)}{f.numero ? ` · N° ${f.numero}` : ""}
                  {f.fechaVencimiento ? ` · vence ${String(f.fechaVencimiento).slice(0, 10)}` : ""}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-frappe-text">{money(f.montoTotal)}</div>
                {f.saldo > 0 ? (
                  <div className="text-xs font-semibold text-frappe-danger">debe {money(f.saldo)}</div>
                ) : (
                  <div className="text-xs text-frappe-success">pagada</div>
                )}
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${ESTADO_FACTURA[f.estado]?.cls}`}>{ESTADO_FACTURA[f.estado]?.label}</span>
            </button>
          ))}
        </div>
      )}

      {creando && (
        <FacturaFormModal
          proveedores={proveedores}
          onClose={() => setCreando(false)}
          onSaved={() => { setCreando(false); refrescar(); }}
        />
      )}
      {detalleId && (
        <FacturaDetalleModal facturaId={detalleId} onClose={() => setDetalleId(null)} onChanged={refrescar} />
      )}
    </div>
  );
}
