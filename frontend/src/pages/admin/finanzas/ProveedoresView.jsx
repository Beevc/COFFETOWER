import { useState } from "react";
import { Plus, Loader2, Pencil, Check, X } from "lucide-react";
import { finanzasApi } from "../../../api/finanzas";
import { money } from "../../../utils/format";

const inputCls =
  "w-full rounded-lg border border-frappe-border bg-frappe-surface px-3 py-2 text-sm outline-none focus:border-frappe-accent";

export default function ProveedoresView({ proveedores, onChanged }) {
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [contacto, setContacto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState(null);
  const [editNombre, setEditNombre] = useState("");

  const crear = async () => {
    if (!nombre.trim()) return;
    setGuardando(true);
    setError("");
    try {
      await finanzasApi.crearProveedor({ nombre: nombre.trim(), contacto: contacto.trim() || undefined });
      setNombre(""); setContacto(""); setCreando(false);
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo crear");
    } finally {
      setGuardando(false);
    }
  };

  const guardarNombre = async (p) => {
    if (!editNombre.trim() || editNombre.trim() === p.nombre) { setEditId(null); return; }
    try {
      await finanzasApi.actualizarProveedor(p.id, { nombre: editNombre.trim() });
      setEditId(null);
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo renombrar");
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-frappe-textSoft">Deuda pendiente por proveedor.</p>
        {!creando && (
          <button onClick={() => setCreando(true)} className="flex items-center gap-1.5 rounded-lg bg-frappe-accent px-3 py-2 text-sm font-semibold text-white hover:bg-frappe-accentDark">
            <Plus size={16} /> Nuevo proveedor
          </button>
        )}
      </div>

      {error && <div className="mb-3 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">{error}</div>}

      {creando && (
        <div className="mb-3 rounded-xl border border-frappe-border bg-frappe-surface p-3">
          <input className={`${inputCls} mb-2`} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del proveedor" autoFocus />
          <input className={`${inputCls} mb-2`} value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Contacto (teléfono/email, opcional)" />
          <div className="flex gap-2">
            <button onClick={() => { setCreando(false); setNombre(""); setContacto(""); }} className="flex-1 rounded-lg border border-frappe-border py-2 text-sm font-semibold text-frappe-text hover:bg-frappe-bg">Cancelar</button>
            <button onClick={crear} disabled={guardando || !nombre.trim()} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-frappe-accent py-2 text-sm font-semibold text-white hover:bg-frappe-accentDark disabled:opacity-50">
              {guardando && <Loader2 size={15} className="animate-spin" />} Crear
            </button>
          </div>
        </div>
      )}

      {proveedores.length === 0 ? (
        <div className="rounded-xl border border-dashed border-frappe-border bg-frappe-surface py-12 text-center text-sm text-frappe-textSoft">
          Aún no hay proveedores.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-frappe-border bg-frappe-surface">
          {proveedores.map((p, i) => (
            <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-frappe-border" : ""}`}>
              <div className="min-w-0 flex-1">
                {editId === p.id ? (
                  <div className="flex items-center gap-2">
                    <input autoFocus value={editNombre} onChange={(e) => setEditNombre(e.target.value)} onKeyDown={(e) => e.key === "Enter" && guardarNombre(p)}
                      className="flex-1 rounded-md border border-frappe-accent bg-frappe-bg px-2 py-1 text-sm outline-none" />
                    <button onClick={() => guardarNombre(p)} className="rounded p-1 text-frappe-success hover:bg-frappe-bg"><Check size={15} /></button>
                    <button onClick={() => setEditId(null)} className="rounded p-1 text-frappe-textSoft hover:bg-frappe-bg"><X size={15} /></button>
                  </div>
                ) : (
                  <>
                    <div className="truncate text-sm font-semibold text-frappe-text">{p.nombre}</div>
                    {p.contacto && <div className="truncate text-xs text-frappe-textSoft">{p.contacto}</div>}
                  </>
                )}
              </div>
              {editId !== p.id && (
                <>
                  <div className="text-right">
                    {p.deuda > 0 ? (
                      <div className="text-sm font-bold text-frappe-danger">debe {money(p.deuda)}</div>
                    ) : (
                      <div className="text-xs text-frappe-success">al día</div>
                    )}
                  </div>
                  <button onClick={() => { setEditId(p.id); setEditNombre(p.nombre); }} className="rounded-lg p-2 text-frappe-textSoft hover:bg-frappe-bg hover:text-frappe-text"><Pencil size={15} /></button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
