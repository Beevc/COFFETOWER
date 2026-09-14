import { useEffect, useRef, useState } from "react";
import { Plus, Minus, Search, AlertTriangle, Loader2, User, X, Star, UserPlus, SlidersHorizontal } from "lucide-react";
import { productsApi } from "../../api/products";
import { ventasApi } from "../../api/ventas";
import { fidelidadApi } from "../../api/fidelidad";
import { promocionesApi } from "../../api/promociones";
import { categoriasApi } from "../../api/categorias";
import { opcionesApi } from "../../api/opciones";
import { money } from "../../utils/format";
import { useCaja } from "./CajaContext";
import Comprobante from "./Comprobante";
import Modal from "../../components/Modal";

const MEDIOS = [
  { id: "efectivo", label: "Efectivo" },
  { id: "debito", label: "Débito" },
  { id: "credito", label: "Crédito" },
  { id: "transferencia", label: "Transferencia" },
];

export default function VenderPage() {
  const { abierta, cargando: cajaCargando, refrescar } = useCaja();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [opciones, setOpciones] = useState([]);
  const [promos, setPromos] = useState({});
  const [cargando, setCargando] = useState(true);
  const [query, setQuery] = useState("");
  const [cat1, setCat1] = useState(""); // categoría (nivel 1)
  const [cat2, setCat2] = useState(""); // subcategoría (nivel 2)
  const [cart, setCart] = useState([]);
  const [comprobante, setComprobante] = useState(null);
  const [error, setError] = useState("");
  const [pagando, setPagando] = useState(false);
  const [personalizando, setPersonalizando] = useState(null); // uid de línea a personalizar
  const uidRef = useRef(1);
  // Fidelidad
  const [cliente, setCliente] = useState(null);
  const [cliQuery, setCliQuery] = useState("");
  const [cliResultados, setCliResultados] = useState([]);
  const [buscandoCli, setBuscandoCli] = useState(false);
  // Barista / pedido
  const [momento, setMomento] = useState("al_momento");
  const [horaProg, setHoraProg] = useState("");
  const [nombrePedido, setNombrePedido] = useState("");
  // Alta rápida de cliente
  const [creandoCli, setCreandoCli] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTel, setNuevoTel] = useState("");
  const [guardandoCli, setGuardandoCli] = useState(false);

  useEffect(() => {
    Promise.all([
      productsApi.list({ activo: true }),
      categoriasApi.list().catch(() => []),
      opcionesApi.list().catch(() => []),
    ])
      .then(([prod, cats, ops]) => {
        setProductos(prod);
        setCategorias(cats);
        setOpciones(ops.filter((o) => o.activo));
      })
      .catch(() => setError("No se pudieron cargar los productos"))
      .finally(() => setCargando(false));
    promocionesApi.list().then((lista) => {
      const m = {};
      lista.filter((p) => p.vigente).forEach((p) => {
        m[p.productoId] = { tipo: p.tipoDescuento, valor: p.valor, packCantidad: p.packCantidad, packPrecio: p.packPrecio };
      });
      setPromos(m);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (cliente || cliQuery.trim().length < 2) { setCliResultados([]); return; }
    setBuscandoCli(true);
    const t = setTimeout(() => {
      fidelidadApi.listClientes(cliQuery.trim()).then(setCliResultados).finally(() => setBuscandoCli(false));
    }, 250);
    return () => clearTimeout(t);
  }, [cliQuery, cliente]);

  // --- Categorías (filtro de 2 niveles) ---
  const nivel1 = categorias.filter((c) => c.parentId === null && c.activo);
  const nivel2 = cat1 ? categorias.filter((c) => c.parentId === Number(cat1) && c.activo) : [];
  const ancestros = (catId) => {
    const set = new Set();
    let cur = categorias.find((c) => c.id === catId);
    while (cur) { set.add(cur.id); cur = cur.parentId ? categorias.find((c) => c.id === cur.parentId) : null; }
    return set;
  };
  const matchCat = (p) => {
    if (!cat1) return true;
    const anc = ancestros(p.categoriaId);
    if (!anc.has(Number(cat1))) return false;
    if (cat2 && !anc.has(Number(cat2))) return false;
    return true;
  };

  const filtrados = productos.filter(
    (p) =>
      (p.nombre.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase())) &&
      matchCat(p)
  );

  // --- Carrito con opciones ---
  const addToCart = (p) => {
    setCart((c) => {
      const found = c.find((i) => i.id === p.id && i.opciones.length === 0);
      if (found) return c.map((i) => (i === found ? { ...i, cantidad: i.cantidad + 1 } : i));
      return [...c, { uid: uidRef.current++, id: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1, opciones: [] }];
    });
  };
  const changeQty = (uid, delta) =>
    setCart((c) => c.map((i) => (i.uid === uid ? { ...i, cantidad: i.cantidad + delta } : i)).filter((i) => i.cantidad > 0));
  const setOpcionesLinea = (uid, ops) =>
    setCart((c) => c.map((i) => (i.uid === uid ? { ...i, opciones: ops } : i)));

  const perUnit = (i) => i.precio + i.opciones.reduce((s, o) => s + o.precio, 0);
  const total = cart.reduce((s, i) => s + perUnit(i) * i.cantidad, 0);

  // --- Vista previa de descuentos ---
  let promoDescuento = 0;
  for (const i of cart) {
    const promo = promos[i.id];
    if (!promo) continue;
    const subtotal = perUnit(i) * i.cantidad;
    let d;
    if (promo.tipo === "pack") {
      const packs = Math.floor(i.cantidad / promo.packCantidad);
      d = Math.max(0, packs * (promo.packCantidad * i.precio - promo.packPrecio));
    } else {
      d = promo.tipo === "porcentaje" ? Math.round((subtotal * promo.valor) / 100) : Math.round(promo.valor * i.cantidad);
    }
    promoDescuento += Math.min(d, subtotal);
  }
  let fidDescuento = 0, beneficioPreview = null, regaloPreview = null;
  if (cliente && cliente.premioEnProximaCompra && cliente.proximoPremio && cart.length > 0) {
    const pr = cliente.proximoPremio;
    if (pr.tipo === "gratis") { fidDescuento = Math.max(...cart.map((i) => i.precio)); beneficioPreview = `Frappé gratis (nivel ${pr.compras})`; }
    else if (pr.tipo === "monto") { fidDescuento = pr.valor; beneficioPreview = `${money(pr.valor)} de descuento (nivel ${pr.compras})`; }
    else { regaloPreview = pr.descripcion; beneficioPreview = `Regalo (nivel ${pr.compras})`; }
  }
  let descuentoPreview = promoDescuento + fidDescuento;
  if (descuentoPreview > total) descuentoPreview = total;
  const totalFinal = total - descuentoPreview;

  const pagar = async (medioPago) => {
    setError("");
    setPagando(true);
    try {
      const items = cart.map((i) => ({ productoId: i.id, cantidad: i.cantidad, opciones: i.opciones.map((o) => o.id) }));
      const extra = { clienteId: cliente?.id, momento };
      if (!cliente && nombrePedido.trim()) extra.nombreCliente = nombrePedido.trim();
      if (momento === "programado" && horaProg) extra.horaProgramada = horaProg;
      const { venta, alertas, beneficio, regalo } = await ventasApi.registrar(medioPago, items, extra);
      setComprobante({ ...venta, alertas, beneficio, regalo });
      setCart([]); setCliente(null); setCliQuery(""); setNombrePedido(""); setMomento("al_momento"); setHoraProg("");
      refrescar();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo registrar la venta");
    } finally {
      setPagando(false);
    }
  };

  const crearClienteRapido = async () => {
    if (!nuevoNombre.trim()) return;
    setGuardandoCli(true); setError("");
    try {
      const cli = await fidelidadApi.crearCliente({ nombre: nuevoNombre.trim(), telefono: nuevoTel.trim() || undefined });
      setCliente(cli); setCreandoCli(false); setNuevoNombre(""); setNuevoTel(""); setCliQuery("");
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo crear el cliente");
    } finally { setGuardandoCli(false); }
  };

  const anularActual = async () => {
    const anulada = await ventasApi.anular(comprobante.id, "Anulada desde el comprobante");
    setComprobante({ ...comprobante, estado: anulada.estado });
    refrescar();
  };

  if (cajaCargando || cargando) {
    return <div className="flex items-center justify-center gap-2 py-16 text-frappe-textSoft"><Loader2 size={18} className="animate-spin" /> Cargando…</div>;
  }
  if (!abierta) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-frappe-border bg-frappe-surface px-6 py-12 text-center">
        <AlertTriangle size={22} className="text-frappe-danger" />
        <div className="font-semibold text-frappe-text">Abre la caja antes de vender</div>
        <p className="text-sm text-frappe-textSoft">Ve a la pestaña <b>Caja</b> para iniciar el turno.</p>
      </div>
    );
  }
  if (comprobante) {
    return <Comprobante venta={comprobante} onNueva={() => setComprobante(null)} onAnular={anularActual} />;
  }

  const chip = (active) => `shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${active ? "bg-frappe-accent text-white" : "bg-frappe-surface text-frappe-textSoft border border-frappe-border hover:text-frappe-text"}`;
  const lineaPersonalizando = cart.find((i) => i.uid === personalizando);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-frappe-textSoft" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar producto o SKU"
          className="w-full rounded-lg border border-frappe-border bg-frappe-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-frappe-accent" />
      </div>

      {/* Filtro por categoría (nivel 1) */}
      {nivel1.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button className={chip(!cat1)} onClick={() => { setCat1(""); setCat2(""); }}>Todos</button>
          {nivel1.map((c) => (
            <button key={c.id} className={chip(Number(cat1) === c.id)} onClick={() => { setCat1(String(c.id)); setCat2(""); }}>{c.nombre}</button>
          ))}
        </div>
      )}
      {/* Filtro por subcategoría (nivel 2) */}
      {cat1 && nivel2.length > 0 && (
        <div className="-mt-1 flex gap-1.5 overflow-x-auto pb-1">
          <button className={chip(!cat2)} onClick={() => setCat2("")}>Todas</button>
          {nivel2.map((c) => (
            <button key={c.id} className={chip(Number(cat2) === c.id)} onClick={() => setCat2(String(c.id))}>{c.nombre}</button>
          ))}
        </div>
      )}

      {error && <div className="rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">{error}</div>}

      <div className="grid grid-cols-2 gap-2">
        {filtrados.map((p) => (
          <button key={p.id} onClick={() => addToCart(p)}
            className="rounded-xl border border-frappe-border bg-frappe-surface p-3 text-left transition hover:border-frappe-accent">
            <div className="text-sm font-semibold leading-tight text-frappe-text">{p.nombre}</div>
            <div className="text-xs text-frappe-textSoft">{p.sku}</div>
            <div className="mt-1.5 text-sm font-bold text-frappe-accentDark">{money(p.precio)}</div>
          </button>
        ))}
        {filtrados.length === 0 && <div className="col-span-2 py-8 text-center text-sm text-frappe-textSoft">No hay productos que coincidan.</div>}
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
                    <span className="flex items-center gap-1 rounded-full bg-frappe-surface px-2 py-0.5 text-xs font-semibold text-frappe-accentDark"><Star size={10} /> premio en esta compra</span>
                  ) : cliente.proximoPremio ? (
                    <span className="text-xs text-frappe-textSoft">faltan {cliente.faltan}</span>
                  ) : null}
                </div>
                <button onClick={() => { setCliente(null); setCliQuery(""); }} className="text-frappe-textSoft hover:text-frappe-danger"><X size={15} /></button>
              </div>
            ) : (
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-frappe-textSoft" />
                <input value={cliQuery} onChange={(e) => setCliQuery(e.target.value)} placeholder="Cliente fidelidad (opcional)"
                  className="w-full rounded-lg border border-frappe-border bg-frappe-bg py-2 pl-9 pr-3 text-sm outline-none focus:border-frappe-accent" />
                {cliQuery.trim().length >= 2 && !creandoCli && (
                  <div className="absolute z-10 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-frappe-border bg-frappe-surface shadow-lg">
                    {buscandoCli ? <div className="px-3 py-2 text-xs text-frappe-textSoft">Buscando…</div>
                    : cliResultados.length === 0 ? <div className="px-3 py-2 text-xs text-frappe-textSoft">Sin resultados</div>
                    : cliResultados.map((c) => (
                      <button key={c.id} onClick={() => { setCliente(c); setCliResultados([]); }} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-frappe-bg">
                        <span className="text-frappe-text">{c.nombre}</span>
                        <span className="text-xs text-frappe-textSoft">{c.comprasContador}{c.beneficioDisponible ? " ⭐" : ""}</span>
                      </button>
                    ))}
                    <button onMouseDown={(e) => { e.preventDefault(); setCreandoCli(true); setNuevoNombre(cliQuery.trim()); }}
                      className="flex w-full items-center gap-1.5 border-t border-frappe-border bg-frappe-accentSoft px-3 py-2 text-left text-sm font-semibold text-frappe-accentDark hover:bg-frappe-accent hover:text-white">
                      <UserPlus size={14} /> Crear nuevo cliente{cliQuery.trim() ? ` "${cliQuery.trim()}"` : ""}
                    </button>
                  </div>
                )}
              </div>
            )}

            {!cliente && (
              creandoCli ? (
                <div className="mt-2 rounded-lg border border-frappe-border bg-frappe-bg p-2">
                  <div className="mb-1 text-xs font-semibold text-frappe-text">Nuevo cliente de fidelidad</div>
                  <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nombre" className="mb-1.5 w-full rounded-md border border-frappe-border bg-frappe-surface px-2 py-1.5 text-sm outline-none focus:border-frappe-accent" />
                  <input value={nuevoTel} onChange={(e) => setNuevoTel(e.target.value)} placeholder="Teléfono (opcional)" className="mb-2 w-full rounded-md border border-frappe-border bg-frappe-surface px-2 py-1.5 text-sm outline-none focus:border-frappe-accent" />
                  <div className="flex gap-2">
                    <button onClick={() => { setCreandoCli(false); setNuevoNombre(""); setNuevoTel(""); }} className="flex-1 rounded-md border border-frappe-border py-1.5 text-xs font-semibold text-frappe-text hover:bg-frappe-surface">Cancelar</button>
                    <button onClick={crearClienteRapido} disabled={guardandoCli || !nuevoNombre.trim()} className="flex flex-1 items-center justify-center gap-1 rounded-md bg-frappe-accent py-1.5 text-xs font-semibold text-white hover:bg-frappe-accentDark disabled:opacity-50">
                      {guardandoCli && <Loader2 size={12} className="animate-spin" />} Crear y asociar
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setCreandoCli(true); setNuevoNombre(cliQuery.trim()); }} className="mt-1.5 flex items-center gap-1 text-xs font-medium text-frappe-accentDark">
                  <UserPlus size={12} /> Nuevo cliente de fidelidad
                </button>
              )
            )}

            {!cliente && (
              <input value={nombrePedido} onChange={(e) => setNombrePedido(e.target.value)} placeholder="Nombre para el pedido (ej. Juan, Mesa 3)"
                className="mt-2 w-full rounded-lg border border-frappe-border bg-frappe-bg px-3 py-2 text-sm outline-none focus:border-frappe-accent" />
            )}
            {cliente && <div className="mt-1.5 text-xs text-frappe-textSoft">El pedido saldrá a nombre de <b className="text-frappe-text">{cliente.nombre}</b>.</div>}
          </div>

          <div className="mb-2 text-sm font-semibold text-frappe-text">Venta actual</div>
          {cart.map((i) => (
            <div key={i.uid} className="py-1.5">
              <div className="flex items-center justify-between">
                <div className="flex-1 text-sm text-frappe-text">{i.nombre}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => changeQty(i.uid, -1)} className="flex h-6 w-6 items-center justify-center rounded-md border border-frappe-border text-frappe-text"><Minus size={12} /></button>
                  <span className="w-5 text-center text-sm">{i.cantidad}</span>
                  <button onClick={() => changeQty(i.uid, 1)} className="flex h-6 w-6 items-center justify-center rounded-md border border-frappe-border text-frappe-text"><Plus size={12} /></button>
                </div>
                <div className="w-20 text-right text-sm font-semibold">{money(perUnit(i) * i.cantidad)}</div>
              </div>
              <div className="flex items-center justify-between">
                {i.opciones.length > 0 ? (
                  <div className="text-xs text-frappe-textSoft">+ {i.opciones.map((o) => o.nombre).join(", ")}</div>
                ) : <span />}
                {opciones.length > 0 && (
                  <button onClick={() => setPersonalizando(i.uid)} className="flex items-center gap-1 text-xs font-medium text-frappe-accentDark">
                    <SlidersHorizontal size={11} /> Personalizar
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="my-2 border-t border-frappe-border" />
          {descuentoPreview > 0 && (
            <div className="flex justify-between text-sm font-semibold text-frappe-success"><span>Descuento</span><span>-{money(descuentoPreview)}</span></div>
          )}
          <div className="flex items-center justify-between text-base font-bold text-frappe-text">
            <span>Total</span>
            <span>{descuentoPreview > 0 && <span className="mr-2 text-sm font-normal text-frappe-textSoft line-through">{money(total)}</span>}{money(totalFinal)}</span>
          </div>
          {beneficioPreview && <div className="mt-2 rounded-lg bg-frappe-accentSoft px-3 py-1.5 text-center text-xs font-semibold text-frappe-accentDark">🎉 {beneficioPreview}</div>}
          {regaloPreview && <div className="mt-2 rounded-lg bg-frappe-accent px-3 py-1.5 text-center text-xs font-bold text-white">🎁 Entregar regalo: {regaloPreview}</div>}
          <div className="mb-3" />

          <div className="mb-3">
            <div className="mb-1 text-xs text-frappe-textSoft">Preparación:</div>
            <div className="flex gap-1 rounded-lg bg-frappe-accentSoft p-1">
              {[{ id: "al_momento", label: "Al momento" }, { id: "despues", label: "Después" }, { id: "programado", label: "Programar" }].map((m) => (
                <button key={m.id} onClick={() => setMomento(m.id)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${momento === m.id ? "bg-frappe-surface text-frappe-accentDark shadow-sm" : "text-frappe-textSoft"}`}>
                  {m.label}
                </button>
              ))}
            </div>
            {momento === "programado" && (
              <input type="time" value={horaProg} onChange={(e) => setHoraProg(e.target.value)} className="mt-2 w-full rounded-lg border border-frappe-border bg-frappe-bg px-3 py-2 text-sm outline-none focus:border-frappe-accent" />
            )}
          </div>

          <div className="text-xs text-frappe-textSoft">Cobrar con:</div>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {MEDIOS.map((m) => (
              <button key={m.id} disabled={pagando} onClick={() => pagar(m.id)}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-frappe-accent py-2.5 text-sm font-semibold text-white transition hover:bg-frappe-accentDark disabled:opacity-60">
                {pagando && <Loader2 size={14} className="animate-spin" />}{m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modal de personalización */}
      {lineaPersonalizando && (
        <PersonalizarModal
          linea={lineaPersonalizando}
          opciones={opciones}
          onClose={() => setPersonalizando(null)}
          onGuardar={(ops) => { setOpcionesLinea(lineaPersonalizando.uid, ops); setPersonalizando(null); }}
        />
      )}
    </div>
  );
}

function PersonalizarModal({ linea, opciones, onClose, onGuardar }) {
  const [sel, setSel] = useState(new Set(linea.opciones.map((o) => o.id)));
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const extras = opciones.filter((o) => o.tipo === "extra");
  const sust = opciones.filter((o) => o.tipo === "sustitucion");
  const elegidas = opciones.filter((o) => sel.has(o.id));
  const extraTotal = elegidas.reduce((s, o) => s + o.precio, 0);

  const Fila = (o) => (
    <button key={o.id} onClick={() => toggle(o.id)}
      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition ${sel.has(o.id) ? "border-frappe-accent bg-frappe-accentSoft" : "border-frappe-border bg-frappe-bg"}`}>
      <span className="font-medium text-frappe-text">{o.nombre}</span>
      <span className="text-frappe-accentDark">{o.precio > 0 ? `+${money(o.precio)}` : "—"}</span>
    </button>
  );

  return (
    <Modal title={`Personalizar: ${linea.nombre}`} onClose={onClose}>
      {extras.length > 0 && (
        <div className="mb-3">
          <div className="mb-1.5 text-xs font-semibold text-frappe-textSoft">Extras</div>
          <div className="flex flex-col gap-1.5">{extras.map(Fila)}</div>
        </div>
      )}
      {sust.length > 0 && (
        <div className="mb-3">
          <div className="mb-1.5 text-xs font-semibold text-frappe-textSoft">Sustituciones</div>
          <div className="flex flex-col gap-1.5">{sust.map(Fila)}</div>
        </div>
      )}
      {opciones.length === 0 && <div className="py-4 text-center text-sm text-frappe-textSoft">No hay opciones configuradas.</div>}
      <div className="mt-2 flex items-center justify-between border-t border-frappe-border pt-3">
        <span className="text-sm text-frappe-textSoft">Extra: <b className="text-frappe-text">{money(extraTotal)}</b></span>
        <button onClick={() => onGuardar(elegidas.map((o) => ({ id: o.id, nombre: o.nombre, precio: o.precio })))}
          className="rounded-lg bg-frappe-accent px-4 py-2 text-sm font-semibold text-white hover:bg-frappe-accentDark">Listo</button>
      </div>
    </Modal>
  );
}
