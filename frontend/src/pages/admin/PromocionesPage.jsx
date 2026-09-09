import { useEffect, useState } from "react";
import { Plus, Pencil, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { promocionesApi } from "../../api/promociones";
import { productsApi } from "../../api/products";
import PromocionFormModal from "./PromocionFormModal";

export default function PromocionesPage() {
  const [promos, setPromos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);

  const cargar = async () => {
    setError("");
    try {
      const [pr, prod] = await Promise.all([promocionesApi.list(), productsApi.list({ activo: true })]);
      setPromos(pr);
      setProductos(prod);
    } catch {
      setError("No se pudieron cargar las promociones");
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => { cargar(); }, []);

  const onSaved = () => { setForm(null); cargar(); };

  const toggle = async (p) => {
    try {
      await promocionesApi.update(p.id, { activo: !p.activo });
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo cambiar el estado");
    }
  };

  const desc = (p) => (p.tipoDescuento === "porcentaje" ? `${p.valor}%` : `$${p.valor}/u`);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-semibold text-frappe-text">Promociones</h1>
          <p className="text-sm text-frappe-textSoft">Descuentos por producto con fecha de vigencia. Se aplican solos al vender.</p>
        </div>
        <button
          onClick={() => productos.length && setForm({ modo: "crear" })}
          disabled={productos.length === 0}
          className="flex items-center gap-1.5 rounded-lg bg-frappe-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-frappe-accentDark disabled:opacity-50"
        >
          <Plus size={16} /> Nueva promoción
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">{error}</div>}

      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-16 text-frappe-textSoft"><Loader2 size={18} className="animate-spin" /> Cargando…</div>
      ) : promos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-frappe-border bg-frappe-surface py-16 text-center text-sm text-frappe-textSoft">Aún no hay promociones.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-frappe-border bg-frappe-surface">
          {promos.map((p, i) => (
            <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-frappe-border" : ""} ${!p.activo ? "opacity-50" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-frappe-text">{p.nombre}</span>
                  {p.vigente && <span className="rounded-full bg-frappe-successSoft px-2 py-0.5 text-xs font-semibold text-frappe-success">vigente</span>}
                </div>
                <div className="truncate text-xs text-frappe-textSoft">{p.productoNombre} · {desc(p)} · {p.fechaInicio?.slice(0,10)} → {p.fechaFin?.slice(0,10)}</div>
              </div>
              <button title={p.activo ? "Desactivar" : "Activar"} onClick={() => toggle(p)} className="rounded-lg p-1.5 text-frappe-textSoft transition hover:text-frappe-text">
                {p.activo ? <ToggleRight size={22} className="text-frappe-success" /> : <ToggleLeft size={22} />}
              </button>
              <button title="Editar" onClick={() => setForm({ modo: "editar", promo: p })} className="rounded-lg p-2 text-frappe-textSoft transition hover:bg-frappe-bg hover:text-frappe-text">
                <Pencil size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {form && (
        <PromocionFormModal modo={form.modo} promo={form.promo} productos={productos} onClose={() => setForm(null)} onSaved={onSaved} />
      )}
    </div>
  );
}
