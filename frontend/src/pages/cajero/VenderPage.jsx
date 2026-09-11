import { useEffect, useState } from "react";
import { Plus, Minus, Search, AlertTriangle, Loader2, User, X, Star, UserPlus } from "lucide-react";
import { productsApi } from "../../api/products";
import { ventasApi } from "../../api/ventas";
import { fidelidadApi } from "../../api/fidelidad";
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
  // Fidelidad: cliente opcional asociado a la venta
  const [cliente, setCliente] = useState(null);
  const [cliQuery, setCliQuery] = useState("");
  const [cliResultados, setCliResultados] = useState([]);
  const [buscandoCli, setBuscandoCli] = useState(false);
  // Barista: momento de preparación
  const [momento, setMomento] = useState("al_momento");
  const [horaProg, setHoraProg] = useState("");
  // Nombre para llamar el pedido (si no hay cliente de fidelidad)
  const [nombrePedido, setNombrePedido] = useState("");
  // Alta rápida de cliente de fidelidad desde el POS
  const [creandoCli, setCreandoCli] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTel, setNuevoTel] = useState("");
  const [guardandoCli, setGuardandoCli] = useState(false);

  useEffect(() => {
    productsApi
      .list({ activo: true })
      .then(setProductos)
      .catch(() => setError("No se pudieron cargar los productos"))
      .finally(() => setCargando(false));
  }, []);

  // Búsqueda de clientes (fidelidad) con debounce.
  useEffect(() => {
    if (cliente || cliQuery.trim().length < 2) {
      setCliResultados([]);
      return;
    }
    setBuscandoCli(true);
    const t = setTimeout(() => {
      fidelidadApi.listClientes(cliQuery.trim())
        .then(setCliResultados)
        .finally(() => setBuscandoCli(false));
    }, 250);
    return () => clearTimeout(t);
  }, [cliQuery, cliente]);

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
      const extra = { clienteId: cliente?.id, momento };
      // Si hay cliente de fidelidad se usa su nombre; si no, el escrito para el pedido.
      if (!cliente && nombrePedido.trim()) extra.nombreCliente = nombrePedido.trim();
      if (momento === "programado" && horaProg) extra.horaProgramada = horaProg;
      const { venta, alertas, beneficio, regalo } = await ventasApi.registrar(medioPago, items, extra);
      setComprobante({ ...venta, alertas, beneficio, regalo });
      setCart([]);
      setCliente(null);
      setCliQuery("");
      setNombrePedido("");
      setMomento("al_momento");
      setHoraProg("");
      refrescar(); // actualiza totales de caja
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo registrar la venta");
    } finally {
      setPagando(false);
    }
  };

  const crearClienteRapido = async () => {
    if (!nuevoNombre.trim()) return;
    setGuardandoCli(true);
    setError("");
    try {
      const cli = await fidelidadApi.crearCliente({
        nombre: nuevoNombre.trim(),
        telefono: nuevoTel.trim() || undefined,
      });
      setCliente(cli);        // queda asociado a la venta
      setCreandoCli(false);
      setNuevoNombre("");
      setNuevoTel("");
      setCliQuery("");
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo crear el cliente");
    } finally {
      setGuardandoCli(false);
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
          {/* Cliente (fidelidad) */}
          <div className="mb-3">
            {cliente ? (
              <div className="flex items-center justify-between rounded-lg bg-frappe-accentSoft px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <User size={14} className="text-frappe-accentDark" />
                  <span className="font-semibold text-frappe-text">{cliente.nombre}</span>
                  <span className="text-xs text-frappe-textSoft">({cliente.comprasContador} compras)</span>
                  {cliente.premioEnProximaCompra ? (
                    <span className="flex items-center gap-1 rounded-full bg-frappe-surface px-2 py-0.5 text-xs font-semibold text-frappe-accentDark">
                      <Star size={10} /> premio en esta compra
                    </span>
                  ) : cliente.proximoPremio ? (
                    <span className="text-xs text-frappe-textSoft">faltan {cliente.faltan}</span>
                  ) : null}
                </div>
                <button onClick={() => { setCliente(null); setCliQuery(""); }} className="text-frappe-textSoft hover:text-frappe-danger">
                  <X size={15} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-frappe-textSoft" />
                <input
                  value={cliQuery}
                  onChange={(e) => setCliQuery(e.target.value)}
                  placeholder="Cliente fidelidad (opcional)"
                  className="w-full rounded-lg border border-frappe-border bg-frappe-bg py-2 pl-9 pr-3 text-sm outline-none focus:border-frappe-accent"
                />
                {cliQuery.trim().length >= 2 && !creandoCli && (
                  <div className="absolute z-10 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-frappe-border bg-frappe-surface shadow-lg">
                    {buscandoCli ? (
                      <div className="px-3 py-2 text-xs text-frappe-textSoft">Buscando…</div>
                    ) : cliResultados.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-frappe-textSoft">Sin resultados</div>
                    ) : (
                      cliResultados.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { setCliente(c); setCliResultados([]); }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-frappe-bg"
                        >
                          <span className="text-frappe-text">{c.nombre}</span>
                          <span className="text-xs text-frappe-textSoft">
                            {c.comprasContador}{c.beneficioDisponible ? " ⭐" : ""}
                          </span>
                        </button>
                      ))
                    )}
                    {/* Crear el cliente escrito, siempre visible dentro de la lista */}
                    <button
                      onMouseDown={(e) => { e.preventDefault(); setCreandoCli(true); setNuevoNombre(cliQuery.trim()); }}
                      className="flex w-full items-center gap-1.5 border-t border-frappe-border bg-frappe-accentSoft px-3 py-2 text-left text-sm font-semibold text-frappe-accentDark hover:bg-frappe-accent hover:text-white"
                    >
                      <UserPlus size={14} /> Crear nuevo cliente{cliQuery.trim() ? ` "${cliQuery.trim()}"` : ""}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Alta rápida de cliente de fidelidad (solo si no hay uno elegido) */}
            {!cliente && (
              creandoCli ? (
                <div className="mt-2 rounded-lg border border-frappe-border bg-frappe-bg p-2">
                  <div className="mb-1 text-xs font-semibold text-frappe-text">Nuevo cliente de fidelidad</div>
                  <input
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    placeholder="Nombre"
                    className="mb-1.5 w-full rounded-md border border-frappe-border bg-frappe-surface px-2 py-1.5 text-sm outline-none focus:border-frappe-accent"
                  />
                  <input
                    value={nuevoTel}
                    onChange={(e) => setNuevoTel(e.target.value)}
                    placeholder="Teléfono (opcional)"
                    className="mb-2 w-full rounded-md border border-frappe-border bg-frappe-surface px-2 py-1.5 text-sm outline-none focus:border-frappe-accent"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => { setCreandoCli(false); setNuevoNombre(""); setNuevoTel(""); }}
                      className="flex-1 rounded-md border border-frappe-border py-1.5 text-xs font-semibold text-frappe-text hover:bg-frappe-surface">
                      Cancelar
                    </button>
                    <button onClick={crearClienteRapido} disabled={guardandoCli || !nuevoNombre.trim()}
                      className="flex flex-1 items-center justify-center gap-1 rounded-md bg-frappe-accent py-1.5 text-xs font-semibold text-white hover:bg-frappe-accentDark disabled:opacity-50">
                      {guardandoCli && <Loader2 size={12} className="animate-spin" />} Crear y asociar
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setCreandoCli(true); setNuevoNombre(cliQuery.trim()); }}
                  className="mt-1.5 flex items-center gap-1 text-xs font-medium text-frappe-accentDark">
                  <UserPlus size={12} /> Nuevo cliente de fidelidad
                </button>
              )
            )}

            {/* Nombre para llamar el pedido (si no hay cliente de fidelidad) */}
            {!cliente && (
              <input
                value={nombrePedido}
                onChange={(e) => setNombrePedido(e.target.value)}
                placeholder="Nombre para el pedido (ej. Juan, Mesa 3)"
                className="mt-2 w-full rounded-lg border border-frappe-border bg-frappe-bg px-3 py-2 text-sm outline-none focus:border-frappe-accent"
              />
            )}
            {cliente && (
              <div className="mt-1.5 text-xs text-frappe-textSoft">
                El pedido saldrá a nombre de <b className="text-frappe-text">{cliente.nombre}</b>.
              </div>
            )}
          </div>

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

          {/* Momento de preparación (para el barista) */}
          <div className="mb-3">
            <div className="mb-1 text-xs text-frappe-textSoft">Preparación:</div>
            <div className="flex gap-1 rounded-lg bg-frappe-accentSoft p-1">
              {[
                { id: "al_momento", label: "Al momento" },
                { id: "despues", label: "Después" },
                { id: "programado", label: "Programar" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMomento(m.id)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                    momento === m.id ? "bg-frappe-surface text-frappe-accentDark shadow-sm" : "text-frappe-textSoft"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {momento === "programado" && (
              <input
                type="time"
                value={horaProg}
                onChange={(e) => setHoraProg(e.target.value)}
                className="mt-2 w-full rounded-lg border border-frappe-border bg-frappe-bg px-3 py-2 text-sm outline-none focus:border-frappe-accent"
              />
            )}
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
