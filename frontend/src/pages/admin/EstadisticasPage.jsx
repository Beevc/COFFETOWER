import { useEffect, useState } from "react";
import { Loader2, TrendingUp, TrendingDown, Gift, ArrowUp, ArrowDown, Wallet, Receipt, Ticket, ChevronLeft, ChevronRight } from "lucide-react";
import { estadisticasApi } from "../../api/estadisticas";
import { money } from "../../utils/format";
import BarChart from "../../components/BarChart";
import StatCard from "../../components/StatCard";

const PERIODOS = [
  { id: "dia", label: "Día" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
];
const MEDIO_LABEL = { efectivo: "Efectivo", debito: "Débito", credito: "Crédito", transferencia: "Transferencia" };
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// --- Helpers de fecha (hora local) ---
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hoy = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const addMonths = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth() + n, 1); x.setHours(0, 0, 0, 0); return x; };
const lunesDe = (d) => { const x = new Date(d); const off = (x.getDay() + 6) % 7; x.setDate(x.getDate() - off); x.setHours(0, 0, 0, 0); return x; };
const dd = (d) => String(d.getDate()).padStart(2, "0");
const mm = (d) => String(d.getMonth() + 1).padStart(2, "0");

// Bloque reutilizable: medios de pago + ranking + convenio.
function Detalle({ data }) {
  return (
    <>
      <div className="rounded-2xl border border-frappe-border bg-frappe-surface p-4 shadow-sm">
        <div className="mb-2 text-sm font-semibold text-frappe-text">Por forma de pago</div>
        {data.porMedioPago.length === 0 ? (
          <div className="text-sm text-frappe-textSoft">Sin ventas en este período.</div>
        ) : data.porMedioPago.map((m) => (
          <div key={m.medio} className="flex justify-between py-1 text-sm">
            <span className="text-frappe-textSoft">{MEDIO_LABEL[m.medio] || m.medio} ({m.n})</span>
            <span className="font-semibold text-frappe-text">{money(m.total)}</span>
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-frappe-border bg-frappe-surface p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-frappe-success"><TrendingUp size={15} /> Más vendidos</div>
          {data.top.length === 0 ? <div className="text-sm text-frappe-textSoft">—</div> : data.top.map((p) => (
            <div key={p.productoId} className="flex justify-between py-1 text-sm"><span className="text-frappe-text">{p.nombre}</span><span className="font-semibold text-frappe-textSoft">{p.cantidad} u.</span></div>
          ))}
        </div>
        <div className="rounded-2xl border border-frappe-border bg-frappe-surface p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-frappe-danger"><TrendingDown size={15} /> Menos vendidos</div>
          {data.bottom.length === 0 ? <div className="text-sm text-frappe-textSoft">—</div> : data.bottom.map((p) => (
            <div key={p.productoId} className="flex justify-between py-1 text-sm"><span className="text-frappe-text">{p.nombre}</span><span className="font-semibold text-frappe-textSoft">{p.cantidad} u.</span></div>
          ))}
        </div>
      </div>
      {data.convenio.ventas > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-frappe-border bg-frappe-accentSoft px-4 py-3 text-sm text-frappe-accentDark">
          <Gift size={16} /> Convenio: {data.convenio.unidades} frappé(s) regalados en {data.convenio.ventas} registro(s).
        </div>
      )}
    </>
  );
}

// Comparación: variación % del último periodo vs el anterior.
function Comparacion({ comp, unidad }) {
  if (!comp || comp.length < 2) return null;
  const actual = comp[comp.length - 1].total;
  const previo = comp[comp.length - 2].total;
  const delta = previo > 0 ? Math.round(((actual - previo) / previo) * 100) : (actual > 0 ? 100 : 0);
  const up = actual >= previo;
  return (
    <div className="flex items-center justify-between rounded-lg bg-frappe-bg px-3 py-2 text-sm">
      <span className="text-frappe-textSoft">vs {unidad} anterior ({money(previo)})</span>
      <span className={`flex items-center gap-1 font-semibold ${up ? "text-frappe-success" : "text-frappe-danger"}`}>
        {up ? <ArrowUp size={14} /> : <ArrowDown size={14} />}{delta > 0 ? "+" : ""}{delta}%
      </span>
    </div>
  );
}

// Barra de navegación entre periodos.
function NavBar({ label, onPrev, onNext, nextDisabled }) {
  const btn = "flex h-8 w-8 items-center justify-center rounded-lg border border-frappe-border bg-frappe-surface text-frappe-text transition hover:border-frappe-accent disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <button onClick={onPrev} className={btn} aria-label="Anterior"><ChevronLeft size={16} /></button>
      <span className="text-sm font-semibold capitalize text-frappe-text">{label}</span>
      <button onClick={onNext} disabled={nextDisabled} className={btn} aria-label="Siguiente"><ChevronRight size={16} /></button>
    </div>
  );
}

export default function EstadisticasPage() {
  const [periodo, setPeriodo] = useState("dia");
  const [ancla, setAncla] = useState(hoy()); // fecha de referencia (día/semana/mes seleccionado)
  const [data, setData] = useState(null);
  const [serie, setSerie] = useState(null);
  const [comp, setComp] = useState(null);
  const [cargando, setCargando] = useState(true);

  const hoyD = hoy();
  const hoyIso = iso(hoyD);

  // Días de la semana del ancla (para el selector en "Día").
  const semanaLunes = lunesDe(ancla);
  const semanaDom = addDays(semanaLunes, 6);
  const semanaDias = Array.from({ length: 7 }, (_, i) => addDays(semanaLunes, i));

  // Etiquetas de navegación.
  const labelSemana = `Semana del ${dd(semanaLunes)}/${mm(semanaLunes)} al ${dd(semanaDom)}/${mm(semanaDom)}`;
  const labelMes = `${MESES[ancla.getMonth()]} ${ancla.getFullYear()}`;

  // Ancla dentro del periodo actual (para deshabilitar "siguiente").
  const enSemanaActual = semanaLunes.getTime() >= lunesDe(hoyD).getTime();
  const enMesActual = ancla.getFullYear() > hoyD.getFullYear() ||
    (ancla.getFullYear() === hoyD.getFullYear() && ancla.getMonth() >= hoyD.getMonth());

  // Mover el ancla sin pasarse del día de hoy.
  const clamp = (d) => (d > hoyD ? hoyD : d);
  const shiftDias = (n) => setAncla((a) => clamp(addDays(a, n)));
  const shiftMeses = (n) => setAncla((a) => clamp(addMonths(a, n)));

  useEffect(() => {
    let cancel = false;
    setCargando(true);
    (async () => {
      if (periodo === "dia") {
        const di = iso(ancla);
        const d = await estadisticasApi.resumen({ desde: di, hasta: di });
        if (!cancel) { setData(d); setSerie(null); setComp(null); }
      } else if (periodo === "semana") {
        const l = lunesDe(ancla); const dom = addDays(l, 6);
        const [d, s, c] = await Promise.all([
          estadisticasApi.resumen({ desde: iso(l), hasta: iso(dom) }),
          estadisticasApi.serie(iso(l), iso(dom)),
          estadisticasApi.periodos("semana", 6, iso(dom)),
        ]);
        if (!cancel) { setData(d); setSerie(s); setComp(c); }
      } else {
        const y = ancla.getFullYear(), m = ancla.getMonth();
        const ini = new Date(y, m, 1), fin = new Date(y, m + 1, 0);
        const [d, s, c] = await Promise.all([
          estadisticasApi.resumen({ desde: iso(ini), hasta: iso(fin) }),
          estadisticasApi.serie(iso(ini), iso(fin)),
          estadisticasApi.periodos("mes", 6, iso(fin)),
        ]);
        if (!cancel) { setData(d); setSerie(s); setComp(c); }
      }
    })().finally(() => { if (!cancel) setCargando(false); });
    return () => { cancel = true; };
  }, [periodo, ancla]);

  const serieSemana = serie ? serie.map((d, i) => ({ label: DIAS[i], short: DIAS[i], value: d.total, highlight: d.fecha === hoyIso })) : [];
  const serieMes = serie ? serie.map((d) => {
    const day = Number(d.fecha.slice(8, 10));
    return { label: `${day}`, short: (day === 1 || day % 5 === 0) ? `${day}` : "", value: d.total, highlight: d.fecha === hoyIso };
  }) : [];
  const compSemana = comp ? comp.map((p, i) => {
    const [, mmp, ddp] = p.inicio.split("-");
    return { label: `Sem ${ddp}/${mmp}`, short: `${ddp}/${mmp}`, value: p.total, highlight: i === comp.length - 1 };
  }) : [];
  const compMes = comp ? comp.map((p, i) => {
    const mIdx = Number(p.inicio.slice(5, 7)) - 1;
    return { label: MESES[mIdx], short: MESES[mIdx], value: p.total, highlight: i === comp.length - 1 };
  }) : [];

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-serif text-xl font-semibold text-frappe-text">Estadísticas</h1>
        <p className="text-sm text-frappe-textSoft">Ventas, ranking de productos y formas de pago. Usa las flechas para ver días, semanas y meses anteriores.</p>
      </div>

      <div className="mb-4 flex w-fit gap-1 rounded-lg bg-frappe-accentSoft p-1">
        {PERIODOS.map((p) => (
          <button key={p.id} onClick={() => setPeriodo(p.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${periodo === p.id ? "bg-frappe-surface text-frappe-accentDark shadow-sm" : "text-frappe-textSoft hover:text-frappe-text"}`}>
            {p.label}
          </button>
        ))}
      </div>

      {(periodo === "dia" || periodo === "semana") && (
        <NavBar label={labelSemana} onPrev={() => shiftDias(-7)} onNext={() => shiftDias(7)} nextDisabled={enSemanaActual} />
      )}
      {periodo === "mes" && (
        <NavBar label={labelMes} onPrev={() => shiftMeses(-1)} onNext={() => shiftMeses(1)} nextDisabled={enMesActual} />
      )}

      {periodo === "dia" && (
        <div className="mb-4 flex gap-1 overflow-x-auto">
          {semanaDias.map((d, i) => {
            const di = iso(d);
            const futuro = di > hoyIso;
            const sel = di === iso(ancla);
            return (
              <button key={di} disabled={futuro} onClick={() => setAncla(d)}
                className={`flex shrink-0 flex-col items-center rounded-lg border px-3 py-1.5 text-xs transition ${
                  sel ? "border-frappe-accent bg-frappe-accent text-white" : futuro ? "border-frappe-border text-frappe-textSoft/40" : "border-frappe-border bg-frappe-surface text-frappe-text hover:border-frappe-accent"
                }`}>
                <span className="font-semibold">{DIAS[i]}</span>
                <span>{d.getDate()}</span>
              </button>
            );
          })}
        </div>
      )}

      {cargando || !data ? (
        <div className="flex items-center justify-center gap-2 py-16 text-frappe-textSoft"><Loader2 size={18} className="animate-spin" /> Cargando…</div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <StatCard tone="success" icon={Wallet} label={periodo === "dia" ? "Ventas del día" : periodo === "semana" ? "Ventas semana" : "Ventas mes"} value={money(data.totalVentas)} />
            <StatCard tone="accent" icon={Receipt} label="N° ventas" value={data.nVentas} />
            <StatCard tone="neutral" icon={Ticket} label="Ticket prom." value={money(data.ticketPromedio)} />
          </div>

          {periodo === "semana" && serie && (
            <div className="rounded-2xl border border-frappe-border bg-frappe-surface p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold text-frappe-text">Ventas por día (semana seleccionada)</div>
              <BarChart data={serieSemana} formatValue={money} showValues />
            </div>
          )}

          {periodo === "semana" && comp && (
            <div className="rounded-2xl border border-frappe-border bg-frappe-surface p-4 shadow-sm">
              <div className="mb-2 text-sm font-semibold text-frappe-text">Comparación de semanas</div>
              <Comparacion comp={comp} unidad="semana" />
              <div className="mt-3"><BarChart data={compSemana} formatValue={money} /></div>
            </div>
          )}

          {periodo === "mes" && serie && (
            <div className="rounded-2xl border border-frappe-border bg-frappe-surface p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold text-frappe-text">Ventas por día (mes seleccionado)</div>
              <BarChart data={serieMes} formatValue={money} height={140} />
            </div>
          )}

          {periodo === "mes" && comp && (
            <div className="rounded-2xl border border-frappe-border bg-frappe-surface p-4 shadow-sm">
              <div className="mb-2 text-sm font-semibold text-frappe-text">Comparación de meses</div>
              <Comparacion comp={comp} unidad="mes" />
              <div className="mt-3"><BarChart data={compMes} formatValue={money} /></div>
            </div>
          )}

          <Detalle data={data} />
        </div>
      )}
    </div>
  );
}
