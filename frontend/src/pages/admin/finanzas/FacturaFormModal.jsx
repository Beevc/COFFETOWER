import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import Modal from "../../../components/Modal";
import { finanzasApi } from "../../../api/finanzas";
import { insumosApi } from "../../../api/insumos";
import { money } from "../../../utils/format";
import { CATEGORIAS, MEDIOS, hoyISO } from "./constants";

const inputCls =
  "w-full rounded-lg border border-frappe-border bg-frappe-bg px-3 py-2.5 text-sm text-frappe-text outline-none focus:border-frappe-accent";
const labelCls = "mb-1 block text-sm text-frappe-textSoft";

export default function FacturaFormModal({ proveedores, onClose, onSaved }) {
  const [proveedorId, setProveedorId] = useState("");
  const [numero, setNumero] = useState("");
  const [categoria, setCategoria] = useState("insumos");
  const [descripcion, setDescripcion] = useState("");
  const [fechaEmision, setFechaEmision] = useState(hoyISO());
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [montoTotal, setMontoTotal] = useState("");

  const [insumos, setInsumos] = useState([]);
  const [items, setItems] = useState([]); // { insumoId, cantidad }

  const [pagarAhora, setPagarAhora] = useState(false);
  const [montoPago, setMontoPago] = useState("");
  const [medioPago, setMedioPago] = useState("efectivo");

  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    insumosApi.list({ activo: true }).then(setInsumos).catch(() => {});
  }, []);

  const addItem = () => setItems((r) => [...r, { insumoId: "", cantidad: "" }]);
  const setItem = (idx, campo, val) => setItems((r) => r.map((it, i) => (i === idx ? { ...it, [campo]: val } : it)));
  const removeItem = (idx) => setItems((r) => r.filter((_, i) => i !== idx));
  const unidadDe = (id) => insumos.find((x) => x.id === Number(id))?.unidad || "";

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const monto = Math.trunc(Number(montoTotal));
    if (!(monto > 0)) { setError("Ingresa el monto total de la factura"); return; }

    const itemsLimpios = items
      .filter((it) => it.insumoId && Number(it.cantidad) > 0)
      .map((it) => ({ insumoId: Number(it.insumoId), cantidad: Number(it.cantidad) }));
    if (itemsLimpios.length !== new Set(itemsLimpios.map((i) => i.insumoId)).size) {
      setError("Hay insumos repetidos en los ítems"); return;
    }

    const data = {
      proveedorId: proveedorId ? Number(proveedorId) : null,
      numero: numero.trim() || undefined,
      categoria,
      descripcion: descripcion.trim() || undefined,
      fechaEmision,
      fechaVencimiento: fechaVencimiento || undefined,
      montoTotal: monto,
    };
    if (itemsLimpios.length > 0) data.items = itemsLimpios;
    if (pagarAhora) {
      const mp = Math.trunc(Number(montoPago) || monto);
      if (!(mp > 0)) { setError("El monto del pago debe ser mayor a 0"); return; }
      if (mp > monto) { setError("El pago no puede superar el monto de la factura"); return; }
      data.pagoInicial = { monto: mp, medioPago };
    }

    setGuardando(true);
    try {
      const factura = await finanzasApi.crearFactura(data);
      onSaved(factura);
    } catch (err) {
      const d = err.response?.data;
      setError(d?.detalles?.map((x) => x.mensaje).join(" · ") || d?.error || "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal title="Nueva factura / gasto" onClose={onClose}>
      <form onSubmit={submit}>
        {error && (
          <div className="mb-3 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">{error}</div>
        )}

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Proveedor</label>
            <select className={inputCls} value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
              <option value="">— Sin proveedor —</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Categoría</label>
            <select className={inputCls} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>N° de factura (opcional)</label>
            <input className={inputCls} value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ej. 001234" />
          </div>
          <div>
            <label className={labelCls}>Monto total (CLP)</label>
            <input type="number" min="0" step="1" className={inputCls} value={montoTotal} onChange={(e) => setMontoTotal(e.target.value)} placeholder="0" required />
          </div>
          <div>
            <label className={labelCls}>Fecha de emisión</label>
            <input type="date" className={inputCls} value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>Vencimiento (opcional)</label>
            <input type="date" className={inputCls} value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} />
          </div>
        </div>

        <label className={labelCls}>Descripción (opcional)</label>
        <input className={`${inputCls} mb-3`} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Detalle del gasto" />

        {/* Ítems que suman stock */}
        <div className="mb-3 rounded-lg border border-frappe-border bg-frappe-bg/50 p-3">
          <div className="mb-1 text-sm font-semibold text-frappe-text">Insumos comprados (opcional)</div>
          <p className="mb-2 text-xs text-frappe-textSoft">Los que agregues aquí <b>suman stock</b> al inventario automáticamente.</p>

          {insumos.length === 0 ? (
            <p className="rounded-lg border border-dashed border-frappe-border bg-frappe-surface px-3 py-2 text-xs text-frappe-textSoft">
              No hay insumos creados. Créalos en la pestaña <b>Insumos</b> para poder cargarlos aquí.
            </p>
          ) : (
            <>
              {items.map((it, idx) => (
                <div key={idx} className="mb-2 rounded-lg border border-frappe-border bg-frappe-surface p-2.5">
                  <label className="mb-1 block text-xs text-frappe-textSoft">Insumo</label>
                  <select className={`${inputCls} mb-2`} value={it.insumoId} onChange={(e) => setItem(idx, "insumoId", e.target.value)}>
                    <option value="">— Elegir insumo —</option>
                    {insumos.map((i) => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>)}
                  </select>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs text-frappe-textSoft">Cantidad</label>
                      <input type="number" step="any" min="0" className={inputCls} value={it.cantidad} onChange={(e) => setItem(idx, "cantidad", e.target.value)} placeholder="0" />
                    </div>
                    <span className="pb-2.5 text-sm font-medium text-frappe-textSoft">{unidadDe(it.insumoId) || ""}</span>
                    <button type="button" onClick={() => removeItem(idx)} className="rounded-lg border border-frappe-border p-2.5 text-frappe-textSoft hover:bg-frappe-bg hover:text-frappe-danger"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addItem} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-frappe-border px-3 py-2 text-sm font-medium text-frappe-textSoft hover:border-frappe-accent hover:text-frappe-accentDark">
                <Plus size={15} /> Agregar insumo
              </button>
            </>
          )}
        </div>

        {/* Pago inicial */}
        <div className="mb-4 rounded-lg border border-frappe-border bg-frappe-bg/50 p-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-frappe-text">
            <input type="checkbox" checked={pagarAhora} onChange={(e) => { setPagarAhora(e.target.checked); if (e.target.checked && !montoPago) setMontoPago(montoTotal); }} />
            Registrar un pago ahora
          </label>
          {pagarAhora && (
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Monto del pago</label>
                <input type="number" min="0" step="1" className={inputCls} value={montoPago} onChange={(e) => setMontoPago(e.target.value)} placeholder={montoTotal || "0"} />
              </div>
              <div>
                <label className={labelCls}>Medio de pago</label>
                <select className={inputCls} value={medioPago} onChange={(e) => setMedioPago(e.target.value)}>
                  {MEDIOS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-frappe-border py-2.5 text-sm font-semibold text-frappe-text hover:bg-frappe-bg">Cancelar</button>
          <button type="submit" disabled={guardando} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-frappe-accent py-2.5 text-sm font-semibold text-white hover:bg-frappe-accentDark disabled:opacity-60">
            {guardando && <Loader2 size={15} className="animate-spin" />} Guardar factura
          </button>
        </div>
        {montoTotal && <div className="mt-2 text-right text-xs text-frappe-textSoft">Total: <b className="text-frappe-text">{money(Math.trunc(Number(montoTotal)) || 0)}</b></div>}
      </form>
    </Modal>
  );
}
