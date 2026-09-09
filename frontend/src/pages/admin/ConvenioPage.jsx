import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Gift, Check } from "lucide-react";
import { productsApi } from "../../api/products";
import { ventasApi } from "../../api/ventas";
import { money } from "../../utils/format";

const inputCls =
  "rounded-lg border border-frappe-border bg-frappe-bg px-3 py-2 text-sm text-frappe-text outline-none focus:border-frappe-accent";

export default function ConvenioPage() {
  const [productos, setProductos] = useState([]);
  const [convenios, setConvenios] = useState([]);
  const [items, setItems] = useState([{ productoId: "", cantidad: "1" }]);
  const [motivo, setMotivo] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const cargar = async () => {
    const [prod, conv] = await Promise.all([productsApi.list({ activo: true }), ventasApi.listarConvenio()]);
    setProductos(prod);
    setConvenios(conv);
  };
  useEffect(() => { cargar().finally(() => setCargando(false)); }, []);

  const addRow = () => setItems((r) => [...r, { productoId: "", cantidad: "1" }]);
  const removeRow = (i) => setItems((r) => r.filter((_, idx) => idx !== i));
  const setRow = (i, campo, val) => setItems((r) => r.map((it, idx) => (idx === i ? { ...it, [campo]: val } : it)));

  const registrar = async () => {
    setError(""); setMsg("");
    const limpios = items.filter((it) => it.productoId && Number(it.cantidad) > 0)
      .map((it) => ({ productoId: Number(it.productoId), cantidad: Number(it.cantidad) }));
    if (limpios.length === 0) { setError("Agrega al menos un producto"); return; }
    setGuardando(true);
    try {
      const res = await ventasApi.registrarConvenio(limpios, motivo.trim() || undefined);
      setMsg(`Registrado: ${res.venta.items.reduce((s, i) => s + i.cantidad, 0)} frappé(s), valor ${money(res.valorRegalado)}.`);
      setItems([{ productoId: "", cantidad: "1" }]);
      setMotivo("");
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo registrar");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <div className="flex items-center justify-center gap-2 py-16 text-frappe-textSoft"><Loader2 size={18} className="animate-spin" /> Cargando…</div>;

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-serif text-xl font-semibold text-frappe-text">Convenio gimnasio</h1>
        <p className="text-sm text-frappe-textSoft">Registra frappés regalados. Precio $0, pero descuenta el insumo real (queda como inversión/marketing).</p>
      </div>

      {productos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-frappe-border bg-frappe-surface py-12 text-center text-sm text-frappe-textSoft">Primero crea productos.</div>
      ) : (
        <div className="mb-6 rounded-xl border border-frappe-border bg-frappe-surface p-4">
          {error && <div className="mb-3 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">{error}</div>}
          {msg && <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-frappe-successSoft px-3 py-2 text-sm font-medium text-frappe-success"><Check size={15} /> {msg}</div>}

          {items.map((it, i) => (
            <div key={i} className="mb-2 flex items-center gap-2">
              <select className={`${inputCls} flex-1`} value={it.productoId} onChange={(e) => setRow(i, "productoId", e.target.value)}>
                <option value="">— producto —</option>
                {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
              <input type="number" min="1" className={`${inputCls} w-20`} value={it.cantidad} onChange={(e) => setRow(i, "cantidad", e.target.value)} />
              <button onClick={() => removeRow(i)} className="rounded-lg p-2 text-frappe-textSoft transition hover:text-frappe-danger"><Trash2 size={15} /></button>
            </div>
          ))}
          <button onClick={addRow} className="mt-1 flex items-center gap-1.5 rounded-lg border border-dashed border-frappe-border px-3 py-2 text-sm font-medium text-frappe-textSoft transition hover:border-frappe-accent hover:text-frappe-accentDark">
            <Plus size={15} /> Agregar producto
          </button>

          <input className={`${inputCls} mt-3 w-full`} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (opcional): ej. socios del gimnasio" />

          <button onClick={registrar} disabled={guardando} className="mt-4 flex items-center gap-2 rounded-lg bg-frappe-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-frappe-accentDark disabled:opacity-60">
            {guardando ? <Loader2 size={15} className="animate-spin" /> : <Gift size={15} />} Registrar regalo
          </button>
        </div>
      )}

      <div className="mb-2 text-sm font-semibold text-frappe-text">Historial de convenio</div>
      {convenios.length === 0 ? (
        <div className="rounded-xl border border-dashed border-frappe-border bg-frappe-surface py-10 text-center text-sm text-frappe-textSoft">Aún no hay registros.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-frappe-border bg-frappe-surface">
          {convenios.map((c, i) => (
            <div key={c.id} className={`flex items-center justify-between px-4 py-3 text-sm ${i > 0 ? "border-t border-frappe-border" : ""}`}>
              <span className="font-mono text-frappe-textSoft">#{c.numero}</span>
              <span className="text-frappe-textSoft">{new Date(c.createdAt).toLocaleDateString("es-CL")}</span>
              <span className="font-semibold text-frappe-accentDark">{money(c.valorRegalado)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
