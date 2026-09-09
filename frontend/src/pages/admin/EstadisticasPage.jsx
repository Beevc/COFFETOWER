import { useEffect, useState } from "react";
import { Loader2, TrendingUp, TrendingDown, Gift } from "lucide-react";
import { estadisticasApi } from "../../api/estadisticas";
import { money } from "../../utils/format";

const PERIODOS = [
  { id: "dia", label: "Hoy" },
  { id: "semana", label: "Esta semana" },
  { id: "mes", label: "Este mes" },
];
const MEDIO_LABEL = { efectivo: "Efectivo", debito: "Débito", credito: "Crédito", transferencia: "Transferencia" };

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-frappe-border bg-frappe-surface px-3 py-2.5">
      <div className="text-xs text-frappe-textSoft">{label}</div>
      <div className="text-lg font-bold text-frappe-text">{value}</div>
    </div>
  );
}

export default function EstadisticasPage() {
  const [periodo, setPeriodo] = useState("dia");
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    estadisticasApi.resumen(periodo).then(setData).finally(() => setCargando(false));
  }, [periodo]);

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-serif text-xl font-semibold text-frappe-text">Estadísticas</h1>
        <p className="text-sm text-frappe-textSoft">Ventas, ranking de productos y formas de pago.</p>
      </div>

      <div className="mb-4 flex gap-1 rounded-lg bg-frappe-accentSoft p-1 w-fit">
        {PERIODOS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriodo(p.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              periodo === p.id ? "bg-frappe-surface text-frappe-accentDark shadow-sm" : "text-frappe-textSoft hover:text-frappe-text"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {cargando || !data ? (
        <div className="flex items-center justify-center gap-2 py-16 text-frappe-textSoft">
          <Loader2 size={18} className="animate-spin" /> Cargando…
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Ventas" value={money(data.totalVentas)} />
            <Metric label="N° ventas" value={data.nVentas} />
            <Metric label="Ticket prom." value={money(data.ticketPromedio)} />
          </div>

          <div className="rounded-xl border border-frappe-border bg-frappe-surface p-4">
            <div className="mb-2 text-sm font-semibold text-frappe-text">Por forma de pago</div>
            {data.porMedioPago.length === 0 ? (
              <div className="text-sm text-frappe-textSoft">Sin ventas en este período.</div>
            ) : (
              data.porMedioPago.map((m) => (
                <div key={m.medio} className="flex justify-between py-1 text-sm">
                  <span className="text-frappe-textSoft">{MEDIO_LABEL[m.medio] || m.medio} ({m.n})</span>
                  <span className="font-semibold text-frappe-text">{money(m.total)}</span>
                </div>
              ))
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-frappe-border bg-frappe-surface p-4">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-frappe-success">
                <TrendingUp size={15} /> Más vendidos
              </div>
              {data.top.length === 0 ? (
                <div className="text-sm text-frappe-textSoft">—</div>
              ) : data.top.map((p) => (
                <div key={p.productoId} className="flex justify-between py-1 text-sm">
                  <span className="text-frappe-text">{p.nombre}</span>
                  <span className="font-semibold text-frappe-textSoft">{p.cantidad} u.</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-frappe-border bg-frappe-surface p-4">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-frappe-danger">
                <TrendingDown size={15} /> Menos vendidos
              </div>
              {data.bottom.length === 0 ? (
                <div className="text-sm text-frappe-textSoft">—</div>
              ) : data.bottom.map((p) => (
                <div key={p.productoId} className="flex justify-between py-1 text-sm">
                  <span className="text-frappe-text">{p.nombre}</span>
                  <span className="font-semibold text-frappe-textSoft">{p.cantidad} u.</span>
                </div>
              ))}
            </div>
          </div>

          {data.convenio.ventas > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-frappe-border bg-frappe-accentSoft px-4 py-3 text-sm text-frappe-accentDark">
              <Gift size={16} />
              Convenio gimnasio: {data.convenio.unidades} frappé(s) regalados en {data.convenio.ventas} registro(s).
            </div>
          )}
        </div>
      )}
    </div>
  );
}
