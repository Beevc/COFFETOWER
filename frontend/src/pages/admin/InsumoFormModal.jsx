import { useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "../../components/Modal";
import { insumosApi } from "../../api/insumos";

const inputCls =
  "w-full rounded-lg border border-frappe-border bg-frappe-bg px-3 py-2.5 text-sm text-frappe-text outline-none focus:border-frappe-accent";
const labelCls = "mb-1 block text-sm text-frappe-textSoft";
const UNIDADES = ["ml", "l", "g", "kg", "unidad", "pams"];

export default function InsumoFormModal({ modo, insumo, onClose, onSaved }) {
  const esEditar = modo === "editar";
  const [nombre, setNombre] = useState(insumo?.nombre || "");
  const [unidad, setUnidad] = useState(insumo?.unidad || "ml");
  const [stockInicial, setStockInicial] = useState("");
  const [umbralAlerta, setUmbralAlerta] = useState(
    insumo?.umbralAlerta != null ? String(insumo.umbralAlerta) : "0"
  );
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      let guardado;
      if (esEditar) {
        guardado = await insumosApi.update(insumo.id, {
          nombre: nombre.trim(),
          unidad,
          umbralAlerta: Number(umbralAlerta) || 0,
        });
      } else {
        guardado = await insumosApi.create({
          nombre: nombre.trim(),
          unidad,
          stockInicial: Number(stockInicial) || 0,
          umbralAlerta: Number(umbralAlerta) || 0,
        });
      }
      onSaved(guardado);
    } catch (err) {
      const d = err.response?.data;
      setError(d?.detalles?.map((x) => x.mensaje).join(" · ") || d?.error || "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal title={esEditar ? "Editar insumo" : "Nuevo insumo"} onClose={onClose}>
      <form onSubmit={onSubmit}>
        {error && (
          <div className="mb-4 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">
            {error}
          </div>
        )}

        <label className={labelCls}>Nombre</label>
        <input className={`${inputCls} mb-3`} value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Leche, Café en grano, Vaso 16oz…" />

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Unidad</label>
            <select className={inputCls} value={unidad} onChange={(e) => setUnidad(e.target.value)}>
              {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          {!esEditar && (
            <div>
              <label className={labelCls}>Stock inicial</label>
              <input type="number" step="any" min="0" className={inputCls} value={stockInicial} onChange={(e) => setStockInicial(e.target.value)} placeholder="0" />
            </div>
          )}
          <div className={esEditar ? "" : "col-span-2"}>
            <label className={labelCls}>Umbral de alerta (avisa si baja de esto)</label>
            <input type="number" step="any" min="0" className={inputCls} value={umbralAlerta} onChange={(e) => setUmbralAlerta(e.target.value)} placeholder="0" />
          </div>
        </div>

        <div className="mt-2 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-frappe-border py-2.5 text-sm font-semibold text-frappe-text transition hover:bg-frappe-bg">
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-frappe-accent py-2.5 text-sm font-semibold text-white transition hover:bg-frappe-accentDark disabled:opacity-60">
            {guardando && <Loader2 size={15} className="animate-spin" />}
            {esEditar ? "Guardar" : "Crear"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
