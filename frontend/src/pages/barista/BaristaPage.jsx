import { useEffect, useState, useCallback } from "react";
import { Coffee, LogOut, Check, Loader2, Clock, Zap, Timer, RefreshCw, Gift } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { pedidosApi } from "../../api/pedidos";

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

export default function BaristaPage() {
  const { usuario, logout } = useAuth();
  const [pendientes, setPendientes] = useState([]);
  const [hoy, setHoy] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [preparandoId, setPreparandoId] = useState(null);

  const cargar = useCallback(async () => {
    const [p, h] = await Promise.all([pedidosApi.pendientes(), pedidosApi.preparadosHoy()]);
    setPendientes(p);
    setHoy(h);
  }, []);

  useEffect(() => {
    cargar().finally(() => setCargando(false));
    const t = setInterval(cargar, 15000); // auto-refresh
    return () => clearInterval(t);
  }, [cargar]);

  const marcar = async (id) => {
    setPreparandoId(id);
    try {
      await pedidosApi.preparar(id);
      await cargar();
    } finally {
      setPreparandoId(null);
    }
  };

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
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-frappe-text">Por preparar</h2>
              <span className="rounded-full bg-frappe-accent px-2.5 py-0.5 text-xs font-semibold text-white">{pendientes.length}</span>
            </div>

            {pendientes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-frappe-border bg-frappe-surface py-14 text-center text-sm text-frappe-textSoft">
                No hay pedidos pendientes. 🎉
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {pendientes.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-frappe-border bg-frappe-surface p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-frappe-textSoft">#{p.ventaNumero}</span>
                        <MomentoBadge momento={p.momento} hora={p.horaProgramada} />
                        {p.esConvenio && (
                          <span className="flex items-center gap-1 rounded-full bg-frappe-accentSoft px-2 py-0.5 text-xs font-semibold text-frappe-accentDark">
                            <Gift size={10} /> convenio
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mb-3">
                      {p.items.map((it, i) => (
                        <div key={i} className="text-sm text-frappe-text">
                          <span className="font-bold text-frappe-accentDark">{it.cantidad}×</span> {it.nombre}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => marcar(p.id)}
                      disabled={preparandoId === p.id}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-frappe-success py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                    >
                      {preparandoId === p.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      Marcar preparado
                    </button>
                  </div>
                ))}
              </div>
            )}

            {hoy.length > 0 && (
              <>
                <h2 className="mb-3 mt-8 font-serif text-lg font-semibold text-frappe-text">Preparados hoy</h2>
                <div className="overflow-hidden rounded-xl border border-frappe-border bg-frappe-surface">
                  {hoy.map((p, i) => (
                    <div key={p.id} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${i > 0 ? "border-t border-frappe-border" : ""}`}>
                      <Check size={14} className="text-frappe-success" />
                      <span className="font-mono text-frappe-textSoft">#{p.ventaNumero}</span>
                      <span className="flex-1 truncate text-frappe-textSoft">
                        {p.items.map((it) => `${it.cantidad}× ${it.nombre}`).join(", ")}
                      </span>
                      <span className="text-xs text-frappe-textSoft">
                        {p.preparadoEn ? new Date(p.preparadoEn).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }) : ""}
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
