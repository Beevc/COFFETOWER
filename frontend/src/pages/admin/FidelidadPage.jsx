import { useEffect, useState } from "react";
import { Loader2, Save, Check, Plus, Search, Star } from "lucide-react";
import { fidelidadApi } from "../../api/fidelidad";
import Modal from "../../components/Modal";

const inputCls =
  "w-full rounded-lg border border-frappe-border bg-frappe-bg px-3 py-2.5 text-sm text-frappe-text outline-none focus:border-frappe-accent";
const labelCls = "mb-1 block text-sm text-frappe-textSoft";

function ClienteModal({ onClose, onSaved }) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  return (
    <Modal title="Nuevo cliente" onClose={onClose}>
      <form onSubmit={async (e) => {
        e.preventDefault(); setError(""); setGuardando(true);
        try { onSaved(await fidelidadApi.crearCliente({ nombre: nombre.trim(), telefono: telefono.trim() || undefined })); }
        catch (err) { setError(err.response?.data?.error || "No se pudo crear"); }
        finally { setGuardando(false); }
      }}>
        {error && <div className="mb-3 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">{error}</div>}
        <label className={labelCls}>Nombre</label>
        <input className={`${inputCls} mb-3`} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <label className={labelCls}>Teléfono (opcional)</label>
        <input className={`${inputCls} mb-4`} value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+56 9 ..." />
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-frappe-border py-2.5 text-sm font-semibold">Cancelar</button>
          <button type="submit" disabled={guardando} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-frappe-accent py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {guardando && <Loader2 size={15} className="animate-spin" />} Crear
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function FidelidadPage() {
  const [config, setConfig] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [q, setQ] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState("");
  const [nuevoCli, setNuevoCli] = useState(false);

  const cargarClientes = async (query = "") => setClientes(await fidelidadApi.listClientes(query));

  useEffect(() => {
    Promise.all([fidelidadApi.getConfig(), fidelidadApi.listClientes()])
      .then(([c, cl]) => { setConfig(c); setClientes(cl); })
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => cargarClientes(q.trim()), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const guardarConfig = async () => {
    setError(""); setGuardado(false); setGuardando(true);
    try {
      const saved = await fidelidadApi.setConfig({
        activo: config.activo,
        umbral: Number(config.umbral),
        tipoBeneficio: config.tipoBeneficio,
        valor: Number(config.valor),
      });
      setConfig(saved); setGuardado(true);
    } catch (err) { setError(err.response?.data?.error || "No se pudo guardar"); }
    finally { setGuardando(false); }
  };

  if (cargando || !config) {
    return <div className="flex items-center justify-center gap-2 py-16 text-frappe-textSoft"><Loader2 size={18} className="animate-spin" /> Cargando…</div>;
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-serif text-xl font-semibold text-frappe-text">Fidelidad</h1>
        <p className="text-sm text-frappe-textSoft">Programa de tarjetas y clientes.</p>
      </div>

      {/* Configuración del programa */}
      <div className="mb-6 rounded-xl border border-frappe-border bg-frappe-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-frappe-text">Programa de fidelidad</span>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={config.activo} onChange={(e) => setConfig({ ...config, activo: e.target.checked })} />
            Activo
          </label>
        </div>
        {error && <div className="mb-3 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Compras para el beneficio</label>
            <input type="number" min="1" className={inputCls} value={config.umbral} onChange={(e) => setConfig({ ...config, umbral: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Beneficio</label>
            <select className={inputCls} value={config.tipoBeneficio} onChange={(e) => setConfig({ ...config, tipoBeneficio: e.target.value })}>
              <option value="gratis">Siguiente gratis</option>
              <option value="porcentaje">% de descuento</option>
            </select>
          </div>
          {config.tipoBeneficio === "porcentaje" && (
            <div>
              <label className={labelCls}>Porcentaje (%)</label>
              <input type="number" min="0" max="100" className={inputCls} value={config.valor} onChange={(e) => setConfig({ ...config, valor: e.target.value })} />
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={guardarConfig} disabled={guardando} className="flex items-center gap-2 rounded-lg bg-frappe-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-frappe-accentDark disabled:opacity-60">
            {guardando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Guardar
          </button>
          {guardado && <span className="flex items-center gap-1 text-sm font-medium text-frappe-success"><Check size={15} /> Guardado</span>}
        </div>
        <p className="mt-3 text-xs text-frappe-textSoft">
          El beneficio se aplica automáticamente en el POS cuando el cliente alcanza el umbral. Cada venta suma 1 al contador.
        </p>
      </div>

      {/* Clientes */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-frappe-text">Clientes</span>
        <button onClick={() => setNuevoCli(true)} className="flex items-center gap-1.5 rounded-lg bg-frappe-accent px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-frappe-accentDark">
          <Plus size={15} /> Nuevo
        </button>
      </div>
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-frappe-textSoft" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o teléfono" className="w-full rounded-lg border border-frappe-border bg-frappe-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-frappe-accent" />
      </div>

      {clientes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-frappe-border bg-frappe-surface py-10 text-center text-sm text-frappe-textSoft">Sin clientes.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-frappe-border bg-frappe-surface">
          {clientes.map((c, i) => (
            <div key={c.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-frappe-border" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-frappe-text">{c.nombre}</div>
                <div className="truncate text-xs text-frappe-textSoft">{c.telefono || "sin teléfono"}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-frappe-text">{c.comprasContador} compras</div>
                {c.beneficioDisponible && (
                  <span className="flex items-center justify-end gap-1 text-xs font-semibold text-frappe-accentDark">
                    <Star size={11} /> beneficio listo
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {nuevoCli && <ClienteModal onClose={() => setNuevoCli(false)} onSaved={() => { setNuevoCli(false); cargarClientes(q.trim()); }} />}
    </div>
  );
}
