import React, { useState } from "react";
import { Plus, Minus, X, Lock, Unlock, Printer, Search, AlertTriangle, Package, Receipt as ReceiptIcon, Wallet } from "lucide-react";

const COLORS = {
  bg: "#FAF5EC",
  surface: "#FFFFFF",
  border: "#E8DDC9",
  text: "#2B1D14",
  textSoft: "#6B5645",
  accent: "#B6752B",
  accentDark: "#8A5A1F",
  accentSoft: "#F1E2C8",
  success: "#4F6E4C",
  successSoft: "#E3ECE0",
  danger: "#A8432E",
  dangerSoft: "#F4E1DB",
};

const SEED_PRODUCTS = [
  { sku: "PAN-001", name: "Pan amasado (kg)", price: 2200, stock: 34 },
  { sku: "PAN-002", name: "Baguette", price: 900, stock: 21 },
  { sku: "PAS-001", name: "Croissant", price: 1200, stock: 18 },
  { sku: "PAS-002", name: "Empanada de queso", price: 1500, stock: 12 },
  { sku: "PAS-003", name: "Queque marmoleado", price: 6500, stock: 5 },
  { sku: "TOR-001", name: "Torta de chocolate", price: 18000, stock: 3 },
  { sku: "BEB-001", name: "Bebida gaseosa 350ml", price: 1000, stock: 40 },
  { sku: "BEB-002", name: "Café americano", price: 1500, stock: 999 },
];

const money = (n) =>
  "$" + Math.round(n).toLocaleString("es-CL");

