import { useEffect, useState, useCallback } from "react";
import { Loader2, TrendingUp, TrendingDown, Wallet, AlertTriangle } from "lucide-react";
import { finanzasApi } from "../../api/finanzas";
import { money } from "../../utils/format";
import { catLabel } from "./finanzas/constants";
import FacturasView from "./finanzas/FacturasView";
import ProveedoresView from "./finanzas/ProveedoresView";

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "facturas", label: "Facturas" },
  { id: "proveedores", label: "Proveedores" },
];

const mesActual = () => new Date().toISOString().slice(0, 7); // YYYY-MM
const rangoDeMes = (mes) => {
  const [y, m] = mes.split("-").map(Number);
  const desde = `${mes}-01`;
  const hasta = new Date(y, m, 0).toISOString().slice(0, 10); // último día del mes
  return { desde, hasta };
};

function Metric({ label, value, icon: Icon, tone = "text-frappe-text", sub }) {
  return (
    <div className="rounded-xl border border-frappe-border bg-frappe-surface px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs text-frappe-textSoft">
        {Icon && <Icon size={13} />} {label}
      </div>
      <div className={`text-xl font-bold ${tone}`}>{value}</div>
      {sub && <div className="text-xs text-frappe-textSoft">{sub}</div>}
    </div>
  );
}

function Resumen() {
  const [mes, setMes] = useState(mesActual());
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    const { desde, hasta } = rangoDeMes(mes);
    finanzasApi.resumen({ desde, hasta }).then(setData).finally(() => setCargando(false));
  }, [mes]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-frappe-textSoft">Mes</span>
        <input type="month" value={mes} onChange={(e) => setMes(e.target.value)}
          className="rounded-lg border border-frappe-border bg-frappe-surface px-3 py-1.5 text-sm outline-none focus:border-frappe-accent" />
      </div>

      {cargando || !data ? (
        <div className="flex items-center justify-center gap-2 py-12 text-frappe-textSoft"><Loader2 size={18} className="animate-spin" /> Cargando…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Ingresos (ventas)" value={money(data.ingresos)} icon={TrendingUp} tone="text-frappe-success" sub={`${data.ventasCount} ventas`} />
            <Metric label="Gastos" value={money(data.gastos)} icon={TrendingDown} tone="text-frappe-danger" sub={`${data.gastosCount} facturas`} />
          </div>
          <Metric
            label="Ganancia del mes"
            value={money(data.ganancia)}
            icon={Wallet}
            tone={data.ganancia >= 0 ? "text-frappe-success" : "text-frappe-danger"}
          />

          {/* Cuentas por pagar */}
          <div className="rounded-xl border border-frappe-border bg-frappe-surface px-4 py-3">
            <div className="mb-2 text-sm font-semibold text-frappe-text">Cuentas por pagar</div>
            <div className="flex justify-between py-0.5 text-sm">
              <span className="text-frappe-textSoft">Total adeudado</span>
              <span className="font-bold text-frappe-text">{money(data.cuentasPorPagar.totalAdeudado)}</span>
            </div>
            <div className="flex justify-between py-0.5 text-sm">
              <span className="text-frappe-textSoft">Facturas pendientes</span>
              <span className="text-frappe-text">{data.cuentasPorPagar.pendientes}</span>
            </div>
            {data.cuentasPorPagar.vencidas > 0 && (
              <div className="mt-2 flex items-center justify-between rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-semibold text-frappe-danger">
                <span className="flex items-center gap-1.5"><AlertTriangle size={14} /> Vencidas ({data.cuentasPorPagar.vencidas})</span>
                <span>{money(data.cuentasPorPagar.totalVencido)}</span>
              </div>
            )}
          </div>

          {/* Gastos por categoría */}
          <div className="rounded-xl border border-frappe-border bg-frappe-surface px-4 py-3">
            <div className="mb-2 text-sm font-semibold text-frappe-text">Gastos por categoría</div>
            {data.porCategoria.length === 0 ? (
              <div className="py-2 text-sm text-frappe-textSoft">Sin gastos este mes.</div>
            ) : (
              data.porCategoria.map((c) => (
                <div key={c.categoria} className="flex justify-between py-1 text-sm">
                  <span className="text-frappe-textSoft">{catLabel(c.categoria)}</span>
                  <span className="font-semibold text-frappe-text">{money(c.total)}</span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function FinanzasPage() {
  const [tab, setTab] = useState("resumen");
  const [proveedores, setProveedores] = useState([]);

  const cargarProveedores = useCallback(async () => {
    try { setProveedores(await finanzasApi.proveedores()); } catch { /* noop */ }
  }, []);

  useEffect(() => { cargarProveedores(); }, [cargarProveedores]);

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-serif text-xl font-semibold text-frappe-text">Finanzas</h1>
        <p className="text-sm text-frappe-textSoft">Ingresos, gastos y cuentas por pagar del local.</p>
      </div>

      <div className="mb-4 flex gap-1 rounded-lg bg-frappe-accentSoft p-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-semibold transition ${tab === t.id ? "bg-frappe-surface text-frappe-accentDark shadow-sm" : "text-frappe-textSoft hover:text-frappe-text"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "resumen" && <Resumen />}
      {tab === "facturas" && <FacturasView proveedores={proveedores} onData={cargarProveedores} />}
      {tab === "proveedores" && <ProveedoresView proveedores={proveedores} onChanged={cargarProveedores} />}
    </div>
  );
}
