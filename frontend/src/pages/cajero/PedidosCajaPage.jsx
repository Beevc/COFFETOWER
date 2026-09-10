import { useEffect, useState, useCallback } from "react";
import { Loader2, RefreshCw, Check, Gift, PackageCheck } from "lucide-react";
import { pedidosApi } from "../../api/pedidos";
import { estadoInfo } from "../../components/pedidoEstado";

const norm = (e) => (e === "preparado" ? "listo" : e);

export default function PedidosCajaPage() {
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

  const entregar = async (id) => {
    setAccionId(id);
    try {
      await pedidosApi.cambiarEstado(id, "entregado");
      await cargar();
    } finally {
      setAccionId(null);
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
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-lg font-semibold text-frappe-text">Pedidos</h1>
          <p className="text-sm text-frappe-textSoft">Estado de los frappés en tiempo real.</p>
        </div>
        <button onClick={() => cargar()} title="Actualizar" className="rounded-lg border border-frappe-border p-2 text-frappe-textSoft transition hover:bg-frappe-bg">
          <RefreshCw size={14} />
        </button>
      </div>

      {activos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-frappe-border bg-frappe-surface py-12 text-center text-sm text-frappe-textSoft">
          No hay pedidos en curso. 🎉
        </div>
      ) : (
        activos.map((p) => {
          const estado = norm(p.estado);
          const e = estadoInfo(estado);
          const esListo = estado === "listo";
          return (
            <div key={p.id} className="rounded-2xl border border-frappe-border bg-frappe-surface p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-frappe-textSoft">#{p.ventaNumero}</span>
                {p.nombreCliente && (
                  <span className="rounded-full bg-frappe-accent px-2.5 py-0.5 text-xs font-bold text-white">{p.nombreCliente}</span>
                )}
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${e.cls}`}>{e.label}</span>
                {p.esConvenio && (
                  <span className="flex items-center gap-1 rounded-full bg-frappe-accentSoft px-2 py-0.5 text-xs font-semibold text-frappe-accentDark">
                    <Gift size={10} /> convenio
                  </span>
                )}
              </div>
              <div className="mb-3 text-sm text-frappe-text">
                {p.items.map((it, i) => (
                  <span key={i}>
                    <span className="font-bold text-frappe-accentDark">{it.cantidad}×</span> {it.nombre}
                    {i < p.items.length - 1 ? " · " : ""}
                  </span>
                ))}
              </div>
              {esListo ? (
                <button onClick={() => entregar(p.id)} disabled={accionId === p.id}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-frappe-success py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
                  {accionId === p.id ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={16} />} Marcar entregado
                </button>
              ) : (
                <div className="rounded-lg bg-frappe-bg py-2 text-center text-xs text-frappe-textSoft">
                  {estado === "pendiente" ? "Esperando que el barista lo tome" : "El barista lo está preparando"}
                </div>
              )}
            </div>
          );
        })
      )}

      {hoy.length > 0 && (
        <>
          <h2 className="mt-4 font-serif text-base font-semibold text-frappe-text">Entregados hoy</h2>
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
    </div>
  );
}
