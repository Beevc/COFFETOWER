import { useEffect, useState, useCallback } from "react";
import { Loader2, Lock, Unlock, RefreshCw } from "lucide-react";
import { cajaApi } from "../../api/caja";
import { usersApi } from "../../api/users";
import { money } from "../../utils/format";

const inputCls =
  "w-full rounded-lg border border-frappe-border bg-frappe-bg px-3 py-2.5 text-sm text-frappe-text outline-none focus:border-frappe-accent";
const labelCls = "mb-1 block text-sm text-frappe-textSoft";

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-frappe-border bg-frappe-surface px-3 py-2.5">
      <div className="text-xs text-frappe-textSoft">{label}</div>
      <div className="text-lg font-bold text-frappe-text">{value}</div>
    </div>
  );
}
function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between py-1 text-sm ${bold ? "font-bold" : ""}`}>
      <span className={bold ? "text-frappe-text" : "text-frappe-textSoft"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function AdminCajaPage() {
  const [turno, setTurno] = useState(null);
  const [cajeros, setCajeros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [procesando, setProcesando] = useState(false);
  // Abrir
  const [cajeroId, setCajeroId] = useState("");
  const [montoInicial, setMontoInicial] = useState("20000");
  // Cerrar
  const [cerrando, setCerrando] = useState(false);
  const [efectivoContado, setEfectivoContado] = useState("");
  const [resumen, setResumen] = useState(null);

  const cargar = useCallback(async () => {
    const [t, us] = await Promise.all([cajaApi.estado(), usersApi.list()]);
    setTurno(t);
    setCajeros(us.filter((u) => u.rol === "cajero" && u.activo));
  }, []);

  useEffect(() => { cargar().finally(() => setCargando(false)); }, [cargar]);

  const abierta = !!turno && turno.estado === "abierta";
  const t = turno?.totales || { total: 0, efectivo: 0, n_ventas: 0 };
  const tarjeta = t.total - t.efectivo;
  const esperado = abierta ? turno.montoInicial + t.efectivo : 0;
  const dif = efectivoContado === "" ? null : Math.trunc(Number(efectivoContado)) - esperado;

  const abrir = async () => {
    setError("");
    if (!cajeroId) { setError("Elige un cajero"); return; }
    setProcesando(true);
    try {
      await cajaApi.abrir(Math.trunc(Number(montoInicial) || 0), Number(cajeroId));
      await cargar();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo abrir la caja");
    } finally { setProcesando(false); }
  };

  const cerrar = async () => {
    setError("");
    setProcesando(true);
    try {
      const cerrado = await cajaApi.cerrar(Math.trunc(Number(efectivoContado)));
      setResumen(cerrado);
      setCerrando(false);
      setEfectivoContado("");
      await cargar();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo cerrar la caja");
    } finally { setProcesando(false); }
  };

  if (cargando) {
    return <div className="flex items-center justify-center gap-2 py-16 text-frappe-textSoft"><Loader2 size={18} className="animate-spin" /> Cargando…</div>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-semibold text-frappe-text">Caja</h1>
          <p className="text-sm text-frappe-textSoft">Tú abres y cierras la caja y asignas el cajero. Los cajeros no pueden.</p>
        </div>
        <button onClick={() => cargar()} title="Actualizar" className="rounded-lg border border-frappe-border p-2 text-frappe-textSoft transition hover:bg-frappe-bg">
          <RefreshCw size={14} />
        </button>
      </div>

      {error && <div className="mb-3 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">{error}</div>}

      {/* Resumen de cierre */}
      {resumen && (
        <div className="mb-4 rounded-2xl border border-frappe-border bg-frappe-surface p-5">
          <h2 className="mb-3 font-serif text-lg font-semibold text-frappe-text">Caja cerrada</h2>
          <Row label="Cajero" value={resumen.cajeroNombre} />
          <Row label="Monto inicial" value={money(resumen.montoInicial)} />
          <Row label="Ventas en efectivo" value={money(resumen.totales.efectivo)} />
          <Row label="Efectivo esperado" value={money(resumen.efectivoEsperado)} bold />
          <Row label="Efectivo contado" value={money(resumen.efectivoContado)} />
          <div className="my-2 border-t border-frappe-border" />
          <div className={`rounded-lg px-3 py-2 text-sm font-semibold ${resumen.diferencia === 0 ? "bg-frappe-successSoft text-frappe-success" : "bg-frappe-dangerSoft text-frappe-danger"}`}>
            {resumen.diferencia === 0 ? "Cuadratura exacta" : `Diferencia: ${resumen.diferencia > 0 ? "+" : ""}${money(resumen.diferencia)}`}
          </div>
          <button onClick={() => setResumen(null)} className="mt-4 w-full rounded-lg bg-frappe-accent py-2.5 text-sm font-semibold text-white hover:bg-frappe-accentDark">Entendido</button>
        </div>
      )}

      {!abierta && !resumen && (
        // Abrir caja
        <div className="rounded-2xl border border-frappe-border bg-frappe-surface p-5">
          <div className="mb-1 flex items-center gap-2">
            <Lock size={16} className="text-frappe-danger" />
            <h2 className="font-serif text-lg font-semibold text-frappe-text">Abrir caja</h2>
          </div>
          <p className="mb-4 text-sm text-frappe-textSoft">Elige el cajero del turno y el monto inicial en efectivo.</p>
          <label className={labelCls}>Cajero a cargo</label>
          {cajeros.length === 0 ? (
            <p className="mb-3 rounded-lg border border-dashed border-frappe-border bg-frappe-bg px-3 py-2 text-xs text-frappe-textSoft">
              No hay cajeros activos. Crea uno en la pestaña <b>Usuarios</b>.
            </p>
          ) : (
            <select className={`${inputCls} mb-3`} value={cajeroId} onChange={(e) => setCajeroId(e.target.value)}>
              <option value="">— Elige un cajero —</option>
              {cajeros.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          )}
          <label className={labelCls}>Monto inicial (CLP)</label>
          <input type="number" min="0" className={`${inputCls} mb-4`} value={montoInicial} onChange={(e) => setMontoInicial(e.target.value)} />
          <button onClick={abrir} disabled={procesando || cajeros.length === 0} className="flex w-full items-center justify-center gap-2 rounded-lg bg-frappe-accent py-2.5 text-sm font-semibold text-white hover:bg-frappe-accentDark disabled:opacity-60">
            {procesando && <Loader2 size={15} className="animate-spin" />} Abrir caja
          </button>
        </div>
      )}

      {abierta && !cerrando && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-frappe-successSoft px-3 py-2 text-sm font-semibold text-frappe-success">
            <Unlock size={15} /> Caja abierta · cajero: {turno.cajeroNombre}
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
          <button onClick={() => setCerrando(true)} className="rounded-lg border border-frappe-danger py-2.5 text-sm font-semibold text-frappe-danger transition hover:bg-frappe-dangerSoft">
            Cerrar caja
          </button>
        </div>
      )}

      {abierta && cerrando && (
        <div className="rounded-2xl border border-frappe-border bg-frappe-surface p-5">
          <h2 className="mb-3 font-serif text-lg font-semibold text-frappe-text">Cerrar caja</h2>
          <Row label="Cajero" value={turno.cajeroNombre} />
          <Row label="Monto inicial" value={money(turno.montoInicial)} />
          <Row label="Ventas en efectivo" value={money(t.efectivo)} />
          <Row label="Ventas con tarjeta/transf." value={money(tarjeta)} />
          <div className="my-2 border-t border-frappe-border" />
          <Row label="Efectivo esperado en caja" value={money(esperado)} bold />
          <label className="mb-1 mt-3 block text-sm text-frappe-textSoft">Efectivo contado</label>
          <input type="number" min="0" value={efectivoContado} onChange={(e) => setEfectivoContado(e.target.value)} placeholder="Cuenta el dinero en caja" className={inputCls} />
          {dif !== null && (
            <div className={`mt-3 rounded-lg px-3 py-2 text-sm font-semibold ${dif === 0 ? "bg-frappe-successSoft text-frappe-success" : "bg-frappe-dangerSoft text-frappe-danger"}`}>
              {dif === 0 ? "Cuadratura exacta" : `Diferencia: ${dif > 0 ? "+" : ""}${money(dif)}`}
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <button onClick={() => { setCerrando(false); setEfectivoContado(""); }} className="flex-1 rounded-lg border border-frappe-border py-2.5 text-sm font-semibold text-frappe-text hover:bg-frappe-bg">Volver</button>
            <button onClick={cerrar} disabled={efectivoContado === "" || procesando} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-frappe-accent py-2.5 text-sm font-semibold text-white hover:bg-frappe-accentDark disabled:opacity-60">
              {procesando && <Loader2 size={15} className="animate-spin" />} Confirmar cierre
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
