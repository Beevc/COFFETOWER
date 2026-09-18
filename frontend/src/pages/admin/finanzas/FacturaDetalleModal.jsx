import { useEffect, useState } from "react";
import { Loader2, Trash2, Plus, CalendarClock, CalendarDays } from "lucide-react";
import Modal from "../../../components/Modal";
import { finanzasApi } from "../../../api/finanzas";
import { money } from "../../../utils/format";
import {
  MEDIOS, FRECUENCIAS, catLabel, medioLabel,
  ESTADO_FACTURA, ESTADO_CUOTA, hoyISO, construirCuotas,
} from "./constants";

const inputCls =
  "w-full rounded-lg border border-frappe-border bg-frappe-bg px-2.5 py-2 text-sm text-frappe-text outline-none focus:border-frappe-accent";

function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between py-1 text-sm ${bold ? "font-bold" : ""}`}>
      <span className={bold ? "text-frappe-text" : "text-frappe-textSoft"}>{label}</span>
      <span className={bold ? "text-frappe-text" : "text-frappe-text"}>{value}</span>
    </div>
  );
}

export default function FacturaDetalleModal({ facturaId, onClose, onChanged }) {
  const [f, setF] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  // Nuevo pago
  const [monto, setMonto] = useState("");
  const [medioPago, setMedioPago] = useState("efectivo");
  const [fecha, setFecha] = useState(hoyISO());
  const [guardando, setGuardando] = useState(false);
  // Cuotas
  const [medioCuota, setMedioCuota] = useState("efectivo");
  const [pagandoCuota, setPagandoCuota] = useState(null);
  // Crear plan de cuotas (para facturas sin plan)
  const [mostrarPlan, setMostrarPlan] = useState(false);
  const [nCuotas, setNCuotas] = useState(3);
  const [primeraCuota, setPrimeraCuota] = useState(hoyISO());
  const [frecuencia, setFrecuencia] = useState("mensual");
  const [guardandoPlan, setGuardandoPlan] = useState(false);

  const cargar = async () => {
    try {
      const data = await finanzasApi.factura(facturaId);
      setF(data);
      setMonto(String(data.saldo || ""));
    } catch {
      setError("No se pudo cargar la factura");
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [facturaId]);

  const abonar = async () => {
    const m = Math.trunc(Number(monto));
    if (!(m > 0)) { setError("El monto debe ser mayor a 0"); return; }
    setError("");
    setGuardando(true);
    try {
      const upd = await finanzasApi.agregarPago(facturaId, { monto: m, medioPago, fecha });
      setF((prev) => ({ ...upd, items: prev.items, pagos: prev.pagos }));
      await cargar();
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo registrar el pago");
    } finally {
      setGuardando(false);
    }
  };

  const pagarCuota = async (cuotaId) => {
    setError("");
    setPagandoCuota(cuotaId);
    try {
      await finanzasApi.pagarCuota(facturaId, cuotaId, { medioPago: medioCuota, fecha: hoyISO() });
      await cargar();
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo pagar la cuota");
    } finally {
      setPagandoCuota(null);
    }
  };

  const crearPlan = async () => {
    const total = Number(f.saldo) + Number(f.pagado); // = montoTotal
    if (!(nCuotas >= 1)) { setError("El N° de cuotas debe ser al menos 1"); return; }
    if (!primeraCuota) { setError("Elige la fecha de la primera cuota"); return; }
    setError("");
    setGuardandoPlan(true);
    try {
      const cuotas = construirCuotas(Math.trunc(total), nCuotas, primeraCuota, frecuencia);
      await finanzasApi.generarCuotas(facturaId, cuotas);
      setMostrarPlan(false);
      await cargar();
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo crear el plan de cuotas");
    } finally {
      setGuardandoPlan(false);
    }
  };

  const borrarPago = async (id) => {
    if (!window.confirm("¿Eliminar este pago?")) return;
    await finanzasApi.eliminarPago(id);
    await cargar();
    onChanged?.();
  };

  const borrarFactura = async () => {
    if (!window.confirm("¿Eliminar la factura? Si tenía insumos, se descontará ese stock. No se puede deshacer.")) return;
    await finanzasApi.eliminarFactura(facturaId);
    onChanged?.();
    onClose();
  };

  return (
    <Modal title={cargando ? "Factura" : `Factura${f?.numero ? " N° " + f.numero : ` #${facturaId}`}`} onClose={onClose}>
      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-10 text-frappe-textSoft"><Loader2 size={18} className="animate-spin" /> Cargando…</div>
      ) : !f ? (
        <div className="text-sm text-frappe-danger">{error || "No encontrada"}</div>
      ) : (
        <>
          {error && <div className="mb-3 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">{error}</div>}

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADO_FACTURA[f.estado]?.cls}`}>{ESTADO_FACTURA[f.estado]?.label}</span>
            <span className="rounded-full bg-frappe-bg px-2.5 py-0.5 text-xs font-semibold text-frappe-textSoft">{catLabel(f.categoria)}</span>
            {f.vencida && (
              <span className="flex items-center gap-1 rounded-full bg-frappe-dangerSoft px-2 py-0.5 text-xs font-semibold text-frappe-danger">
                <CalendarClock size={11} /> Vencida
              </span>
            )}
          </div>

          <div className="mb-3 rounded-xl border border-frappe-border bg-frappe-surface px-3 py-2">
            {f.proveedorNombre && <Row label="Proveedor" value={f.proveedorNombre} />}
            {f.descripcion && <Row label="Descripción" value={f.descripcion} />}
            <Row label="Emisión" value={String(f.fechaEmision).slice(0, 10)} />
            {f.fechaVencimiento && <Row label="Vencimiento" value={String(f.fechaVencimiento).slice(0, 10)} />}
            <div className="my-1 border-t border-frappe-border" />
            <Row label="Monto total" value={money(f.montoTotal)} />
            <Row label="Pagado" value={money(f.pagado)} />
            <Row label="Saldo" value={money(f.saldo)} bold />
          </div>

          {f.items?.length > 0 && (
            <div className="mb-3">
              <div className="mb-1 text-xs font-semibold text-frappe-textSoft">Insumos ingresados al stock</div>
              <div className="rounded-lg border border-frappe-border bg-frappe-surface px-3 py-1.5">
                {f.items.map((it) => (
                  <div key={it.id} className="flex justify-between py-0.5 text-sm text-frappe-text">
                    <span>{it.nombre}</span>
                    <span className="font-semibold">+{it.cantidad} {it.unidad}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cuotas */}
          {f.cuotas?.length > 0 && (
            <div className="mb-3">
              <div className="mb-1 flex items-center justify-between">
                <div className="text-xs font-semibold text-frappe-textSoft">
                  Plan de cuotas ({f.cuotasPagadas}/{f.cuotasTotal} pagadas)
                </div>
                <select className="rounded-lg border border-frappe-border bg-frappe-bg px-2 py-1 text-xs text-frappe-text outline-none focus:border-frappe-accent"
                  value={medioCuota} onChange={(e) => setMedioCuota(e.target.value)}>
                  {MEDIOS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
              <div className="rounded-lg border border-frappe-border bg-frappe-surface">
                {f.cuotas.map((c, i) => (
                  <div key={c.id} className={`flex items-center gap-2 px-3 py-2 text-sm ${i > 0 ? "border-t border-frappe-border" : ""}`}>
                    <span className="w-6 shrink-0 font-semibold text-frappe-text">#{c.numero}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-frappe-text">{money(c.monto)}</div>
                      <div className="text-xs text-frappe-textSoft">vence {String(c.fechaVencimiento).slice(0, 10)}</div>
                    </div>
                    {c.estado === "pagada" ? (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${ESTADO_CUOTA.pagada.cls}`}>{ESTADO_CUOTA.pagada.label}</span>
                    ) : (
                      <button onClick={() => pagarCuota(c.id)} disabled={pagandoCuota === c.id}
                        className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60 ${c.estado === "vencida" ? "bg-frappe-danger hover:opacity-90" : "bg-frappe-accent hover:bg-frappe-accentDark"}`}>
                        {pagandoCuota === c.id ? <Loader2 size={12} className="animate-spin" /> : null}
                        Pagar{c.estado === "vencida" ? " (vencida)" : ""}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Crear plan de cuotas (si no tiene) */}
          {f.cuotas?.length === 0 && f.saldo > 0 && (
            <div className="mb-3">
              {!mostrarPlan ? (
                <button onClick={() => setMostrarPlan(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-frappe-border py-2 text-sm font-medium text-frappe-textSoft hover:border-frappe-accent hover:text-frappe-accentDark">
                  <CalendarDays size={15} /> Dividir en cuotas
                </button>
              ) : (
                <div className="rounded-lg border border-frappe-border bg-frappe-bg/50 p-3">
                  <div className="mb-2 text-sm font-semibold text-frappe-text">Nuevo plan de cuotas</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs text-frappe-textSoft">N° de cuotas</label>
                      <input type="number" min="1" max="60" step="1" inputMode="numeric" className={inputCls}
                        value={nCuotas} onChange={(e) => setNCuotas(Math.max(1, Math.trunc(Number(e.target.value)) || 1))} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-frappe-textSoft">Frecuencia</label>
                      <select className={inputCls} value={frecuencia} onChange={(e) => setFrecuencia(e.target.value)}>
                        {FRECUENCIAS.map((fr) => <option key={fr.id} value={fr.id}>{fr.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="mb-1 block text-xs text-frappe-textSoft">Fecha de la 1ª cuota</label>
                    <input type="date" className={`${inputCls} block min-w-0 appearance-none`} value={primeraCuota} onChange={(e) => setPrimeraCuota(e.target.value)} />
                  </div>
                  <div className="mt-3 rounded-lg border border-frappe-border bg-frappe-surface">
                    {construirCuotas(Math.trunc(Number(f.saldo) + Number(f.pagado)), nCuotas, primeraCuota, frecuencia).map((c, i) => (
                      <div key={i} className={`flex items-center justify-between px-3 py-1.5 text-sm ${i > 0 ? "border-t border-frappe-border" : ""}`}>
                        <span className="text-frappe-textSoft">Cuota {i + 1} · vence {c.fechaVencimiento}</span>
                        <span className="font-semibold text-frappe-text">{money(c.monto)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => setMostrarPlan(false)} className="flex-1 rounded-lg border border-frappe-border py-2 text-sm font-semibold text-frappe-text hover:bg-frappe-bg">Cancelar</button>
                    <button onClick={crearPlan} disabled={guardandoPlan} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-frappe-accent py-2 text-sm font-semibold text-white hover:bg-frappe-accentDark disabled:opacity-60">
                      {guardandoPlan && <Loader2 size={14} className="animate-spin" />} Crear plan
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pagos */}
          <div className="mb-2 text-xs font-semibold text-frappe-textSoft">Pagos / abonos</div>
          <div className="mb-3 rounded-lg border border-frappe-border bg-frappe-surface">
            {f.pagos?.length ? f.pagos.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-2 px-3 py-2 text-sm ${i > 0 ? "border-t border-frappe-border" : ""}`}>
                <span className="text-frappe-textSoft">{String(p.fecha).slice(0, 10)}</span>
                <span className="flex-1 text-frappe-textSoft">{medioLabel(p.medioPago)}</span>
                <span className="font-semibold text-frappe-text">{money(p.monto)}</span>
                <button onClick={() => borrarPago(p.id)} className="rounded p-1 text-frappe-textSoft hover:text-frappe-danger"><Trash2 size={13} /></button>
              </div>
            )) : <div className="px-3 py-2 text-sm text-frappe-textSoft">Sin pagos aún.</div>}
          </div>

          {/* Nuevo abono (solo cuando no hay plan de cuotas) */}
          {f.saldo > 0 && !(f.cuotasTotal > 0) && (
            <div className="mb-4 rounded-lg border border-frappe-border bg-frappe-bg/50 p-3">
              <div className="mb-2 text-sm font-semibold text-frappe-text">Registrar pago</div>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input type="number" min="0" step="1" inputMode="numeric" className={`${inputCls} flex-1`} value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Monto" />
                  <select className={`${inputCls} w-32 shrink-0`} value={medioPago} onChange={(e) => setMedioPago(e.target.value)}>
                    {MEDIOS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </div>
                <input type="date" className={`${inputCls} block min-w-0 appearance-none`} value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <button onClick={abonar} disabled={guardando} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-frappe-accent py-2 text-sm font-semibold text-white hover:bg-frappe-accentDark disabled:opacity-60">
                {guardando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Registrar pago
              </button>
            </div>
          )}

          <button onClick={borrarFactura} className="flex w-full items-center justify-center gap-2 rounded-lg border border-frappe-danger py-2 text-sm font-semibold text-frappe-danger hover:bg-frappe-dangerSoft">
            <Trash2 size={15} /> Eliminar factura
          </button>
        </>
      )}
    </Modal>
  );
}
