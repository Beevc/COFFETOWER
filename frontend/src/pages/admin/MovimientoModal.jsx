import { useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "../../components/Modal";
import { insumosApi } from "../../api/insumos";

const inputCls =
  "w-full rounded-lg border border-frappe-border bg-frappe-bg px-3 py-2.5 text-sm text-frappe-text outline-none focus:border-frappe-accent";
const labelCls = "mb-1 block text-sm text-frappe-textSoft";

const TIPOS = [
  { id: "ingreso", label: "Ingreso (compra)" },
  { id: "merma", label: "Merma (pérdida)" },
  { id: "ajuste", label: "Ajuste manual" },
];

export default function MovimientoModal({ insumo, onClose, onSaved }) {
  const [tipo, setTipo] = useState("ingreso");
  const [cantidad, setCantidad] = useState("");
  const [resta, setResta] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      const actualizado = await insumosApi.movimiento(insumo.id, {
        tipo,
        cantidad: Number(cantidad),
        resta: tipo === "ajuste" ? resta : undefined,
        motivo: motivo.trim() || undefined,
      });
      onSaved(actualizado);
    } catch (err) {
      const d = err.response?.data;
      setError(d?.detalles?.map((x) => x.mensaje).join(" · ") || d?.error || "No se pudo registrar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal title={`Movimiento — ${insumo.nombre}`} onClose={onClose}>
      <form onSubmit={onSubmit}>
        {error && (
          <div className="mb-4 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">
            {error}
          </div>
        )}

        <div className="mb-3 rounded-lg bg-frappe-bg px-3 py-2 text-sm text-frappe-textSoft">
          Stock actual: <b className="text-frappe-text">{insumo.stockActual} {insumo.unidad}</b>
        </div>

        <label className={labelCls}>Tipo de movimiento</label>
        <select className={`${inputCls} mb-3`} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>

        {tipo === "ajuste" && (
          <label className="mb-3 flex items-center gap-2 text-sm text-frappe-text">
            <input type="checkbox" checked={resta} onChange={(e) => setResta(e.target.checked)} />
            Restar del stock (en vez de sumar)
          </label>
        )}

        <label className={labelCls}>Cantidad ({insumo.unidad})</label>
        <input type="number" step="any" min="0" className={`${inputCls} mb-3`} value={cantidad} onChange={(e) => setCantidad(e.target.value)} required placeholder="Ej: 1000" />

        <label className={labelCls}>Motivo (opcional)</label>
        <input className={`${inputCls} mb-4`} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: compra proveedor, vaso quebrado…" />

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-frappe-border py-2.5 text-sm font-semibold text-frappe-text transition hover:bg-frappe-bg">
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-frappe-accent py-2.5 text-sm font-semibold text-white transition hover:bg-frappe-accentDark disabled:opacity-60">
            {guardando && <Loader2 size={15} className="animate-spin" />}
            Registrar
          </button>
        </div>
      </form>
    </Modal>
  );
}
