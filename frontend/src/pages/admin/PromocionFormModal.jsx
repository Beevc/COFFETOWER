import { useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "../../components/Modal";
import { promocionesApi } from "../../api/promociones";

const inputCls =
  "w-full rounded-lg border border-frappe-border bg-frappe-bg px-3 py-2.5 text-sm text-frappe-text outline-none focus:border-frappe-accent";
const labelCls = "mb-1 block text-sm text-frappe-textSoft";

export default function PromocionFormModal({ modo, promo, productos, onClose, onSaved }) {
  const esEditar = modo === "editar";
  const [nombre, setNombre] = useState(promo?.nombre || "");
  const [productoId, setProductoId] = useState(promo?.productoId || (productos[0]?.id ?? ""));
  const [tipoDescuento, setTipoDescuento] = useState(promo?.tipoDescuento || "porcentaje");
  const [valor, setValor] = useState(promo?.valor != null ? String(promo.valor) : "");
  const [fechaInicio, setFechaInicio] = useState(promo?.fechaInicio?.slice(0, 10) || new Date().toISOString().slice(0, 10));
  const [fechaFin, setFechaFin] = useState(promo?.fechaFin?.slice(0, 10) || new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      let guardado;
      if (esEditar) {
        guardado = await promocionesApi.update(promo.id, {
          nombre: nombre.trim(), tipoDescuento, valor: Number(valor), fechaInicio, fechaFin,
        });
      } else {
        guardado = await promocionesApi.create({
          nombre: nombre.trim(), productoId: Number(productoId), tipoDescuento, valor: Number(valor), fechaInicio, fechaFin,
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
    <Modal title={esEditar ? "Editar promoción" : "Nueva promoción"} onClose={onClose}>
      <form onSubmit={onSubmit}>
        {error && (
          <div className="mb-4 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">{error}</div>
        )}
        <label className={labelCls}>Nombre</label>
        <input className={`${inputCls} mb-3`} value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Ej: 20% en Moka" />

        <label className={labelCls}>Producto</label>
        <select className={`${inputCls} mb-3 ${esEditar ? "opacity-60" : ""}`} value={productoId} onChange={(e) => setProductoId(e.target.value)} disabled={esEditar} required>
          {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Tipo</label>
            <select className={inputCls} value={tipoDescuento} onChange={(e) => setTipoDescuento(e.target.value)}>
              <option value="porcentaje">Porcentaje (%)</option>
              <option value="monto">Monto ($ por unidad)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Valor</label>
            <input type="number" step="any" min="0" className={inputCls} value={valor} onChange={(e) => setValor(e.target.value)} required placeholder={tipoDescuento === "porcentaje" ? "20" : "500"} />
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Desde</label>
            <input type="date" className={inputCls} value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>Hasta</label>
            <input type="date" className={inputCls} value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} required />
          </div>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-frappe-border py-2.5 text-sm font-semibold text-frappe-text transition hover:bg-frappe-bg">Cancelar</button>
          <button type="submit" disabled={guardando} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-frappe-accent py-2.5 text-sm font-semibold text-white transition hover:bg-frappe-accentDark disabled:opacity-60">
            {guardando && <Loader2 size={15} className="animate-spin" />}
            {esEditar ? "Guardar" : "Crear"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
