import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, Trash2, TrendingUp, TrendingDown, Banknote, ArrowLeftRight } from "lucide-react";
import Modal from "../../../components/Modal";
import { finanzasApi } from "../../../api/finanzas";
import { money } from "../../../utils/format";
import { hoyISO } from "./constants";

const inputCls =
  "w-full rounded-lg border border-frappe-border bg-frappe-bg px-3 py-2.5 text-sm text-frappe-text outline-none focus:border-frappe-accent";
const labelCls = "mb-1 block text-sm text-frappe-textSoft";
const MEDIO_LABEL = { efectivo: "Efectivo", transferencia: "Transferencia" };

function NuevoModal({ onClose, onSaved }) {
  const [tipo, setTipo] = useState("retiro");
  const [medio, setMedio] = useState("efectivo");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const m = Math.trunc(Number(monto));
    if (!(m > 0)) { setError("Ingresa un monto mayor a 0"); return; }
    setError(""); setGuardando(true);
    try {
      const mov = await finanzasApi.crearMovimiento({ tipo, medio, monto: m, fecha, descripcion: descripcion.trim() || undefined });
      onSaved(mov);
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo guardar");
    } finally { setGuardando(false); }
  };

  const opcBtn = (activo, cls) => `flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-sm font-semibold transition ${activo ? cls : "border-frappe-border text-frappe-textSoft"}`;

  return (
    <Modal title="Nuevo movimiento de caja" onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="mb-3 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">{error}</div>}

        <div className="mb-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setTipo("ingreso")} className={opcBtn(tipo === "ingreso", "border-frappe-success bg-frappe-successSoft text-frappe-success")}>
            <TrendingUp size={15} /> Ingreso
          </button>
          <button type="button" onClick={() => setTipo("retiro")} className={opcBtn(tipo === "retiro", "border-frappe-danger bg-frappe-dangerSoft text-frappe-danger")}>
            <TrendingDown size={15} /> Retiro
          </button>
        </div>

        <label className={labelCls}>Medio</label>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setMedio("efectivo")} className={opcBtn(medio === "efectivo", "border-frappe-accent bg-frappe-accentSoft text-frappe-accentDark")}>
            <Banknote size={15} /> Efectivo
          </button>
          <button type="button" onClick={() => setMedio("transferencia")} className={opcBtn(medio === "transferencia", "border-frappe-accent bg-frappe-accentSoft text-frappe-accentDark")}>
            <ArrowLeftRight size={15} /> Transferencia
          </button>
        </div>

        <label className={labelCls}>Monto (CLP)</label>
        <input type="number" min="0" step="1" inputMode="numeric" className={`${inputCls} mb-3`} value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0" autoFocus />
        <label className={labelCls}>Fecha</label>
        <input type="date" className={`${inputCls} mb-3 block min-w-0 appearance-none`} value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <label className={labelCls}>Descripción (opcional)</label>
        <input className={`${inputCls} mb-4`} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej. retiro de ganancias, aporte socio" />
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-frappe-border py-2.5 text-sm font-semibold text-frappe-text hover:bg-frappe-bg">Cancelar</button>
          <button type="submit" disabled={guardando} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-frappe-accent py-2.5 text-sm font-semibold text-white hover:bg-frappe-accentDark disabled:opacity-60">
            {guardando && <Loader2 size={15} className="animate-spin" />} Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function MovimientosView({ mes, onChanged }) {
  const [movs, setMovs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [creando, setCreando] = useState(false);

  const rango = (() => {
    const [y, m] = mes.split("-").map(Number);
    return { desde: `${mes}-01`, hasta: new Date(y, m, 0).toISOString().slice(0, 10) };
  })();

  const cargar = useCallback(async () => {
    setError("");
    try { setMovs(await finanzasApi.movimientos(rango)); }
    catch { setError("No se pudieron cargar los movimientos"); }
    finally { setCargando(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes]);

  useEffect(() => { cargar(); }, [cargar]);

  const borrar = async (id) => {
    if (!window.confirm("¿Eliminar este movimiento?")) return;
    await finanzasApi.eliminarMovimiento(id);
    await cargar();
    onChanged?.();
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-frappe-textSoft">Ingresos y retiros del mes</span>
        <button onClick={() => setCreando(true)} className="flex items-center gap-1.5 rounded-lg bg-frappe-accent px-3 py-2 text-sm font-semibold text-white hover:bg-frappe-accentDark">
          <Plus size={16} /> Nuevo
        </button>
      </div>

      {error && <div className="mb-3 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">{error}</div>}

      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-12 text-frappe-textSoft"><Loader2 size={18} className="animate-spin" /> Cargando…</div>
      ) : movs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-frappe-border bg-frappe-surface py-12 text-center text-sm text-frappe-textSoft">
          Sin movimientos este mes. Usa “Nuevo” para registrar un ingreso o retiro.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-frappe-border bg-frappe-surface">
          {movs.map((m, i) => {
            const ing = m.tipo === "ingreso";
            return (
              <div key={m.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-frappe-border" : ""}`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${ing ? "bg-frappe-successSoft text-frappe-success" : "bg-frappe-dangerSoft text-frappe-danger"}`}>
                  {ing ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-frappe-text">{m.descripcion || (ing ? "Ingreso" : "Retiro")}</div>
                  <div className="text-xs text-frappe-textSoft">
                    {String(m.fecha).slice(0, 10)}{m.medio ? ` · ${MEDIO_LABEL[m.medio] || m.medio}` : ""}
                  </div>
                </div>
                <div className={`text-sm font-bold ${ing ? "text-frappe-success" : "text-frappe-danger"}`}>{ing ? "+" : "-"}{money(m.monto)}</div>
                <button onClick={() => borrar(m.id)} className="rounded p-1 text-frappe-textSoft hover:text-frappe-danger"><Trash2 size={14} /></button>
              </div>
            );
          })}
        </div>
      )}

      {creando && <NuevoModal onClose={() => setCreando(false)} onSaved={() => { setCreando(false); cargar(); onChanged?.(); }} />}
    </div>
  );
}
