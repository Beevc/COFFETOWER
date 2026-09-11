import { useEffect, useState } from "react";
import { Loader2, Trash2, Plus, CalendarClock } from "lucide-react";
import Modal from "../../../components/Modal";
import { finanzasApi } from "../../../api/finanzas";
import { money } from "../../../utils/format";
import { MEDIOS, catLabel, medioLabel, ESTADO_FACTURA, hoyISO } from "./constants";

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

          {/* Nuevo abono */}
          {f.saldo > 0 && (
            <div className="mb-4 rounded-lg border border-frappe-border bg-frappe-bg/50 p-3">
              <div className="mb-2 text-sm font-semibold text-frappe-text">Registrar pago</div>
              <div className="grid grid-cols-3 gap-2">
                <input type="number" min="0" step="1" className={inputCls} value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Monto" />
                <select className={inputCls} value={medioPago} onChange={(e) => setMedioPago(e.target.value)}>
                  {MEDIOS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
                <input type="date" className={inputCls} value={fecha} onChange={(e) => setFecha(e.target.value)} />
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
