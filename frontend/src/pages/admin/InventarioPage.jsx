import { useEffect, useState } from "react";
import { Loader2, ClipboardList, Plus, ChevronDown, Check } from "lucide-react";
import { insumosApi } from "../../api/insumos";
import { inventarioApi } from "../../api/inventario";

const inputCls =
  "w-full rounded-lg border border-frappe-border bg-frappe-bg px-3 py-2 text-sm text-frappe-text outline-none focus:border-frappe-accent";
const num = (n) => Number(n).toLocaleString("es-CL", { maximumFractionDigits: 3 });

export default function InventarioPage() {
  const [insumos, setInsumos] = useState([]);
  const [conteos, setConteos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  // Nuevo conteo
  const [contando, setContando] = useState(false);
  const [valores, setValores] = useState({}); // insumoId -> string
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState(null);
  // Historial expandible
  const [abierto, setAbierto] = useState(null);
  const [detalles, setDetalles] = useState({});

  const cargar = async () => {
    try {
      const [ins, cs] = await Promise.all([insumosApi.list({ activo: true }), inventarioApi.listConteos()]);
      setInsumos(ins);
      setConteos(cs);
    } catch {
      setError("No se pudieron cargar los datos");
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => { cargar(); }, []);

  const setVal = (id, v) => setValores((m) => ({ ...m, [id]: v }));

  const guardar = async () => {
    setError("");
    const items = insumos
      .filter((i) => valores[i.id] !== undefined && valores[i.id] !== "")
      .map((i) => ({ insumoId: i.id, stockContado: Number(valores[i.id]) }));
    if (items.length === 0) { setError("Anota el conteo de al menos un insumo"); return; }
    if (items.some((it) => !(it.stockContado >= 0))) { setError("Las cantidades no pueden ser negativas"); return; }
    setGuardando(true);
    try {
      const r = await inventarioApi.crearConteo(items, nota.trim() || undefined);
      setResultado(r);
      setContando(false);
      setValores({});
      setNota("");
      await cargar();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo guardar el conteo");
    } finally { setGuardando(false); }
  };

  const toggleDetalle = async (id) => {
    if (abierto === id) { setAbierto(null); return; }
    setAbierto(id);
    if (!detalles[id]) {
      setDetalles((d) => ({ ...d, [id]: "cargando" }));
      try {
        const det = await inventarioApi.conteo(id);
        setDetalles((d) => ({ ...d, [id]: det }));
      } catch {
        setDetalles((d) => ({ ...d, [id]: { error: true } }));
      }
    }
  };

  if (cargando) {
    return <div className="flex items-center justify-center gap-2 py-16 text-frappe-textSoft"><Loader2 size={18} className="animate-spin" /> Cargando…</div>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-semibold text-frappe-text">Inventario</h1>
          <p className="text-sm text-frappe-textSoft">Conteo físico (ideal cada domingo). Ajusta el stock a lo que cuentes.</p>
        </div>
        {!contando && (
          <button onClick={() => { setContando(true); setResultado(null); }} className="flex items-center gap-1.5 rounded-lg bg-frappe-accent px-3 py-2 text-sm font-semibold text-white hover:bg-frappe-accentDark">
            <Plus size={16} /> Nuevo conteo
          </button>
        )}
      </div>

      {error && <div className="mb-3 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">{error}</div>}
      {resultado && (
        <div className="mb-4 rounded-lg bg-frappe-successSoft px-3 py-2 text-sm font-medium text-frappe-success">
          ✓ Conteo guardado: {resultado.contados} insumos revisados, {resultado.ajustados} ajustados.
        </div>
      )}

      {/* Formulario de nuevo conteo */}
      {contando && (
        <div className="mb-6 rounded-xl border border-frappe-border bg-frappe-surface p-4">
          <div className="mb-1 text-sm font-semibold text-frappe-text">Nuevo conteo</div>
          <p className="mb-3 text-xs text-frappe-textSoft">Anota cuánto hay <b>realmente</b> de cada insumo. Deja en blanco los que no cuentes. Al guardar, el stock queda igual a lo contado y se registra la diferencia.</p>
          <div className="overflow-hidden rounded-lg border border-frappe-border">
            <div className="flex items-center gap-2 bg-frappe-bg px-3 py-2 text-xs font-semibold text-frappe-textSoft">
              <span className="flex-1">Insumo</span>
              <span className="w-20 text-right">Sistema</span>
              <span className="w-24 text-right">Contado</span>
              <span className="w-16 text-right">Dif.</span>
            </div>
            {insumos.map((i) => {
              const v = valores[i.id];
              const dif = v !== undefined && v !== "" ? Number(v) - i.stockActual : null;
              return (
                <div key={i.id} className="flex items-center gap-2 border-t border-frappe-border px-3 py-2 text-sm">
                  <span className="flex-1 truncate text-frappe-text">{i.nombre} <span className="text-xs text-frappe-textSoft">({i.unidad})</span></span>
                  <span className="w-20 text-right text-frappe-textSoft">{num(i.stockActual)}</span>
                  <input type="number" step="any" min="0" value={v ?? ""} onChange={(e) => setVal(i.id, e.target.value)} placeholder="—" className={`${inputCls} w-24 text-right`} />
                  <span className={`w-16 text-right text-xs font-semibold ${dif === null ? "text-frappe-textSoft" : dif === 0 ? "text-frappe-success" : "text-frappe-danger"}`}>
                    {dif === null ? "" : `${dif > 0 ? "+" : ""}${num(dif)}`}
                  </span>
                </div>
              );
            })}
          </div>
          <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota (opcional, ej. conteo domingo)" className={`${inputCls} mt-3`} />
          <div className="mt-3 flex gap-2">
            <button onClick={() => { setContando(false); setValores({}); setNota(""); }} className="flex-1 rounded-lg border border-frappe-border py-2.5 text-sm font-semibold text-frappe-text hover:bg-frappe-bg">Cancelar</button>
            <button onClick={guardar} disabled={guardando} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-frappe-accent py-2.5 text-sm font-semibold text-white hover:bg-frappe-accentDark disabled:opacity-60">
              {guardando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Guardar conteo
            </button>
          </div>
        </div>
      )}

      {/* Historial */}
      <div className="mb-2 text-sm font-semibold text-frappe-text">Conteos anteriores</div>
      {conteos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-frappe-border bg-frappe-surface py-10 text-center text-sm text-frappe-textSoft">
          Aún no hay conteos. Haz el primero con “Nuevo conteo”.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-frappe-border bg-frappe-surface">
          {conteos.map((c, i) => {
            const det = detalles[c.id];
            const open = abierto === c.id;
            return (
              <div key={c.id} className={i > 0 ? "border-t border-frappe-border" : ""}>
                <button onClick={() => toggleDetalle(c.id)} className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-frappe-bg">
                  <ChevronDown size={15} className={`shrink-0 text-frappe-textSoft transition ${open ? "rotate-180" : ""}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-frappe-text">{new Date(c.createdAt).toLocaleDateString("es-CL", { weekday: "short", day: "2-digit", month: "2-digit" })} · {new Date(c.createdAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</div>
                    <div className="text-xs text-frappe-textSoft">{c.nItems} insumos · {c.nAjustes} con diferencia{c.usuario ? ` · ${c.usuario}` : ""}{c.nota ? ` · ${c.nota}` : ""}</div>
                  </div>
                </button>
                {open && (
                  <div className="border-t border-frappe-border bg-frappe-bg/40 px-4 py-2">
                    {det === "cargando" || !det ? (
                      <div className="flex items-center gap-2 py-2 text-sm text-frappe-textSoft"><Loader2 size={14} className="animate-spin" /> Cargando…</div>
                    ) : det.error ? (
                      <div className="text-sm text-frappe-danger">No se pudo cargar el detalle.</div>
                    ) : (
                      det.items.map((it) => (
                        <div key={it.insumoId} className="flex items-center gap-2 py-1 text-sm">
                          <span className="flex-1 truncate text-frappe-text">{it.nombre}</span>
                          <span className="text-xs text-frappe-textSoft">{num(it.stockSistema)} → {num(it.stockContado)} {it.unidad}</span>
                          <span className={`w-16 text-right text-xs font-semibold ${it.diferencia === 0 ? "text-frappe-success" : "text-frappe-danger"}`}>
                            {it.diferencia > 0 ? "+" : ""}{num(it.diferencia)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
