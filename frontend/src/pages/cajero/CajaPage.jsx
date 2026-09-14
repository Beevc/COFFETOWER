import { useState } from "react";
import { Loader2, Lock, Unlock, RefreshCw, ClipboardCheck } from "lucide-react";
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

// Vista de caja para el cajero: SOLO lectura + "mini cierre" (arqueo). El cierre
// final y la apertura los hace el administrador.
export default function CajaPage() {
  const { turno, abierta, cargando, refrescar, arqueo } = useCaja();
  const [haciendo, setHaciendo] = useState(false);
  const [contado, setContado] = useState("");
  const [nota, setNota] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

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
        <p className="text-sm text-frappe-textSoft">Pídele al <b>administrador</b> que abra la caja para poder vender.</p>
        <button onClick={() => refrescar()} className="mt-2 flex items-center gap-1.5 rounded-lg border border-frappe-border px-3 py-2 text-sm font-medium text-frappe-text transition hover:bg-frappe-bg">
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>
    );
  }

  const t = turno.totales || { total: 0, efectivo: 0, n_ventas: 0 };
  const tarjeta = t.total - t.efectivo;
  const esperado = turno.montoInicial + t.efectivo;
  const dif = contado === "" ? null : Math.trunc(Number(contado)) - esperado;
  const arqueos = turno.arqueos || [];

  const registrarCorte = async () => {
    setError(""); setOk(false); setProcesando(true);
    try {
      await arqueo(Math.trunc(Number(contado)), nota.trim() || undefined);
      setHaciendo(false); setContado(""); setNota(""); setOk(true);
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo registrar el corte");
    } finally { setProcesando(false); }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 rounded-lg bg-frappe-successSoft px-3 py-2 text-sm font-semibold text-frappe-success">
        <span className="flex items-center gap-1.5"><Unlock size={15} /> Caja abierta{turno.cajeroNombre ? ` · ${turno.cajeroNombre}` : ""}</span>
        <button onClick={() => refrescar()} title="Actualizar" className="text-frappe-success/80 hover:text-frappe-success"><RefreshCw size={14} /></button>
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

      {error && <div className="rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">{error}</div>}
      {ok && <div className="rounded-lg bg-frappe-successSoft px-3 py-2 text-sm font-medium text-frappe-success">✓ Corte registrado</div>}

      {/* Mini cierre / arqueo */}
      {!haciendo ? (
        <button onClick={() => { setHaciendo(true); setOk(false); }} className="flex items-center justify-center gap-2 rounded-lg border border-frappe-accent py-2.5 text-sm font-semibold text-frappe-accentDark transition hover:bg-frappe-accentSoft">
          <ClipboardCheck size={16} /> Hacer corte (mini cierre)
        </button>
      ) : (
        <div className="rounded-2xl border border-frappe-border bg-frappe-surface p-4">
          <div className="mb-2 text-sm font-semibold text-frappe-text">Corte de caja</div>
          <p className="mb-2 text-xs text-frappe-textSoft">Cuenta el efectivo actual. Esto NO cierra la caja; queda registrado para el administrador.</p>
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-frappe-textSoft">Efectivo esperado</span>
            <span className="font-bold text-frappe-text">{money(esperado)}</span>
          </div>
          <label className="mb-1 block text-sm text-frappe-textSoft">Efectivo contado</label>
          <input type="number" min="0" value={contado} onChange={(e) => setContado(e.target.value)} placeholder="Cuenta el dinero en caja" className="mb-2 w-full rounded-lg border border-frappe-border bg-frappe-bg px-3 py-2.5 text-sm outline-none focus:border-frappe-accent" />
          {dif !== null && (
            <div className={`mb-2 rounded-lg px-3 py-2 text-sm font-semibold ${dif === 0 ? "bg-frappe-successSoft text-frappe-success" : "bg-frappe-dangerSoft text-frappe-danger"}`}>
              {dif === 0 ? "Cuadratura exacta" : `Diferencia: ${dif > 0 ? "+" : ""}${money(dif)}`}
            </div>
          )}
          <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota (opcional, ej. cambio de turno)" className="mb-3 w-full rounded-lg border border-frappe-border bg-frappe-bg px-3 py-2.5 text-sm outline-none focus:border-frappe-accent" />
          <div className="flex gap-2">
            <button onClick={() => { setHaciendo(false); setContado(""); setNota(""); }} className="flex-1 rounded-lg border border-frappe-border py-2.5 text-sm font-semibold text-frappe-text hover:bg-frappe-bg">Cancelar</button>
            <button onClick={registrarCorte} disabled={contado === "" || procesando} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-frappe-accent py-2.5 text-sm font-semibold text-white hover:bg-frappe-accentDark disabled:opacity-60">
              {procesando && <Loader2 size={15} className="animate-spin" />} Registrar corte
            </button>
          </div>
        </div>
      )}

      {/* Cortes del turno */}
      {arqueos.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-semibold text-frappe-textSoft">Cortes de este turno</div>
          <div className="overflow-hidden rounded-xl border border-frappe-border bg-frappe-surface">
            {arqueos.map((a) => (
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
    </div>
  );
}
