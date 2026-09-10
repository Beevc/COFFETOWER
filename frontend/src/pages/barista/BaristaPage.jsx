import { useEffect, useState, useCallback } from "react";
import { Coffee, LogOut, Check, Loader2, Clock, Zap, Timer, RefreshCw, Gift, Play, BookOpen, ChevronDown } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { pedidosApi } from "../../api/pedidos";
import { recetasApi } from "../../api/recetas";
import { estadoInfo } from "../../components/pedidoEstado";

const MOMENTO = {
  al_momento: { label: "Al momento", icon: Zap, cls: "bg-frappe-successSoft text-frappe-success" },
  despues: { label: "Después", icon: Timer, cls: "bg-frappe-accentSoft text-frappe-accentDark" },
  programado: { label: "Programado", icon: Clock, cls: "bg-frappe-dangerSoft text-frappe-danger" },
};

function MomentoBadge({ momento, hora }) {
  const m = MOMENTO[momento] || MOMENTO.al_momento;
  const Icon = m.icon;
  return (
    <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.cls}`}>
      <Icon size={11} />
      {m.label}{momento === "programado" && hora ? ` ${hora.slice(0, 5)}` : ""}
    </span>
  );
}

function EstadoBadge({ estado }) {
  const e = estadoInfo(estado);
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${e.cls}`}>{e.label}</span>;
}

