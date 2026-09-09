import { useEffect, useState } from "react";
import { Loader2, Lock, Unlock } from "lucide-react";
import { cajaApi } from "../../api/caja";
import { ventasApi } from "../../api/ventas";
import { money } from "../../utils/format";

const MEDIO_LABEL = {
  efectivo: "Efectivo",
  debito: "Débito",
  credito: "Crédito",
  transferencia: "Transferencia",
};

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-frappe-border bg-frappe-surface px-3 py-2.5">
      <div className="text-xs text-frappe-textSoft">{label}</div>
      <div className="text-lg font-bold text-frappe-text">{value}</div>
    </div>
  );
}

// Vista de monitoreo en remoto (solo lectura) del estado de caja y ventas.
export default function VentasPage() {
  const [turno, setTurno] = useState(null);
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([cajaApi.estado(), ventasApi.listar()])
      .then(([t, v]) => {
        setTurno(t);
        setVentas(v);
      })
      .finally(() => setCargando(false));
  }, []);

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-frappe-textSoft">
        <Loader2 size={18} className="animate-spin" /> Cargando…
      </div>
    );
  }

  const t = turno?.totales || { total: 0, efectivo: 0, n_ventas: 0 };
  const tarjeta = t.total - t.efectivo;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-semibold text-frappe-text">Ventas y caja</h1>
          <p className="text-sm text-frappe-textSoft">Estado del turno actual (en vivo).</p>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            turno
              ? "bg-frappe-successSoft text-frappe-success"
              : "bg-frappe-dangerSoft text-frappe-danger"
          }`}
        >
          {turno ? <Unlock size={12} /> : <Lock size={12} />}
          {turno ? "Caja abierta" : "Caja cerrada"}
        </span>
      </div>

      {!turno ? (
        <div className="rounded-xl border border-dashed border-frappe-border bg-frappe-surface py-16 text-center text-sm text-frappe-textSoft">
          No hay una caja abierta en este momento.
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Total del turno" value={money(t.total)} />
            <Metric label="N° de ventas" value={t.n_ventas} />
            <Metric label="Efectivo" value={money(t.efectivo)} />
            <Metric label="Tarjeta/transf." value={money(tarjeta)} />
          </div>
          <div className="mb-2 text-sm text-frappe-textSoft">
            Cajero: <b className="text-frappe-text">{turno.cajeroNombre}</b> · Inicial{" "}
            {money(turno.montoInicial)}
          </div>

          <div className="overflow-hidden rounded-xl border border-frappe-border bg-frappe-surface">
            {ventas.length === 0 ? (
              <div className="py-10 text-center text-sm text-frappe-textSoft">
                Aún no hay ventas en este turno.
              </div>
            ) : (
              ventas.map((v, i) => (
                <div
                  key={v.id}
                  className={`flex items-center gap-3 px-4 py-3 text-sm ${
                    i > 0 ? "border-t border-frappe-border" : ""
                  } ${v.estado === "anulada" ? "opacity-50" : ""}`}
                >
                  <span className="w-10 font-mono text-frappe-textSoft">#{v.numero}</span>
                  <span className="flex-1 text-frappe-textSoft">
                    {MEDIO_LABEL[v.medioPago] || v.medioPago}
                  </span>
                  {v.estado === "anulada" && (
                    <span className="text-xs font-semibold text-frappe-danger">ANULADA</span>
                  )}
                  <span
                    className={`w-20 text-right font-bold ${
                      v.estado === "anulada"
                        ? "text-frappe-textSoft line-through"
                        : "text-frappe-text"
                    }`}
                  >
                    {money(v.total)}
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
