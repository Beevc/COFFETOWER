import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
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

function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between py-1 text-sm ${bold ? "font-bold" : ""}`}>
      <span className={bold ? "text-frappe-text" : "text-frappe-textSoft"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function CajaPage() {
  const { turno, abierta, cargando, abrir, cerrar } = useCaja();
  const [montoInicial, setMontoInicial] = useState("20000");
  const [cerrando, setCerrando] = useState(false);
  const [efectivoContado, setEfectivoContado] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [resumen, setResumen] = useState(null); // turno cerrado

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-frappe-textSoft">
        <Loader2 size={18} className="animate-spin" /> Cargando…
      </div>
    );
  }

  // Resumen tras cerrar
  if (resumen) {
    return (
      <div className="rounded-2xl border border-frappe-border bg-frappe-surface p-5">
        <h1 className="mb-3 font-serif text-lg font-semibold text-frappe-text">
          Caja cerrada
        </h1>
        <Row label="Monto inicial" value={money(resumen.montoInicial)} />
        <Row label="Ventas en efectivo" value={money(resumen.totales.efectivo)} />
        <Row label="Efectivo esperado" value={money(resumen.efectivoEsperado)} bold />
        <Row label="Efectivo contado" value={money(resumen.efectivoContado)} />
        <div className="my-2 border-t border-frappe-border" />
        <div
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${
            resumen.diferencia === 0
              ? "bg-frappe-successSoft text-frappe-success"
              : "bg-frappe-dangerSoft text-frappe-danger"
          }`}
        >
          {resumen.diferencia === 0
            ? "Cuadratura exacta"
            : `Diferencia: ${resumen.diferencia > 0 ? "+" : ""}${money(resumen.diferencia)}`}
        </div>
        <button
          onClick={() => setResumen(null)}
          className="mt-4 w-full rounded-lg bg-frappe-accent py-2.5 text-sm font-semibold text-white transition hover:bg-frappe-accentDark"
        >
          Entendido
        </button>
      </div>
    );
  }

  // Sin caja abierta -> abrir
  if (!abierta) {
    return (
      <div className="rounded-2xl border border-frappe-border bg-frappe-surface p-5">
        <div className="mb-1 flex items-center gap-2">
          <Lock size={16} className="text-frappe-danger" />
          <h1 className="font-serif text-lg font-semibold text-frappe-text">Abrir caja</h1>
        </div>
        <p className="mb-4 text-sm text-frappe-textSoft">
          Ingresa el monto inicial en efectivo para comenzar el turno.
        </p>
        {error && (
          <div className="mb-3 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">
            {error}
          </div>
        )}
        <label className="mb-1 block text-sm text-frappe-textSoft">Monto inicial (CLP)</label>
        <input
          type="number"
          min="0"
          value={montoInicial}
          onChange={(e) => setMontoInicial(e.target.value)}
          className="mb-4 w-full rounded-lg border border-frappe-border bg-frappe-bg px-3 py-2.5 text-sm outline-none focus:border-frappe-accent"
        />
        <button
          disabled={procesando}
          onClick={async () => {
            setError("");
            setProcesando(true);
            try {
              await abrir(Math.trunc(Number(montoInicial) || 0));
            } catch (err) {
              setError(err.response?.data?.error || "No se pudo abrir la caja");
            } finally {
              setProcesando(false);
            }
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-frappe-accent py-2.5 text-sm font-semibold text-white transition hover:bg-frappe-accentDark disabled:opacity-60"
        >
          {procesando && <Loader2 size={15} className="animate-spin" />}
          Abrir caja
        </button>
      </div>
    );
  }

  // Caja abierta
  const t = turno.totales || { total: 0, efectivo: 0, n_ventas: 0 };
  const tarjeta = t.total - t.efectivo;
  const esperado = turno.montoInicial + t.efectivo;
  const dif = efectivoContado === "" ? null : Math.trunc(Number(efectivoContado)) - esperado;

  if (cerrando) {
    return (
      <div className="rounded-2xl border border-frappe-border bg-frappe-surface p-5">
        <h1 className="mb-3 font-serif text-lg font-semibold text-frappe-text">Cerrar caja</h1>
        {error && (
          <div className="mb-3 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">
            {error}
          </div>
        )}
        <Row label="Monto inicial" value={money(turno.montoInicial)} />
        <Row label="Ventas en efectivo" value={money(t.efectivo)} />
        <Row label="Ventas con tarjeta/transf." value={money(tarjeta)} />
        <div className="my-2 border-t border-frappe-border" />
        <Row label="Efectivo esperado en caja" value={money(esperado)} bold />

        <label className="mb-1 mt-3 block text-sm text-frappe-textSoft">Efectivo contado</label>
        <input
          type="number"
          min="0"
          value={efectivoContado}
          onChange={(e) => setEfectivoContado(e.target.value)}
          placeholder="Cuenta el dinero en caja"
          className="w-full rounded-lg border border-frappe-border bg-frappe-bg px-3 py-2.5 text-sm outline-none focus:border-frappe-accent"
        />
        {dif !== null && (
          <div
            className={`mt-3 rounded-lg px-3 py-2 text-sm font-semibold ${
              dif === 0
                ? "bg-frappe-successSoft text-frappe-success"
                : "bg-frappe-dangerSoft text-frappe-danger"
            }`}
          >
            {dif === 0 ? "Cuadratura exacta" : `Diferencia: ${dif > 0 ? "+" : ""}${money(dif)}`}
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              setCerrando(false);
              setEfectivoContado("");
              setError("");
            }}
            className="flex-1 rounded-lg border border-frappe-border py-2.5 text-sm font-semibold text-frappe-text transition hover:bg-frappe-bg"
          >
            Volver
          </button>
          <button
            disabled={efectivoContado === "" || procesando}
            onClick={async () => {
              setError("");
              setProcesando(true);
              try {
                const cerrado = await cerrar(Math.trunc(Number(efectivoContado)));
                setResumen(cerrado);
                setCerrando(false);
                setEfectivoContado("");
              } catch (err) {
                setError(err.response?.data?.error || "No se pudo cerrar la caja");
              } finally {
                setProcesando(false);
              }
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-frappe-accent py-2.5 text-sm font-semibold text-white transition hover:bg-frappe-accentDark disabled:opacity-60"
          >
            {procesando && <Loader2 size={15} className="animate-spin" />}
            Confirmar cierre
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
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
      <button
        onClick={() => setCerrando(true)}
        className="rounded-lg border border-frappe-danger py-2.5 text-sm font-semibold text-frappe-danger transition hover:bg-frappe-dangerSoft"
      >
        Cerrar caja
      </button>
    </div>
  );
}
