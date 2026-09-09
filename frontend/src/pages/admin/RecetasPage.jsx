import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Save, Check } from "lucide-react";
import { productsApi } from "../../api/products";
import { insumosApi } from "../../api/insumos";
import { recetasApi } from "../../api/recetas";

const inputCls =
  "rounded-lg border border-frappe-border bg-frappe-bg px-3 py-2 text-sm text-frappe-text outline-none focus:border-frappe-accent";

export default function RecetasPage() {
  const [productos, setProductos] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [prodId, setProdId] = useState("");
  const [items, setItems] = useState([]);
  const [cargandoReceta, setCargandoReceta] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([productsApi.list({ activo: true }), insumosApi.list({ activo: true })])
      .then(([p, i]) => {
        setProductos(p);
        setInsumos(i);
      })
      .catch(() => setError("No se pudieron cargar los datos"))
      .finally(() => setCargando(false));
  }, []);

  const cargarReceta = async (id) => {
    setProdId(id);
    setGuardado(false);
    setError("");
    if (!id) {
      setItems([]);
      return;
    }
    setCargandoReceta(true);
    try {
      const data = await recetasApi.get(Number(id));
      setItems(data.items.map((it) => ({ insumoId: it.insumoId, cantidad: String(it.cantidad) })));
    } catch {
      setError("No se pudo cargar la receta");
    } finally {
      setCargandoReceta(false);
    }
  };

  const addRow = () => setItems((r) => [...r, { insumoId: "", cantidad: "" }]);
  const removeRow = (idx) => setItems((r) => r.filter((_, i) => i !== idx));
  const setRow = (idx, campo, val) =>
    setItems((r) => r.map((it, i) => (i === idx ? { ...it, [campo]: val } : it)));

  const insumoDe = (insumoId) => insumos.find((i) => i.id === Number(insumoId));
  // En la receta se escribe en la unidad de receta (pams, cucharada…) si existe;
  // si no, en la unidad real del insumo. Al vender el backend convierte con el factor.
  const unidadDe = (insumoId) => {
    const i = insumoDe(insumoId);
    return i?.unidadReceta || i?.unidad || "";
  };
  const equivalenciaDe = (insumoId) => {
    const i = insumoDe(insumoId);
    if (!i?.unidadReceta) return "";
    return `1 ${i.unidadReceta} = ${i.factorReceta} ${i.unidad}`;
  };

  const guardar = async () => {
    setError("");
    setGuardado(false);
    // Validación básica en cliente
    const limpios = items
      .filter((it) => it.insumoId && it.cantidad)
      .map((it) => ({ insumoId: Number(it.insumoId), cantidad: Number(it.cantidad) }));
    if (limpios.some((it) => !(it.cantidad > 0))) {
      setError("Las cantidades deben ser mayores a 0");
      return;
    }
    const ids = limpios.map((it) => it.insumoId);
    if (new Set(ids).size !== ids.length) {
      setError("Hay insumos repetidos");
      return;
    }
    setGuardando(true);
    try {
      await recetasApi.set(Number(prodId), limpios);
      setGuardado(true);
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo guardar la receta");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-frappe-textSoft">
        <Loader2 size={18} className="animate-spin" /> Cargando…
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-serif text-xl font-semibold text-frappe-text">Recetas</h1>
        <p className="text-sm text-frappe-textSoft">
          Define qué insumos consume cada producto. Al vender, se descuentan del stock automáticamente.
        </p>
      </div>

      {insumos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-frappe-border bg-frappe-surface py-12 text-center text-sm text-frappe-textSoft">
          Primero crea insumos en la pestaña <b>Insumos</b> para poder armar recetas.
        </div>
      ) : (
        <>
          <label className="mb-1 block text-sm text-frappe-textSoft">Producto</label>
          <select
            className={`${inputCls} mb-4 w-full`}
            value={prodId}
            onChange={(e) => cargarReceta(e.target.value)}
          >
            <option value="">— Elige un producto —</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>

          {error && (
            <div className="mb-3 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">
              {error}
            </div>
          )}

          {prodId && (
            cargandoReceta ? (
              <div className="flex items-center gap-2 py-8 text-frappe-textSoft">
                <Loader2 size={16} className="animate-spin" /> Cargando receta…
              </div>
            ) : (
              <div className="rounded-xl border border-frappe-border bg-frappe-surface p-4">
                {items.length === 0 && (
                  <p className="mb-3 text-sm text-frappe-textSoft">
                    Este producto aún no tiene receta. Agrega insumos:
                  </p>
                )}

                {items.map((it, idx) => (
                  <div key={idx} className="mb-2 flex items-center gap-2">
                    <select
                      className={`${inputCls} flex-1`}
                      value={it.insumoId}
                      onChange={(e) => setRow(idx, "insumoId", e.target.value)}
                    >
                      <option value="">— insumo —</option>
                      {insumos.map((i) => (
                        <option key={i.id} value={i.id}>{i.nombre}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className={`${inputCls} w-24`}
                      value={it.cantidad}
                      onChange={(e) => setRow(idx, "cantidad", e.target.value)}
                      placeholder="cant."
                    />
                    <span className="w-16 text-xs text-frappe-textSoft" title={equivalenciaDe(it.insumoId)}>{unidadDe(it.insumoId)}</span>
                    <button onClick={() => removeRow(idx)} className="rounded-lg p-2 text-frappe-textSoft transition hover:bg-frappe-bg hover:text-frappe-danger">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                {items.some((it) => equivalenciaDe(it.insumoId)) && (
                  <p className="mt-1 mb-2 text-xs text-frappe-textSoft">
                    {items
                      .filter((it) => equivalenciaDe(it.insumoId))
                      .map((it) => `${insumoDe(it.insumoId)?.nombre}: ${equivalenciaDe(it.insumoId)}`)
                      .filter((v, idx, arr) => arr.indexOf(v) === idx)
                      .join("  ·  ")}
                  </p>
                )}

                <button
                  onClick={addRow}
                  className="mt-1 flex items-center gap-1.5 rounded-lg border border-dashed border-frappe-border px-3 py-2 text-sm font-medium text-frappe-textSoft transition hover:border-frappe-accent hover:text-frappe-accentDark"
                >
                  <Plus size={15} /> Agregar insumo
                </button>

                <div className="mt-4 flex items-center gap-3 border-t border-frappe-border pt-4">
                  <button
                    onClick={guardar}
                    disabled={guardando}
                    className="flex items-center gap-2 rounded-lg bg-frappe-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-frappe-accentDark disabled:opacity-60"
                  >
                    {guardando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    Guardar receta
                  </button>
                  {guardado && (
                    <span className="flex items-center gap-1 text-sm font-medium text-frappe-success">
                      <Check size={15} /> Guardada
                    </span>
                  )}
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
