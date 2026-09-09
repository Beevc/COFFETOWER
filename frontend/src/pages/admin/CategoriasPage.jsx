import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Check, X, Loader2, ChevronRight } from "lucide-react";
import { categoriasApi } from "../../api/categorias";

const NIVEL_LABEL = {
  1: "categoría",
  2: "subcategoría",
  3: "con/sin café",
};

// Fila de una categoría: nombre + renombrar + borrar, y un "agregar" para su hijo.
function Nodo({ cat, hijos, onReload, setError }) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(cat.nombre);
  const [nuevoHijo, setNuevoHijo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const puedeTenerHijos = cat.nivel < 3;

  const guardarNombre = async () => {
    if (!nombre.trim() || nombre.trim() === cat.nombre) { setEditando(false); setNombre(cat.nombre); return; }
    setOcupado(true);
    try {
      await categoriasApi.update(cat.id, { nombre: nombre.trim() });
      setEditando(false);
      onReload();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo renombrar");
    } finally { setOcupado(false); }
  };

  const borrar = async () => {
    const aviso = puedeTenerHijos
      ? `¿Borrar "${cat.nombre}" y todo lo que tenga dentro? Los productos quedarán sin categoría.`
      : `¿Borrar "${cat.nombre}"? Los productos que la usen quedarán sin categoría.`;
    if (!window.confirm(aviso)) return;
    setOcupado(true);
    try {
      await categoriasApi.remove(cat.id);
      onReload();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo borrar");
    } finally { setOcupado(false); }
  };

  const agregarHijo = async () => {
    if (!nuevoHijo.trim()) return;
    setOcupado(true);
    try {
      await categoriasApi.create({ nombre: nuevoHijo.trim(), parentId: cat.id });
      setNuevoHijo("");
      onReload();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo agregar");
    } finally { setOcupado(false); }
  };

  const indent = cat.nivel === 1 ? "" : cat.nivel === 2 ? "ml-5" : "ml-10";

  return (
    <div className={indent}>
      <div className="flex items-center gap-2 py-1.5">
        <ChevronRight size={13} className="shrink-0 text-frappe-textSoft" />
        {editando ? (
          <>
            <input
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && guardarNombre()}
              className="flex-1 rounded-md border border-frappe-accent bg-frappe-bg px-2 py-1 text-sm outline-none"
            />
            <button onClick={guardarNombre} disabled={ocupado} className="rounded p-1 text-frappe-success hover:bg-frappe-bg"><Check size={15} /></button>
            <button onClick={() => { setEditando(false); setNombre(cat.nombre); }} className="rounded p-1 text-frappe-textSoft hover:bg-frappe-bg"><X size={15} /></button>
          </>
        ) : (
          <>
            <span className={`flex-1 text-sm ${cat.nivel === 1 ? "font-semibold text-frappe-text" : "text-frappe-text"} ${!cat.activo ? "line-through opacity-50" : ""}`}>
              {cat.nombre}
            </span>
            <button title="Renombrar" onClick={() => setEditando(true)} className="rounded p-1 text-frappe-textSoft hover:bg-frappe-bg hover:text-frappe-text"><Pencil size={13} /></button>
            <button title="Borrar" onClick={borrar} disabled={ocupado} className="rounded p-1 text-frappe-textSoft hover:bg-frappe-bg hover:text-frappe-danger">
              {ocupado ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            </button>
          </>
        )}
      </div>

      {/* Hijos */}
      {hijos(cat.id).map((h) => (
        <Nodo key={h.id} cat={h} hijos={hijos} onReload={onReload} setError={setError} />
      ))}

      {/* Agregar hijo */}
      {puedeTenerHijos && (
        <div className={`flex items-center gap-2 py-1 ${cat.nivel === 1 ? "ml-5" : "ml-10"}`}>
          <input
            value={nuevoHijo}
            onChange={(e) => setNuevoHijo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && agregarHijo()}
            placeholder={`+ ${NIVEL_LABEL[cat.nivel + 1]}`}
            className="w-48 rounded-md border border-dashed border-frappe-border bg-frappe-bg px-2 py-1 text-xs outline-none focus:border-frappe-accent"
          />
          {nuevoHijo.trim() && (
            <button onClick={agregarHijo} disabled={ocupado} className="rounded-md bg-frappe-accent px-2 py-1 text-xs font-semibold text-white hover:bg-frappe-accentDark">
              Agregar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function CategoriasPage() {
  const [cats, setCats] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [nuevaRaiz, setNuevaRaiz] = useState("");
  const [creando, setCreando] = useState(false);

  const cargar = async () => {
    try {
      setCats(await categoriasApi.list());
    } catch {
      setError("No se pudieron cargar las categorías");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const hijos = (parentId) => cats.filter((c) => c.parentId === parentId).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const raices = cats.filter((c) => c.parentId === null).sort((a, b) => a.nombre.localeCompare(b.nombre));

  const agregarRaiz = async () => {
    if (!nuevaRaiz.trim()) return;
    setCreando(true);
    setError("");
    try {
      await categoriasApi.create({ nombre: nuevaRaiz.trim(), parentId: null });
      setNuevaRaiz("");
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo crear la categoría");
    } finally {
      setCreando(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-serif text-xl font-semibold text-frappe-text">Categorías</h1>
        <p className="text-sm text-frappe-textSoft">
          Organiza los productos en 3 niveles: <b>Categoría</b> (ej. Bebidas Frías) ›
          <b> Subcategoría</b> (ej. Frappe) › <b>Con/Sin café</b>.
        </p>
      </div>

      {error && (
        <div className="mb-3 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">
          {error}
        </div>
      )}

      {/* Agregar categoría nivel 1 */}
      <div className="mb-4 flex items-center gap-2">
        <input
          value={nuevaRaiz}
          onChange={(e) => setNuevaRaiz(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && agregarRaiz()}
          placeholder="Nueva categoría (ej. Bebidas Frías)"
          className="flex-1 rounded-lg border border-frappe-border bg-frappe-surface px-3 py-2 text-sm outline-none focus:border-frappe-accent"
        />
        <button
          onClick={agregarRaiz}
          disabled={creando || !nuevaRaiz.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-frappe-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-frappe-accentDark disabled:opacity-50"
        >
          {creando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          Agregar
        </button>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-16 text-frappe-textSoft">
          <Loader2 size={18} className="animate-spin" /> Cargando…
        </div>
      ) : raices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-frappe-border bg-frappe-surface py-12 text-center text-sm text-frappe-textSoft">
          Aún no hay categorías. Crea la primera arriba (ej. <b>Bebidas Frías</b>).
        </div>
      ) : (
        <div className="rounded-xl border border-frappe-border bg-frappe-surface p-4">
          {raices.map((c) => (
            <Nodo key={c.id} cat={c} hijos={hijos} onReload={cargar} setError={setError} />
          ))}
        </div>
      )}
    </div>
  );
}