function Header({ view, setView, cajaAbierta }) {
  const tabs = [
    { id: "vender", label: "Vender", icon: ReceiptIcon },
    { id: "caja", label: "Caja", icon: Wallet },
    { id: "productos", label: "Productos", icon: Package },
  ];
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 0.3, color: COLORS.textSoft }}>Sucursal</div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 600, color: COLORS.text }}>
            Independencia
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            padding: "5px 10px",
            borderRadius: 20,
            background: cajaAbierta ? COLORS.successSoft : COLORS.dangerSoft,
            color: cajaAbierta ? COLORS.success : COLORS.danger,
            fontWeight: 600,
          }}
        >
          {cajaAbierta ? <Unlock size={13} /> : <Lock size={13} />}
          {cajaAbierta ? "Caja abierta" : "Caja cerrada"}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10, background: COLORS.accentSoft, padding: 4, borderRadius: 10 }}>
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = view === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "8px 6px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                background: active ? COLORS.surface : "transparent",
                color: active ? COLORS.accentDark : COLORS.textSoft,
                boxShadow: active ? "0 1px 2px rgba(43,29,20,0.12)" : "none",
              }}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CajaView({ caja, abrirCaja, cerrarCaja }) {
  const [montoInicial, setMontoInicial] = useState("20000");
  const [montoContado, setMontoContado] = useState("");
  const [cerrando, setCerrando] = useState(false);

  if (!caja.abierta) {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Abrir caja</div>
        <div style={{ fontSize: 13, color: COLORS.textSoft, marginBottom: 14 }}>
          Ingresa el monto inicial en efectivo para comenzar el turno.
        </div>
        <label style={labelStyle}>Monto inicial</label>
        <input
          type="number"
          value={montoInicial}
          onChange={(e) => setMontoInicial(e.target.value)}
          style={inputStyle}
        />
        <button
          onClick={() => abrirCaja(Number(montoInicial) || 0)}
          style={{ ...primaryBtn, marginTop: 14, width: "100%" }}
        >
          Abrir caja
        </button>
      </div>
    );
  }

  const totalVentas = caja.ventas.reduce((s, v) => s + v.total, 0);
  const efectivo = caja.ventas.filter((v) => v.medio === "Efectivo").reduce((s, v) => s + v.total, 0);
  const tarjeta = totalVentas - efectivo;
  const esperado = caja.montoInicial + efectivo;
  const diferencia = montoContado === "" ? null : Number(montoContado) - esperado;

  if (cerrando) {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Cerrar caja</div>
        <SummaryRow label="Monto inicial" value={money(caja.montoInicial)} />
        <SummaryRow label="Ventas en efectivo" value={money(efectivo)} />
        <SummaryRow label="Ventas con tarjeta" value={money(tarjeta)} />
        <div style={{ borderTop: `0.5px solid ${COLORS.border}`, margin: "8px 0" }} />
        <SummaryRow label="Efectivo esperado en caja" value={money(esperado)} bold />
        <label style={{ ...labelStyle, marginTop: 12 }}>Efectivo contado</label>
        <input
          type="number"
          value={montoContado}
          onChange={(e) => setMontoContado(e.target.value)}
          placeholder="Cuenta el dinero en caja"
          style={inputStyle}
        />
        {diferencia !== null && (
          <div
            style={{
              marginTop: 10,
              padding: "8px 10px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              background: diferencia === 0 ? COLORS.successSoft : COLORS.dangerSoft,
              color: diferencia === 0 ? COLORS.success : COLORS.danger,
            }}
          >
            {diferencia === 0
              ? "Cuadratura exacta"
              : `Diferencia: ${diferencia > 0 ? "+" : ""}${money(diferencia)}`}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={() => setCerrando(false)} style={{ ...secondaryBtn, flex: 1 }}>
            Volver
          </button>
          <button
            onClick={() => {
              if (montoContado === "") return;
              cerrarCaja(Number(montoContado), esperado);
              setCerrando(false);
              setMontoContado("");
            }}
            style={{ ...primaryBtn, flex: 1 }}
          >
            Confirmar cierre
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <MetricCard label="Ventas del turno" value={money(totalVentas)} />
        <MetricCard label="N° de ventas" value={caja.ventas.length} />
        <MetricCard label="Efectivo" value={money(efectivo)} />
        <MetricCard label="Tarjeta" value={money(tarjeta)} />
      </div>
      <div style={cardStyle}>
        <div style={{ fontSize: 13, color: COLORS.textSoft, marginBottom: 2 }}>Monto inicial</div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{money(caja.montoInicial)}</div>
        <div style={{ fontSize: 12, color: COLORS.textSoft, marginTop: 4 }}>
          Turno abierto {caja.abiertaEn}
        </div>
      </div>
      <button onClick={() => setCerrando(true)} style={{ ...secondaryBtn, borderColor: COLORS.danger, color: COLORS.danger }}>
        Cerrar caja
      </button>
    </div>
  );
}

function SummaryRow({ label, value, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0", fontWeight: bold ? 700 : 400 }}>
      <span style={{ color: bold ? COLORS.text : COLORS.textSoft }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div style={{ background: COLORS.surface, border: `0.5px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontSize: 11, color: COLORS.textSoft, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function VenderView({ products, cajaAbierta, registrarVenta }) {
  const [cart, setCart] = useState([]);
  const [query, setQuery] = useState("");
  const [boleta, setBoleta] = useState(null);

  const filtered = products.filter(
    (p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase())
  );

  const addToCart = (p) => {
    if (p.stock <= 0) return;
    setCart((c) => {
      const found = c.find((i) => i.sku === p.sku);
      if (found) {
        if (found.qty >= p.stock) return c;
        return c.map((i) => (i.sku === p.sku ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...c, { ...p, qty: 1 }];
    });
  };

  const changeQty = (sku, delta) => {
    setCart((c) =>
      c
        .map((i) => (i.sku === sku ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0)
    );
  };

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  if (!cajaAbierta) {
    return (
      <div style={{ ...cardStyle, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "28px 16px" }}>
        <AlertTriangle size={22} color={COLORS.danger} />
        <div style={{ fontSize: 14, fontWeight: 600, textAlign: "center" }}>
          Abre la caja antes de vender
        </div>
        <div style={{ fontSize: 12, color: COLORS.textSoft, textAlign: "center" }}>
          Ve a la pestaña Caja para iniciar el turno.
        </div>
      </div>
    );
  }

  if (boleta) {
    return <BoletaPreview boleta={boleta} onClose={() => setBoleta(null)} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ position: "relative" }}>
        <Search size={15} color={COLORS.textSoft} style={{ position: "absolute", left: 10, top: 11 }} />
        <input
          placeholder="Buscar producto o SKU"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ ...inputStyle, paddingLeft: 32 }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {filtered.map((p) => (
          <button
            key={p.sku}
            onClick={() => addToCart(p)}
            disabled={p.stock <= 0}
            style={{
              textAlign: "left",
              background: COLORS.surface,
              border: `0.5px solid ${COLORS.border}`,
              borderRadius: 10,
              padding: "10px 10px",
              cursor: p.stock <= 0 ? "not-allowed" : "pointer",
              opacity: p.stock <= 0 ? 0.5 : 1,
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 2, lineHeight: 1.3 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: COLORS.textSoft }}>{p.sku}</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.accentDark }}>{money(p.price)}</span>
              <span style={{ fontSize: 11, color: p.stock <= 3 ? COLORS.danger : COLORS.textSoft }}>
                stock {p.stock}
              </span>
            </div>
          </button>
        ))}
      </div>

      {cart.length > 0 && (
        <div style={{ ...cardStyle, position: "sticky", bottom: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Venta actual</div>
          {cart.map((i) => (
            <div key={i.sku} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0" }}>
              <div style={{ fontSize: 12.5, flex: 1 }}>{i.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => changeQty(i.sku, -1)} style={qtyBtn}><Minus size={11} /></button>
                <span style={{ fontSize: 12.5, width: 16, textAlign: "center" }}>{i.qty}</span>
                <button onClick={() => changeQty(i.sku, 1)} style={qtyBtn}><Plus size={11} /></button>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600, width: 64, textAlign: "right" }}>
                {money(i.price * i.qty)}
              </div>
            </div>
          ))}
          <div style={{ borderTop: `0.5px solid ${COLORS.border}`, margin: "8px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["Efectivo", "Débito", "Crédito"].map((m) => (
              <button
                key={m}
                onClick={() => {
                  const b = registrarVenta(cart, total, m);
                  setBoleta(b);
                  setCart([]);
                }}
                style={{ ...primaryBtn, flex: 1, fontSize: 12, padding: "9px 4px" }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BoletaPreview({ boleta, onClose }) {
  const [impresa, setImpresa] = useState(false);
  return (
    <div style={{ ...cardStyle, fontFamily: "monospace" }}>
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 12 }}>R.U.T: 76.264.675-7</div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>BOLETA ELECTRÓNICA</div>
        <div style={{ fontSize: 12 }}>N° {boleta.numero}</div>
        <div style={{ fontSize: 11, color: COLORS.textSoft }}>Panadería — Sucursal Independencia</div>
        <div style={{ fontSize: 11, color: COLORS.textSoft }}>{boleta.fecha}</div>
      </div>
      <div style={{ borderTop: `1px dashed ${COLORS.border}`, margin: "8px 0" }} />
      {boleta.items.map((i) => (
        <div key={i.sku} style={{ fontSize: 12, marginBottom: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{i.name}</span>
            <span>{money(i.price * i.qty)}</span>
          </div>
          <div style={{ fontSize: 11, color: COLORS.textSoft }}>{i.qty} x {money(i.price)}</div>
        </div>
      ))}
      <div style={{ borderTop: `1px dashed ${COLORS.border}`, margin: "8px 0" }} />
      <SummaryRow label="Neto" value={money(boleta.neto)} />
      <SummaryRow label="IVA (19%)" value={money(boleta.iva)} />
      <SummaryRow label="Total" value={money(boleta.total)} bold />
      <div style={{ fontSize: 11, color: COLORS.textSoft, marginTop: 6 }}>Medio de pago: {boleta.medio}</div>
      <div
        style={{
          marginTop: 10,
          fontSize: 10.5,
          color: COLORS.textSoft,
          background: COLORS.accentSoft,
          borderRadius: 6,
          padding: "6px 8px",
          fontFamily: "sans-serif",
        }}
      >
        Prototipo: en producción, este DTE se genera vía API de un proveedor de facturación certificado (ej. Lioren, BaseAPI) y se envía al SII antes de imprimirse.
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12, fontFamily: "sans-serif" }}>
        <button onClick={onClose} style={{ ...secondaryBtn, flex: 1 }}>Nueva venta</button>
        <button
          onClick={() => setImpresa(true)}
          style={{ ...primaryBtn, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <Printer size={14} /> {impresa ? "Enviada" : "Imprimir"}
        </button>
      </div>
    </div>
  );
}

function ProductosView({ products }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {products.map((p) => (
        <div
          key={p.sku}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: COLORS.surface,
            border: `0.5px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: "10px 12px",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: COLORS.textSoft }}>{p.sku}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.accentDark }}>{money(p.price)}</div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: p.stock <= 3 ? COLORS.danger : COLORS.success,
              }}
            >
              stock {p.stock}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const cardStyle = {
  background: COLORS.surface,
  border: `0.5px solid ${COLORS.border}`,
  borderRadius: 12,
  padding: "14px 14px",
};
const labelStyle = { fontSize: 12, color: COLORS.textSoft, display: "block", marginBottom: 4 };
const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 10px",
  borderRadius: 8,
  border: `1px solid ${COLORS.border}`,
  fontSize: 13,
  outline: "none",
  background: COLORS.bg,
  color: COLORS.text,
};
const primaryBtn = {
  background: COLORS.accent,
  color: "#FFF",
  border: "none",
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
const secondaryBtn = {
  background: "transparent",
  color: COLORS.text,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
const qtyBtn = {
  width: 20,
  height: 20,
  borderRadius: 5,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.bg,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

export default function TiendaPrototipo() {
  const [view, setView] = useState("caja");
  const [products, setProducts] = useState(SEED_PRODUCTS);
  const [caja, setCaja] = useState({ abierta: false, montoInicial: 0, abiertaEn: null, ventas: [] });
  const [folio, setFolio] = useState(1111112);

  const abrirCaja = (monto) => {
    const now = new Date();
    setCaja({
      abierta: true,
      montoInicial: monto,
      abiertaEn: now.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
      ventas: [],
    });
    setView("vender");
  };

  const cerrarCaja = () => {
    setCaja({ abierta: false, montoInicial: 0, abiertaEn: null, ventas: [] });
  };

  const registrarVenta = (cart, total, medio) => {
    setProducts((ps) =>
      ps.map((p) => {
        const item = cart.find((i) => i.sku === p.sku);
        return item ? { ...p, stock: p.stock - item.qty } : p;
      })
    );
    const neto = Math.round(total / 1.19);
    const iva = total - neto;
    const numero = folio;
    setFolio((f) => f + 1);
    const nueva = {
      numero,
      items: cart,
      total,
      neto,
      iva,
      medio,
      fecha: new Date().toLocaleString("es-CL"),
    };
    setCaja((c) => ({ ...c, ventas: [...c.ventas, nueva] }));
    return nueva;
  };

  return (
    <div
      style={{
        fontFamily: "Inter, -apple-system, sans-serif",
        background: COLORS.bg,
        borderRadius: 16,
        padding: 16,
        maxWidth: 380,
        margin: "0 auto",
        color: COLORS.text,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600&display=swap');
        input:focus { border-color: ${COLORS.accent} !important; }
      `}</style>
      <Header view={view} setView={setView} cajaAbierta={caja.abierta} />
      {view === "vender" && (
        <VenderView products={products} cajaAbierta={caja.abierta} registrarVenta={registrarVenta} />
      )}
      {view === "caja" && <CajaView caja={caja} abrirCaja={abrirCaja} cerrarCaja={cerrarCaja} />}
      {view === "productos" && <ProductosView products={products} />}
    </div>
  );
}
