import { useEffect, useState, useCallback } from "react";
import { Loader2, Lock, Unlock, RefreshCw } from "lucide-react";
import { cajaApi } from "../../api/caja";
import { usersApi } from "../../api/users";
import { money } from "../../utils/format";

const inputCls =
  "w-full rounded-lg border border-frappe-border bg-frappe-bg px-3 py-2.5 text-sm text-frappe-text outline-none focus:border-frappe-accent";
const labelCls = "mb-1 block text-sm text-frappe-textSoft";
const MEDIO_LABEL = { efectivo: "Efectivo", debito: "Débito", credito: "Crédito", transferencia: "Transferencia" };

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
// Fila de conteo por medio en el cierre.
function MedioRow({ label, esperado, value, onChange }) {
  const dif = value === "" ? null : Math.trunc(Number(value) || 0) - esperado;
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm text-frappe-textSoft">{label}</span>
        <span className="text-xs text-frappe-textSoft">esperado {money(esperado)}</span>
      </div>
      <input type="number" min="0" inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} placeholder={money(esperado)} className={inputCls} />
      {dif !== null && (
        <div className={`mt-1 text-xs font-semibold ${dif === 0 ? "text-frappe-success" : "text-frappe-danger"}`}>
          {dif === 0 ? "Cuadra" : `Diferencia: ${dif > 0 ? "+" : ""}${money(dif)}`}
        </div>
      )}
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
  // Cerrar (conteo por medio)
  const [cerrando, setCerrando] = useState(false);
  const [efCont, setEfCont] = useState("");
  const [dbCont, setDbCont] = useState("");
  const [crCont, setCrCont] = useState("");
  const [trCont, setTrCont] = useState("");
  const [resumen, setResumen] = useState(null);

  const cargar = useCallback(async () => {
    const [t, us] = await Promise.all([cajaApi.estado(), usersApi.list()]);
    setTurno(t);
    setCajeros(us.filter((u) => u.rol === "cajero" && u.activo));
  }, []);

  useEffect(() => { cargar().finally(() => setCargando(false)); }, [cargar]);

  const abierta = !!turno && turno.estado === "abierta";
  const t = turno?.totales || { total: 0, efectivo: 0, debito: 0, credito: 0, transferencia: 0, n_ventas: 0 };
  const tarjeta = t.total - t.efectivo;
  const espEf = abierta ? turno.montoInicial + t.efectivo : 0;

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

  const iniciarCierre = () => {
    // Prellenar los electrónicos con lo esperado (suelen cuadrar); efectivo se cuenta.
    setEfCont("");
    setDbCont(String(t.debito || 0));
    setCrCont(String(t.credito || 0));
    setTrCont(String(t.transferencia || 0));
    setCerrando(true);
  };

  const cerrar = async () => {
    setError("");
    setProcesando(true);
    try {
      const cerrado = await cajaApi.cerrar({
        efectivoContado: Math.trunc(Number(efCont) || 0),
        debitoContado: Math.trunc(Number(dbCont) || 0),
        creditoContado: Math.trunc(Number(crCont) || 0),
        transferenciaContado: Math.trunc(Number(trCont) || 0),
      });
      setResumen(cerrado);
      setCerrando(false);
      setEfCont(""); setDbCont(""); setCrCont(""); setTrCont("");
      await cargar();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo cerrar la caja");
    } finally { setProcesando(false); }
  };

  if (cargando) {
    return <div className="flex items-center justify-center gap-2 py-16 text-frappe-textSoft"><Loader2 size={18} className="animate-spin" /> Cargando…</div>;
  }

  const totalDif = resumen?.medios ? resumen.medios.reduce((s, m) => s + m.diferencia, 0) : 0;

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

      {resumen && (
        <div className="mb-4 rounded-2xl border border-frappe-border bg-frappe-surface p-5">
          <h2 className="mb-3 font-serif text-lg font-semibold text-frappe-text">Caja cerrada</h2>
          <Row label="Cajero" value={resumen.cajeroNombre} />
          <Row label="Monto inicial" value={money(resumen.montoInicial)} />
          <div className="my-2 border-t border-frappe-border" />
          <div className="mb-1 text-xs font-semibold text-frappe-textSoft">Cuadratura por medio</div>
          <div className="overflow-hidden rounded-xl border border-frappe-border">
            <div className="grid grid-cols-4 bg-frappe-bg px-3 py-1.5 text-[11px] font-semibold text-frappe-textSoft">
              <span>Medio</span><span className="text-right">Esperado</span><span className="text-right">Contado</span><span className="text-right">Dif.</span>
            </div>
            {resumen.medios.map((m) => (
              <div key={m.medio} className="grid grid-cols-4 border-t border-frappe-border px-3 py-1.5 text-sm">
                <span className="text-frappe-text">{MEDIO_LABEL[m.medio]}</span>
                <span className="text-right text-frappe-textSoft">{money(m.esperado)}</span>
                <span className="text-right text-frappe-text">{money(m.contado)}</span>
                <span className={`text-right font-semibold ${m.diferencia === 0 ? "text-frappe-success" : "text-frappe-danger"}`}>
                  {m.diferencia === 0 ? "0" : `${m.diferencia > 0 ? "+" : ""}${money(m.diferencia)}`}
                </span>
              </div>
            ))}
          </div>
          <div className={`mt-3 rounded-lg px-3 py-2 text-sm font-semibold ${totalDif === 0 ? "bg-frappe-successSoft text-frappe-success" : "bg-frappe-dangerSoft text-frappe-danger"}`}>
            {totalDif === 0 ? "Todo cuadra ✓" : `Diferencia total: ${totalDif > 0 ? "+" : ""}${money(totalDif)}`}
          </div>
          <button onClick={() => setResumen(null)} className="mt-4 w-full rounded-lg bg-frappe-accent py-2.5 text-sm font-semibold text-white hover:bg-frappe-accentDark">Entendido</button>
        </div>
      )}

      {!abierta && !resumen && (
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
          {(turno.arqueos || []).length > 0 && (
            <div>
              <div className="mb-1 text-xs font-semibold text-frappe-textSoft">Cortes / mini cierres del turno</div>
              <div className="overflow-hidden rounded-xl border border-frappe-border bg-frappe-surface">
                {turno.arqueos.map((a) => (
                  <div key={a.id} className="border-b border-frappe-border px-3 py-2 text-sm last:border-b-0">
                    <div className="flex items-center justify-between">
                      <span className="text-frappe-textSoft">{new Date(a.createdAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}{a.usuarioNombre ? ` · ${a.usuarioNombre}` : ""}</span>
                      <span className={`font-semibold ${a.diferencia === 0 ? "text-frappe-success" : "text-frappe-danger"}`}>
                        {a.diferencia === 0 ? "cuadra" : `${a.diferencia > 0 ? "+" : ""}${money(a.diferencia)}`}
                      </span>
                    </div>
                    <div className="text-xs text-frappe-textSoft">Contó {money(a.efectivoContado)} · esperado {money(a.efectivoEsperado)}{a.nota ? ` · ${a.nota}` : ""}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={iniciarCierre} className="rounded-lg border border-frappe-danger py-2.5 text-sm font-semibold text-frappe-danger transition hover:bg-frappe-dangerSoft">
            Cerrar caja
          </button>
        </div>
      )}

      {abierta && cerrando && (
        <div className="rounded-2xl border border-frappe-border bg-frappe-surface p-5">
          <h2 className="mb-1 font-serif text-lg font-semibold text-frappe-text">Cerrar caja</h2>
          <p className="mb-3 text-sm text-frappe-textSoft">Cuenta cada medio para cuadrar el turno.</p>
          <Row label="Cajero" value={turno.cajeroNombre} />
          <Row label="Monto inicial" value={money(turno.montoInicial)} />
          <div className="my-3 border-t border-frappe-border" />
          <MedioRow label="Efectivo en caja" esperado={espEf} value={efCont} onChange={setEfCont} />
          <MedioRow label="Débito" esperado={t.debito} value={dbCont} onChange={setDbCont} />
          <MedioRow label="Crédito" esperado={t.credito} value={crCont} onChange={setCrCont} />
          <MedioRow label="Transferencia" esperado={t.transferencia} value={trCont} onChange={setTrCont} />
          <div className="mt-4 flex gap-2">
            <button onClick={() => setCerrando(false)} className="flex-1 rounded-lg border border-frappe-border py-2.5 text-sm font-semibold text-frappe-text hover:bg-frappe-bg">Volver</button>
            <button onClick={cerrar} disabled={efCont === "" || procesando} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-frappe-accent py-2.5 text-sm font-semibold text-white hover:bg-frappe-accentDark disabled:opacity-60">
              {procesando && <Loader2 size={15} className="animate-spin" />} Confirmar cierre
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
