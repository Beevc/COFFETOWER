import { useEffect, useState } from "react";
import { Plus, Minus, Search, AlertTriangle, Loader2 } from "lucide-react";
import { productsApi } from "../../api/products";
import { ventasApi } from "../../api/ventas";
import { money } from "../../utils/format";
import { useCaja } from "./CajaContext";
import Comprobante from "./Comprobante";

const MEDIOS = [
  { id: "efectivo", label: "Efectivo" },
  { id: "debito", label: "Débito" },
  { id: "credito", label: "Crédito" },
  { id: "transferencia", label: "Transferencia" },
];

export default function VenderPage() {
  const { abierta, cargando: cajaCargando, refrescar } = useCaja();
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [comprobante, setComprobante] = useState(null);
  const [error, setError] = useState("");
  const [pagando, setPagando] = useState(false);

  useEffect(() => {
    productsApi
      .list({ activo: true })
      .then(setProductos)
      .catch(() => setError("No se pudieron cargar los productos"))
      .finally(() => setCargando(false));
  }, []);

  const filtrados = productos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(query.toLowerCase()) ||
      p.sku.toLowerCase().includes(query.toLowerCase())
  );

  const addToCart = (p) => {
    setCart((c) => {
      const found = c.find((i) => i.id === p.id);
      if (found) return c.map((i) => (i.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i));
      return [...c, { id: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1 }];
    });
  };

  const changeQty = (id, delta) =>
    setCart((c) =>
      c
        .map((i) => (i.id === id ? { ...i, cantidad: i.cantidad + delta } : i))
        .filter((i) => i.cantidad > 0)
    );

  const total = cart.reduce((s, i) => s + i.precio * i.cantidad, 0);

  const pagar = async (medioPago) => {
    setError("");
    setPagando(true);
    try {
      const items = cart.map((i) => ({ productoId: i.id, cantidad: i.cantidad }));
      const { venta, alertas } = await ventasApi.registrar(medioPago, items);
      setComprobante({ ...venta, alertas });
      setCart([]);
      refrescar(); // actualiza totales de caja
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo registrar la venta");
    } finally {
      setPagando(false);
    }
  };

  const anularActual = async () => {
    const anulada = await ventasApi.anular(comprobante.id, "Anulada desde el comprobante");
    setComprobante({ ...comprobante, estado: anulada.estado });
    refrescar();
  };

  if (cajaCargando || cargando) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-frappe-textSoft">
        <Loader2 size={18} className="animate-spin" /> Cargando…
      </div>
    );
  }

  if (!abierta) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-frappe-border bg-frappe-surface px-6 py-12 text-center">
        <AlertTriangle size={22} className="text-frappe-danger" />
        <div className="font-semibold text-frappe-text">Abre la caja antes de vender</div>
        <p className="text-sm text-frappe-textSoft">
          Ve a la pestaña <b>Caja</b> para iniciar el turno.
        </p>
      </div>
    );
  }

  if (comprobante) {
    return (
      <Comprobante
        venta={comprobante}
        onNueva={() => setComprobante(null)}
        onAnular={anularActual}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-frappe-textSoft" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar producto o SKU"
          className="w-full rounded-lg border border-frappe-border bg-frappe-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-frappe-accent"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {filtrados.map((p) => (
          <button
            key={p.id}
            onClick={() => addToCart(p)}
            className="rounded-xl border border-frappe-border bg-frappe-surface p-3 text-left transition hover:border-frappe-accent"
          >
            <div className="text-sm font-semibold leading-tight text-frappe-text">{p.nombre}</div>
            <div className="text-xs text-frappe-textSoft">{p.sku}</div>
            <div className="mt-1.5 text-sm font-bold text-frappe-accentDark">{money(p.precio)}</div>
          </button>
        ))}
        {filtrados.length === 0 && (
          <div className="col-span-2 py-8 text-center text-sm text-frappe-textSoft">
            No hay productos que coincidan.
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="sticky bottom-2 rounded-2xl border border-frappe-border bg-frappe-surface p-4 shadow-lg">
          <div className="mb-2 text-sm font-semibold text-frappe-text">Venta actual</div>
          {cart.map((i) => (
            <div key={i.id} className="flex items-center justify-between py-1.5">
              <div className="flex-1 text-sm text-frappe-text">{i.nombre}</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeQty(i.id, -1)}
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-frappe-border text-frappe-text"
                >
                  <Minus size={12} />
                </button>
                <span className="w-5 text-center text-sm">{i.cantidad}</span>
                <button
                  onClick={() => changeQty(i.id, 1)}
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-frappe-border text-frappe-text"
                >
                  <Plus size={12} />
                </button>
              </div>
              <div className="w-20 text-right text-sm font-semibold">
                {money(i.precio * i.cantidad)}
              </div>
            </div>
          ))}
          <div className="my-2 border-t border-frappe-border" />
          <div className="mb-3 flex justify-between text-base font-bold text-frappe-text">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
          <div className="text-xs text-frappe-textSoft">Cobrar con:</div>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {MEDIOS.map((m) => (
              <button
                key={m.id}
                disabled={pagando}
                onClick={() => pagar(m.id)}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-frappe-accent py-2.5 text-sm font-semibold text-white transition hover:bg-frappe-accentDark disabled:opacity-60"
              >
                {pagando && <Loader2 size={14} className="animate-spin" />}
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
