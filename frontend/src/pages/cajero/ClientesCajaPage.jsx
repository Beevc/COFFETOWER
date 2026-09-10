import { useEffect, useState } from "react";
import { Plus, Search, Loader2, Star, User, X } from "lucide-react";
import { fidelidadApi } from "../../api/fidelidad";

const inputCls =
  "w-full rounded-lg border border-frappe-border bg-frappe-surface px-3 py-2.5 text-sm text-frappe-text outline-none focus:border-frappe-accent";

export default function ClientesCajaPage() {
  const [clientes, setClientes] = useState([]);
  const [q, setQ] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  // Alta de cliente
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = async (query) => {
    setError("");
    try {
      setClientes(await fidelidadApi.listClientes(query));
    } catch {
      setError("No se pudieron cargar los clientes");
    } finally {
      setCargando(false);
    }
  };

  // Búsqueda con debounce.
  useEffect(() => {
    const t = setTimeout(() => cargar(q.trim() || undefined), 250);
    return () => clearTimeout(t);
  }, [q]);

  const guardar = async () => {
    if (!nombre.trim()) return;
    setGuardando(true);
    setError("");
    try {
      const cli = await fidelidadApi.crearCliente({
        nombre: nombre.trim(),
        telefono: telefono.trim() || undefined,
      });
      setClientes((prev) => [cli, ...prev.filter((c) => c.id !== cli.id)]);
      setCreando(false);
      setNombre("");
      setTelefono("");
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo crear el cliente");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-lg font-semibold text-frappe-text">Clientes</h1>
          <p className="text-sm text-frappe-textSoft">Programa de fidelización.</p>
        </div>
        {!creando && (
          <button
            onClick={() => { setCreando(true); setNombre(q.trim()); }}
            className="flex items-center gap-1.5 rounded-lg bg-frappe-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-frappe-accentDark"
          >
            <Plus size={16} /> Nuevo cliente
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">
          {error}
        </div>
      )}

      {/* Formulario de alta */}
      {creando && (
        <div className="rounded-2xl border border-frappe-border bg-frappe-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-frappe-text">Nuevo cliente</span>
            <button onClick={() => { setCreando(false); setNombre(""); setTelefono(""); }} className="text-frappe-textSoft hover:text-frappe-danger">
              <X size={16} />
            </button>
          </div>
          <input className={`${inputCls} mb-2`} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" autoFocus />
          <input className={`${inputCls} mb-3`} value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono (opcional)" />
          <button
            onClick={guardar}
            disabled={guardando || !nombre.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-frappe-accent py-2.5 text-sm font-semibold text-white transition hover:bg-frappe-accentDark disabled:opacity-50"
          >
            {guardando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Crear cliente
          </button>
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-frappe-textSoft" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o teléfono"
          className="w-full rounded-lg border border-frappe-border bg-frappe-surface py-2 pl-9 pr-3 text-sm text-frappe-text outline-none focus:border-frappe-accent"
        />
      </div>

      {/* Lista */}
      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-12 text-frappe-textSoft">
          <Loader2 size={18} className="animate-spin" /> Cargando…
        </div>
      ) : clientes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-frappe-border bg-frappe-surface py-12 text-center text-sm text-frappe-textSoft">
          {q.trim() ? "Sin resultados. Usa “Nuevo cliente” para registrarlo." : "Aún no hay clientes. Crea el primero."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-frappe-border bg-frappe-surface">
          {clientes.map((c, i) => (
            <div key={c.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-frappe-border" : ""}`}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-frappe-accentSoft text-frappe-accentDark">
                <User size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-frappe-text">{c.nombre}</div>
                {c.telefono && <div className="truncate text-xs text-frappe-textSoft">{c.telefono}</div>}
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-frappe-text">{c.comprasContador} <span className="text-xs font-normal text-frappe-textSoft">compras</span></div>
                {c.beneficioDisponible && (
                  <span className="flex items-center justify-end gap-1 text-xs font-semibold text-frappe-accentDark">
                    <Star size={11} /> beneficio
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
