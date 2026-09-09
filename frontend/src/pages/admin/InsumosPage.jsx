import { useEffect, useState } from "react";
import { Plus, Pencil, PackagePlus, Loader2, AlertTriangle } from "lucide-react";
import { insumosApi } from "../../api/insumos";
import InsumoFormModal from "./InsumoFormModal";
import MovimientoModal from "./MovimientoModal";

export default function InsumosPage() {
  const [insumos, setInsumos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [soloAlertas, setSoloAlertas] = useState(false);
  const [form, setForm] = useState(null); // { modo, insumo }
  const [movim, setMovim] = useState(null); // insumo

  const cargar = async () => {
    setError("");
    try {
      setInsumos(await insumosApi.list(soloAlertas ? { soloAlertas: true } : {}));
    } catch {
      setError("No se pudieron cargar los insumos");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soloAlertas]);

  const onSaved = () => {
    setForm(null);
    setMovim(null);
    cargar();
  };

  const enAlerta = insumos.filter((i) => i.stockBajo).length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-semibold text-frappe-text">Insumos</h1>
          <p className="text-sm text-frappe-textSoft">Stock de ingredientes y materiales.</p>
        </div>
        <button
          onClick={() => setForm({ modo: "crear" })}
          className="flex items-center gap-1.5 rounded-lg bg-frappe-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-frappe-accentDark"
        >
          <Plus size={16} />
          Nuevo insumo
        </button>
      </div>

      <label className="mb-4 flex w-fit items-center gap-2 text-sm text-frappe-text">
        <input type="checkbox" checked={soloAlertas} onChange={(e) => setSoloAlertas(e.target.checked)} />
        Ver solo los que están en alerta
        {enAlerta > 0 && !soloAlertas && (
          <span className="rounded-full bg-frappe-dangerSoft px-2 py-0.5 text-xs font-semibold text-frappe-danger">
            {enAlerta} en alerta
          </span>
        )}
      </label>

      {error && (
        <div className="mb-4 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">
          {error}
        </div>
      )}

      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-16 text-frappe-textSoft">
          <Loader2 size={18} className="animate-spin" /> Cargando…
        </div>
      ) : insumos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-frappe-border bg-frappe-surface py-16 text-center text-sm text-frappe-textSoft">
          {soloAlertas ? "No hay insumos en alerta." : "Aún no hay insumos. Crea el primero."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-frappe-border bg-frappe-surface">
          {insumos.map((i, idx) => (
            <div
              key={i.id}
              className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? "border-t border-frappe-border" : ""} ${!i.activo ? "opacity-50" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-frappe-text">{i.nombre}</span>
                  {i.stockBajo && (
                    <span className="flex items-center gap-1 rounded-full bg-frappe-dangerSoft px-2 py-0.5 text-xs font-semibold text-frappe-danger">
                      <AlertTriangle size={11} /> stock bajo
                    </span>
                  )}
                </div>
                <div className="text-xs text-frappe-textSoft">umbral: {i.umbralAlerta} {i.unidad}</div>
              </div>

              <div className="text-right">
                <div className={`text-sm font-bold ${i.stockBajo ? "text-frappe-danger" : "text-frappe-text"}`}>
                  {i.stockActual} {i.unidad}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button title="Registrar movimiento" onClick={() => setMovim(i)} className="rounded-lg p-2 text-frappe-textSoft transition hover:bg-frappe-bg hover:text-frappe-text">
                  <PackagePlus size={15} />
                </button>
                <button title="Editar" onClick={() => setForm({ modo: "editar", insumo: i })} className="rounded-lg p-2 text-frappe-textSoft transition hover:bg-frappe-bg hover:text-frappe-text">
                  <Pencil size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <InsumoFormModal modo={form.modo} insumo={form.insumo} onClose={() => setForm(null)} onSaved={onSaved} />
      )}
      {movim && (
        <MovimientoModal insumo={movim} onClose={() => setMovim(null)} onSaved={onSaved} />
      )}
    </div>
  );
}