// Muestra la receta de un producto (se carga al abrir, se cachea entre aperturas).
function VerReceta({ productoId }) {
  const [abierto, setAbierto] = useState(false);
  const [receta, setReceta] = useState(null);
  const [cargando, setCargando] = useState(false);

  const toggle = async () => {
    const nuevo = !abierto;
    setAbierto(nuevo);
    if (nuevo && !receta && productoId) {
      setCargando(true);
      try {
        const data = await recetasApi.get(productoId);
        setReceta(data.items || []);
      } catch {
        setReceta([]);
      } finally {
        setCargando(false);
      }
    }
  };

  if (!productoId) return null;

  return (
    <div>
      <button onClick={toggle} className="mt-0.5 flex items-center gap-1 text-xs font-medium text-frappe-accentDark">
        <BookOpen size={11} /> Receta <ChevronDown size={11} className={`transition ${abierto ? "rotate-180" : ""}`} />
      </button>
      {abierto && (
        <div className="mt-1 rounded-lg bg-frappe-bg px-3 py-2 text-xs">
          {cargando ? (
            <span className="text-frappe-textSoft">Cargando…</span>
          ) : receta && receta.length > 0 ? (
            receta.map((r) => (
              <div key={r.insumoId} className="flex justify-between py-0.5 text-frappe-text">
                <span>{r.nombre}</span>
                <span className="font-semibold">{r.cantidad} {r.unidadReceta || r.unidad}</span>
              </div>
            ))
          ) : (
            <span className="text-frappe-textSoft">Sin receta definida.</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function BaristaPage() {
  const { usuario, logout } = useAuth();
  const [activos, setActivos] = useState([]);
  const [hoy, setHoy] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [accionId, setAccionId] = useState(null);

  const cargar = useCallback(async () => {
    const [a, h] = await Promise.all([pedidosApi.activos(), pedidosApi.entregadosHoy()]);
    setActivos(a);
    setHoy(h);
  }, []);

  useEffect(() => {
    cargar().finally(() => setCargando(false));
    const t = setInterval(cargar, 15000);
    return () => clearInterval(t);
  }, [cargar]);

  const avanzar = async (id, estado) => {
    setAccionId(id);
    try {
      await pedidosApi.cambiarEstado(id, estado);
      await cargar();
    } finally {
      setAccionId(null);
    }
  };

  // Solo interesan al barista los que aún no están entregados; los agrupamos por estado.
  const norm = (e) => (e === "preparado" ? "listo" : e);
  const enEspera = activos.filter((p) => norm(p.estado) === "pendiente");
  const enPrep = activos.filter((p) => norm(p.estado) === "en_preparacion");
  const listos = activos.filter((p) => norm(p.estado) === "listo");

  const Tarjeta = ({ p }) => {
    const estado = norm(p.estado);
    return (
      <div className="rounded-2xl border border-frappe-border bg-frappe-surface p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-frappe-textSoft">#{p.ventaNumero}</span>
          {p.nombreCliente && (
            <span className="rounded-full bg-frappe-accent px-2.5 py-0.5 text-xs font-bold text-white">{p.nombreCliente}</span>
          )}
          <MomentoBadge momento={p.momento} hora={p.horaProgramada} />
          <EstadoBadge estado={estado} />
          {p.esConvenio && (
            <span className="flex items-center gap-1 rounded-full bg-frappe-accentSoft px-2 py-0.5 text-xs font-semibold text-frappe-accentDark">
              <Gift size={10} /> convenio
            </span>
          )}
        </div>
        <div className="mb-3 space-y-1">
          {p.items.map((it, i) => (
            <div key={i}>
              <div className="text-sm text-frappe-text">
                <span className="font-bold text-frappe-accentDark">{it.cantidad}×</span> {it.nombre}
              </div>
              <VerReceta productoId={it.productoId} />
            </div>
          ))}
        </div>
        {estado === "pendiente" && (
          <button onClick={() => avanzar(p.id, "en_preparacion")} disabled={accionId === p.id}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-frappe-accent py-2.5 text-sm font-semibold text-white transition hover:bg-frappe-accentDark disabled:opacity-60">
            {accionId === p.id ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Empezar
          </button>
        )}
        {estado === "en_preparacion" && (
          <button onClick={() => avanzar(p.id, "listo")} disabled={accionId === p.id}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-frappe-success py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
            {accionId === p.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Marcar listo
          </button>
        )}
        {estado === "listo" && (
          <div className="rounded-lg bg-frappe-successSoft py-2 text-center text-sm font-semibold text-frappe-success">
            Listo — esperando entrega en caja
          </div>
        )}
      </div>
    );
  };

  const Seccion = ({ titulo, lista, color }) => (
    <>
      <div className="mb-3 mt-6 flex items-center justify-between first:mt-0">
        <h2 className="font-serif text-lg font-semibold text-frappe-text">{titulo}</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>{lista.length}</span>
      </div>
      {lista.length === 0 ? (
        <div className="rounded-xl border border-dashed border-frappe-border bg-frappe-surface py-6 text-center text-xs text-frappe-textSoft">
          Nada aquí.
        </div>
      ) : (
        <div className="flex flex-col gap-3">{lista.map((p) => <Tarjeta key={p.id} p={p} />)}</div>
      )}
    </>
  );

  return (
    <div className="min-h-full bg-frappe-bg">
      <header className="flex items-center justify-between border-b border-frappe-border bg-frappe-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-frappe-accent text-white">
            <Coffee size={16} />
          </div>
          <div>
            <div className="font-serif text-base font-semibold leading-tight text-frappe-text">Pedidos</div>
            <div className="text-xs text-frappe-textSoft">{usuario?.nombre}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => cargar()} title="Actualizar" className="rounded-lg border border-frappe-border p-2 text-frappe-textSoft transition hover:bg-frappe-bg">
            <RefreshCw size={14} />
          </button>
          <button onClick={logout} className="flex items-center gap-1.5 rounded-lg border border-frappe-border px-2.5 py-1.5 text-sm font-medium text-frappe-text transition hover:bg-frappe-bg">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">
        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-16 text-frappe-textSoft">
            <Loader2 size={18} className="animate-spin" /> Cargando…
          </div>
        ) : (
          <>
            <Seccion titulo="En espera" lista={enEspera} color="bg-frappe-danger text-white" />
            <Seccion titulo="En preparación" lista={enPrep} color="bg-frappe-accent text-white" />
            <Seccion titulo="Listos (por entregar)" lista={listos} color="bg-frappe-success text-white" />

            {hoy.length > 0 && (
              <>
                <h2 className="mb-3 mt-8 font-serif text-lg font-semibold text-frappe-text">Entregados hoy</h2>
                <div className="overflow-hidden rounded-xl border border-frappe-border bg-frappe-surface">
                  {hoy.map((p, i) => (
                    <div key={p.id} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${i > 0 ? "border-t border-frappe-border" : ""}`}>
                      <Check size={14} className="text-frappe-success" />
                      <span className="font-mono text-frappe-textSoft">#{p.ventaNumero}</span>
                      {p.nombreCliente && <span className="font-semibold text-frappe-text">{p.nombreCliente}</span>}
                      <span className="flex-1 truncate text-frappe-textSoft">
                        {p.items.map((it) => `${it.cantidad}× ${it.nombre}`).join(", ")}
                      </span>
                      <span className="text-xs text-frappe-textSoft">
                        {p.entregadoEn ? new Date(p.entregadoEn).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
