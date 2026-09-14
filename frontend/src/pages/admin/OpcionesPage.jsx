import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Repeat, PlusCircle } from "lucide-react";
import { opcionesApi } from "../../api/opciones";
import { insumosApi } from "../../api/insumos";
import { money } from "../../utils/format";

const inputCls =
  "w-full rounded-lg border border-frappe-border bg-frappe-bg px-3 py-2.5 text-sm text-frappe-text outline-none focus:border-frappe-accent";
const labelCls = "mb-1 block text-sm text-frappe-textSoft";

export default function OpcionesPage() {
  const [opciones, setOpciones] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [creando, setCreando] = useState(false);
  // Form
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("extra");
  const [precio, setPrecio] = useState("");
  const [insumoId, setInsumoId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [origenId, setOrigenId] = useState("");
  const [reemplazoId, setReemplazoId] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      const [ops, ins] = await Promise.all([opcionesApi.list(), insumosApi.list({ activo: true })]);
      setOpciones(ops);
      setInsumos(ins);
    } catch {
      setError("No se pudieron cargar las opciones");
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => { cargar(); }, []);

  const unidadDe = (id) => insumos.find((x) => x.id === Number(id))?.unidad || "";

  const limpiar = () => { setNombre(""); setTipo("extra"); setPrecio(""); setInsumoId(""); setCantidad(""); setOrigenId(""); setReemplazoId(""); };

  const crear = async () => {
    setError("");
    if (!nombre.trim()) { setError("Ponle un nombre"); return; }
    const data = { nombre: nombre.trim(), tipo, precio: Math.trunc(Number(precio)) || 0 };
    if (tipo === "extra") {
      if (!insumoId || !(Number(cantidad) > 0)) { setError("Elige el insumo y la cantidad del extra"); return; }
      data.insumoId = Number(insumoId); data.cantidad = Number(cantidad);
    } else {
      if (!origenId || !reemplazoId) { setError("Elige el insumo a reemplazar y el reemplazo"); return; }
      if (origenId === reemplazoId) { setError("El insumo origen y el reemplazo deben ser distintos"); return; }
      data.insumoOrigenId = Number(origenId); data.insumoReemplazoId = Number(reemplazoId);
    }
    setGuardando(true);
    try {
      await opcionesApi.create(data);
      limpiar(); setCreando(false);
      await cargar();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detalles?.map((x) => x.mensaje).join(" · ") || "No se pudo crear");
    } finally { setGuardando(false); }
  };

  const borrar = async (id) => {
    if (!window.confirm("¿Eliminar esta opción?")) return;
    await opcionesApi.remove(id);
    await cargar();
  };

  const extras = opciones.filter((o) => o.tipo === "extra");
  const sust = opciones.filter((o) => o.tipo === "sustitucion");

  if (cargando) {
    return <div className="flex items-center justify-center gap-2 py-16 text-frappe-textSoft"><Loader2 size={18} className="animate-spin" /> Cargando…</div>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-semibold text-frappe-text">Opciones</h1>
          <p className="text-sm text-frappe-textSoft">Extras y sustituciones para personalizar los frappés en la caja.</p>
        </div>
        {!creando && (
          <button onClick={() => setCreando(true)} className="flex items-center gap-1.5 rounded-lg bg-frappe-accent px-3 py-2 text-sm font-semibold text-white hover:bg-frappe-accentDark">
            <Plus size={16} /> Nueva opción
          </button>
        )}
      </div>

      {error && <div className="mb-3 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">{error}</div>}

      {creando && (
        <div className="mb-5 rounded-xl border border-frappe-border bg-frappe-surface p-4">
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nombre</label>
              <input className={inputCls} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Proteína, Leche almendra" />
            </div>
            <div>
              <label className={labelCls}>Tipo</label>
              <select className={inputCls} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="extra">Extra (agrega y consume insumo)</option>
                <option value="sustitucion">Sustitución (reemplaza un insumo)</option>
              </select>
            </div>
          </div>

          <div className="mb-3">
            <label className={labelCls}>Precio extra (CLP)</label>
            <input type="number" min="0" className={inputCls} value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="Ej. 1000 (0 si no cobra)" />
          </div>

          {tipo === "extra" ? (
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Insumo que consume</label>
                <select className={inputCls} value={insumoId} onChange={(e) => setInsumoId(e.target.value)}>
                  <option value="">— insumo —</option>
                  {insumos.map((i) => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Cantidad {insumoId ? `(${unidadDe(insumoId)})` : ""}</label>
                <input type="number" step="any" min="0" className={inputCls} value={cantidad} onChange={(e) => setCantidad(e.target.value)} placeholder="Ej. 30" />
              </div>
            </div>
          ) : (
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Reemplaza (quita)</label>
                <select className={inputCls} value={origenId} onChange={(e) => setOrigenId(e.target.value)}>
                  <option value="">— insumo —</option>
                  {insumos.map((i) => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Por (pone)</label>
                <select className={inputCls} value={reemplazoId} onChange={(e) => setReemplazoId(e.target.value)}>
                  <option value="">— insumo —</option>
                  {insumos.map((i) => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => { setCreando(false); limpiar(); }} className="flex-1 rounded-lg border border-frappe-border py-2.5 text-sm font-semibold text-frappe-text hover:bg-frappe-bg">Cancelar</button>
            <button onClick={crear} disabled={guardando} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-frappe-accent py-2.5 text-sm font-semibold text-white hover:bg-frappe-accentDark disabled:opacity-60">
              {guardando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Crear opción
            </button>
          </div>
        </div>
      )}

      {opciones.length === 0 ? (
        <div className="rounded-xl border border-dashed border-frappe-border bg-frappe-surface py-12 text-center text-sm text-frappe-textSoft">
          Aún no hay opciones. Crea la primera (ej. Proteína +$1.000).
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {extras.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-frappe-text"><PlusCircle size={15} /> Extras</div>
              <div className="overflow-hidden rounded-xl border border-frappe-border bg-frappe-surface">
                {extras.map((o, i) => (
                  <div key={o.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-frappe-border" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-frappe-text">{o.nombre} {o.precio > 0 && <span className="text-frappe-accentDark">+{money(o.precio)}</span>}</div>
                      <div className="text-xs text-frappe-textSoft">Consume {o.cantidad} {unidadDe(o.insumoId)} de {o.insumoNombre || "—"}</div>
                    </div>
                    <button onClick={() => borrar(o.id)} className="rounded-lg p-2 text-frappe-textSoft hover:bg-frappe-bg hover:text-frappe-danger"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {sust.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-frappe-text"><Repeat size={15} /> Sustituciones</div>
              <div className="overflow-hidden rounded-xl border border-frappe-border bg-frappe-surface">
                {sust.map((o, i) => (
                  <div key={o.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-frappe-border" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-frappe-text">{o.nombre} {o.precio > 0 && <span className="text-frappe-accentDark">+{money(o.precio)}</span>}</div>
                      <div className="text-xs text-frappe-textSoft">Cambia {o.origenNombre || "—"} → {o.reemplazoNombre || "—"}</div>
                    </div>
                    <button onClick={() => borrar(o.id)} className="rounded-lg p-2 text-frappe-textSoft hover:bg-frappe-bg hover:text-frappe-danger"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
