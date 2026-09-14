import { Loader2, Lock, Unlock, RefreshCw } from "lucide-react";
import { useCaja } from "./CajaContext";
import { money } from "../../utils/format";

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-frappe-border bg-frappe-surface px-3 py-2.5">
      <div className="text-xs text-frappe-textSoft">{label}</div>
      <div className="text-lg font-bold text-frappe-text">{value}</div>
    </div>
  );
}

// Vista de caja para el cajero: SOLO lectura. La abre y cierra el administrador.
export default function CajaPage() {
  const { turno, abierta, cargando, refrescar } = useCaja();

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-frappe-textSoft">
        <Loader2 size={18} className="animate-spin" /> Cargando…
      </div>
    );
  }

  if (!abierta) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-frappe-border bg-frappe-surface px-6 py-12 text-center">
        <Lock size={22} className="text-frappe-danger" />
        <div className="font-semibold text-frappe-text">La caja está cerrada</div>
        <p className="text-sm text-frappe-textSoft">
          Pídele al <b>administrador</b> que abra la caja para poder vender.
        </p>
        <button onClick={() => refrescar()} className="mt-2 flex items-center gap-1.5 rounded-lg border border-frappe-border px-3 py-2 text-sm font-medium text-frappe-text transition hover:bg-frappe-bg">
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>
    );
  }

  const t = turno.totales || { total: 0, efectivo: 0, n_ventas: 0 };
  const tarjeta = t.total - t.efectivo;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 rounded-lg bg-frappe-successSoft px-3 py-2 text-sm font-semibold text-frappe-success">
        <span className="flex items-center gap-1.5"><Unlock size={15} /> Caja abierta{turno.cajeroNombre ? ` · ${turno.cajeroNombre}` : ""}</span>
        <button onClick={() => refrescar()} title="Actualizar" className="text-frappe-success/80 hover:text-frappe-success">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Metric label="Ventas del turno" value={money(t.total)} />
        <Metric label="N° de ventas" value={t.n_ventas} />
        <Metric label="Efectivo" value={money(t.efectivo)} />
        <Metric label="Tarjeta/transf." value={money(tarjeta)} />
      </div>
      <div className="rounded-xl border border-frappe-border bg-frappe-surface px-4 py-3">
        <div className="text-xs text-frappe-textSoft">Monto inicial</div>
        <div className="text-lg font-bold text-frappe-text">{money(turno.montoInicial)}</div>
      </div>

      <p className="rounded-lg border border-dashed border-frappe-border bg-frappe-bg px-3 py-2 text-xs text-frappe-textSoft">
        El cierre de caja lo hace el administrador.
      </p>
    </div>
  );
}
