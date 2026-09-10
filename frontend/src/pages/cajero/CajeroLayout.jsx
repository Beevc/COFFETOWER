import { NavLink, Outlet } from "react-router-dom";
import { Coffee, LogOut, Receipt, Wallet, Lock, Unlock, CupSoda, Users } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { CajaProvider, useCaja } from "./CajaContext";

const navItems = [
  { to: "/cajero/vender", label: "Vender", icon: Receipt },
  { to: "/cajero/pedidos", label: "Pedidos", icon: CupSoda },
  { to: "/cajero/clientes", label: "Clientes", icon: Users },
  { to: "/cajero/caja", label: "Caja", icon: Wallet },
];

function EstadoCajaBadge() {
  const { abierta, cargando } = useCaja();
  if (cargando) return null;
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        abierta
          ? "bg-frappe-successSoft text-frappe-success"
          : "bg-frappe-dangerSoft text-frappe-danger"
      }`}
    >
      {abierta ? <Unlock size={12} /> : <Lock size={12} />}
      {abierta ? "Caja abierta" : "Caja cerrada"}
    </span>
  );
}

function Shell() {
  const { usuario, logout } = useAuth();
  return (
    <div className="min-h-full bg-frappe-bg">
      <header className="border-b border-frappe-border bg-frappe-surface">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-frappe-accent text-white">
              <Coffee size={16} />
            </div>
            <div>
              <div className="font-serif text-base font-semibold leading-tight text-frappe-text">
                Gestión Frappé
              </div>
              <div className="text-xs text-frappe-textSoft">{usuario?.nombre}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <EstadoCajaBadge />
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg border border-frappe-border px-2.5 py-1.5 text-sm font-medium text-frappe-text transition hover:bg-frappe-bg"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-2xl gap-1 px-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "border-frappe-accent text-frappe-accentDark"
                    : "border-transparent text-frappe-textSoft hover:text-frappe-text"
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">
        <Outlet />
      </main>
    </div>
  );
}

export default function CajeroLayout() {
  return (
    <CajaProvider>
      <Shell />
    </CajaProvider>
  );
}
