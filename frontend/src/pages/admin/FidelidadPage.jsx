import { useEffect, useState } from "react";
import { Loader2, Plus, Search, Star, Trash2, Gift, Percent, Coffee } from "lucide-react";
import { fidelidadApi } from "../../api/fidelidad";
import { money } from "../../utils/format";
import Modal from "../../components/Modal";

const inputCls =
  "w-full rounded-lg border border-frappe-border bg-frappe-bg px-3 py-2.5 text-sm text-frappe-text outline-none focus:border-frappe-accent";
const labelCls = "mb-1 block text-sm text-frappe-textSoft";

const TIPOS = [
  { id: "gratis", label: "Frappé gratis" },
  { id: "monto", label: "$ de descuento" },
  { id: "regalo", label: "Regalo / producto" },
];

const premioTexto = (p) =>
  p.tipo === "gratis" ? "Frappé gratis"
  : p.tipo === "monto" ? `${money(p.valor)} de descuento`
  : (p.descripcion || "Regalo");

const PremioIcon = ({ tipo }) =>
  tipo === "gratis" ? <Coffee size={14} /> : tipo === "monto" ? <Percent size={14} /> : <Gift size={14} />;

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
  const [premios, setPremios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [q, setQ] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [nuevoCli, setNuevoCli] = useState(false);
  // Alta de nivel
  const [compras, setCompras] = useState("");
  const [tipo, setTipo] = useState("gratis");
  const [valor, setValor] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [guardandoNivel, setGuardandoNivel] = useState(false);

  const cargarClientes = async (query = "") => setClientes(await fidelidadApi.listClientes(query));
  const cargarPremios = async () => setPremios(await fidelidadApi.listPremios());

  useEffect(() => {
    Promise.all([fidelidadApi.getConfig(), fidelidadApi.listPremios(), fidelidadApi.listClientes()])
      .then(([c, pr, cl]) => { setConfig(c); setPremios(pr); setClientes(cl); })
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => cargarClientes(q.trim()), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const toggleActivo = async (activo) => {
    setError("");
    try { setConfig(await fidelidadApi.setConfig({ activo })); }
    catch (err) { setError(err.response?.data?.error || "No se pudo guardar"); }
  };

  const agregarNivel = async () => {
    setError("");
    const n = Number(compras);
    if (!(n > 0)) { setError("Indica el nº de compras del nivel"); return; }
    const data = { compras: n, tipo };
    if (tipo === "monto") data.valor = Math.trunc(Number(valor)) || 0;
    if (tipo === "regalo") data.descripcion = descripcion.trim();
    setGuardandoNivel(true);
    try {
      await fidelidadApi.crearPremio(data);
      setCompras(""); setValor(""); setDescripcion(""); setTipo("gratis");
      await cargarPremios();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detalles?.map((x) => x.mensaje).join(" · ") || "No se pudo crear el nivel");
    } finally { setGuardandoNivel(false); }
  };

  const borrarNivel = async (id) => {
    if (!window.confirm("¿Eliminar este nivel de premio?")) return;
    await fidelidadApi.eliminarPremio(id);
    await cargarPremios();
  };

  if (cargando || !config) {
    return <div className="flex items-center justify-center gap-2 py-16 text-frappe-textSoft"><Loader2 size={18} className="animate-spin" /> Cargando…</div>;
  }

  return (
    <div>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="font-serif text-xl font-semibold text-frappe-text">Fidelidad</h1>
          <p className="text-sm text-frappe-textSoft">Premios por niveles de compras.</p>
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-frappe-border bg-frappe-surface px-3 py-2 text-sm">
          <input type="checkbox" checked={config.activo} onChange={(e) => toggleActivo(e.target.checked)} />
          Programa activo
        </label>
      </div>

      {error && <div className="mb-3 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">{error}</div>}

      {/* Niveles de premios */}
      <div className="mb-6 rounded-xl border border-frappe-border bg-frappe-surface p-4">
        <div className="mb-1 text-sm font-semibold text-frappe-text">Niveles de premios</div>
        <p className="mb-3 text-xs text-frappe-textSoft">
          Cada venta con cliente suma 1. Al llegar a cada nivel se aplica su premio automáticamente. Al llegar al nivel más alto, el contador se reinicia.
        </p>

        {premios.length === 0 ? (
          <div className="mb-3 rounded-lg border border-dashed border-frappe-border bg-frappe-bg py-6 text-center text-sm text-frappe-textSoft">
            Aún no hay niveles. Agrega el primero abajo (ej. 5 compras → frappé gratis).
          </div>
        ) : (
          <div className="mb-3 overflow-hidden rounded-lg border border-frappe-border">
            {premios.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? "border-t border-frappe-border" : ""} ${!p.activo ? "opacity-50" : ""}`}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-frappe-accentSoft font-bold text-frappe-accentDark">{p.compras}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-frappe-textSoft">A las {p.compras} compras</div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-frappe-text">
                    <PremioIcon tipo={p.tipo} /> {premioTexto(p)}
                  </div>
                </div>
                <button onClick={() => borrarNivel(p.id)} className="rounded-lg p-2 text-frappe-textSoft hover:bg-frappe-bg hover:text-frappe-danger"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        )}

        {/* Agregar nivel */}
        <div className="rounded-lg border border-frappe-border bg-frappe-bg/50 p-3">
          <div className="mb-2 text-sm font-semibold text-frappe-text">Agregar nivel</div>
          <div className="mb-2 grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>N° de compras</label>
              <input type="number" min="1" className={inputCls} value={compras} onChange={(e) => setCompras(e.target.value)} placeholder="Ej. 5" />
            </div>
            <div>
              <label className={labelCls}>Premio</label>
              <select className={inputCls} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          </div>
          {tipo === "monto" && (
            <div className="mb-2">
              <label className={labelCls}>Monto del descuento (CLP)</label>
              <input type="number" min="0" className={inputCls} value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ej. 1000" />
            </div>
          )}
          {tipo === "regalo" && (
            <div className="mb-2">
              <label className={labelCls}>¿Qué se regala?</label>
              <input className={inputCls} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej. un alfajor, un llavero" />
            </div>
          )}
          <button onClick={agregarNivel} disabled={guardandoNivel} className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-frappe-accent py-2 text-sm font-semibold text-white hover:bg-frappe-accentDark disabled:opacity-60">
            {guardandoNivel ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Agregar nivel
          </button>
        </div>
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
                {c.premioEnProximaCompra ? (
                  <span className="flex items-center justify-end gap-1 text-xs font-semibold text-frappe-success">
                    <Star size={11} /> premio en la próxima
                  </span>
                ) : c.proximoPremio ? (
                  <span className="text-xs text-frappe-textSoft">faltan {c.faltan} para {premioTexto(c.proximoPremio)}</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {nuevoCli && <ClienteModal onClose={() => setNuevoCli(false)} onSaved={() => { setNuevoCli(false); cargarClientes(q.trim()); }} />}
    </div>
  );
}
