import { NavLink, Outlet } from "react-router-dom";
import { Coffee, LogOut, Users, Package, Wallet, Boxes, BookOpen, BarChart3, Tag, Star, Gift, Layers } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";

const navItems = [
  { to: "/admin/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { to: "/admin/ventas", label: "Ventas", icon: Wallet },
  { to: "/admin/productos", label: "Productos", icon: Package },
  { to: "/admin/categorias", label: "Categorías", icon: Layers },
  { to: "/admin/insumos", label: "Insumos", icon: Boxes },
  { to: "/admin/recetas", label: "Recetas", icon: BookOpen },
  { to: "/admin/promociones", label: "Promociones", icon: Tag },
  { to: "/admin/fidelidad", label: "Fidelidad", icon: Star },
  { to: "/admin/convenio", label: "Convenio", icon: Gift },
  { to: "/admin/usuarios", label: "Usuarios", icon: Users },
];

export default function AdminLayout() {
  const { usuario, logout } = useAuth();

  return (
    <div className="min-h-full bg-frappe-bg">
      <header className="border-b border-frappe-border bg-frappe-surface">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-frappe-accent text-white">
              <Coffee size={16} />
            </div>
            <div>
              <div className="font-serif text-base font-semibold leading-tight text-frappe-text">
                Gestión Frappé
              </div>
              <div className="text-xs text-frappe-textSoft">Panel de administración</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-frappe-textSoft sm:inline">
              {usuario?.nombre}
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg border border-frappe-border px-3 py-1.5 text-sm font-medium text-frappe-text transition hover:bg-frappe-bg"
            >
              <LogOut size={14} />
              Salir
            </button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
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

      <main className="mx-auto max-w-4xl px-5 py-6">
        <Outlet />
      </main>
    </div>
  );
}
