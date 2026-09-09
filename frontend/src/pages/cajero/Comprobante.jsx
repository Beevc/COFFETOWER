import { useState } from "react";
import { Check, Ban, Loader2 } from "lucide-react";
import { money } from "../../utils/format";

const MEDIO_LABEL = {
  efectivo: "Efectivo",
  debito: "Débito",
  credito: "Crédito",
  transferencia: "Transferencia",
};

// Comprobante interno (no es documento tributario).
export default function Comprobante({ venta, onNueva, onAnular }) {
  const [anulando, setAnulando] = useState(false);
  const anulada = venta.estado === "anulada";

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-frappe-border bg-frappe-surface p-5">
      <div className="mb-3 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-frappe-successSoft text-frappe-success">
          <Check size={20} />
        </div>
        <div className="font-serif text-base font-semibold text-frappe-text">
          Venta registrada
        </div>
        <div className="text-xs text-frappe-textSoft">
          Comprobante interno N° {venta.numero}
        </div>
        <div className="text-xs text-frappe-textSoft">
          {new Date(venta.createdAt).toLocaleString("es-CL")}
        </div>
      </div>

      <div className="my-3 border-t border-dashed border-frappe-border" />

      {venta.items.map((i, idx) => (
        <div key={idx} className="mb-2 text-sm">
          <div className="flex justify-between">
            <span className="text-frappe-text">{i.nombre}</span>
            <span className="font-medium">{money(i.subtotal)}</span>
          </div>
          <div className="text-xs text-frappe-textSoft">
            {i.cantidad} x {money(i.precioUnit)}
          </div>
        </div>
      ))}

      <div className="my-3 border-t border-dashed border-frappe-border" />

      <div className="flex justify-between text-base font-bold text-frappe-text">
        <span>Total</span>
        <span>{money(venta.total)}</span>
      </div>
      <div className="mt-1 text-xs text-frappe-textSoft">
        Medio de pago: {MEDIO_LABEL[venta.medioPago] || venta.medioPago}
      </div>

      {anulada && (
        <div className="mt-3 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-center text-sm font-semibold text-frappe-danger">
          VENTA ANULADA
        </div>
      )}

      {venta.alertas && venta.alertas.length > 0 && !anulada && (
        <div className="mt-3 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-xs text-frappe-danger">
          <div className="mb-1 font-semibold">⚠ Stock bajo tras esta venta:</div>
          {venta.alertas.map((a) => (
            <div key={a.insumoId}>
              {a.nombre}: {a.stockActual} {a.unidad}{a.negativo ? " (¡negativo!)" : ""}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={onNueva}
          className="flex-1 rounded-lg bg-frappe-accent py-2.5 text-sm font-semibold text-white transition hover:bg-frappe-accentDark"
        >
          Nueva venta
        </button>
        {onAnular && !anulada && (
          <button
            disabled={anulando}
            onClick={async () => {
              setAnulando(true);
              try {
                await onAnular();
              } finally {
                setAnulando(false);
              }
            }}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-frappe-danger px-3 py-2.5 text-sm font-semibold text-frappe-danger transition hover:bg-frappe-dangerSoft disabled:opacity-60"
          >
            {anulando ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />}
            Anular
          </button>
        )}
      </div>
    </div>
  );
}
