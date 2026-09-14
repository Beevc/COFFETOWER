import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Coffee, LogOut, Users, Package, Wallet, Boxes, BookOpen, BarChart3, Tag, Star, Gift,
  Layers, Landmark, Banknote, ClipboardList, SlidersHorizontal, Menu, X,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";

// Menú agrupado del panel.
const GRUPOS = [
  { titulo: "Panel", items: [{ to: "/admin/estadisticas", label: "Estadísticas", icon: BarChart3 }] },
  { titulo: "Ventas y caja", items: [
    { to: "/admin/finanzas", label: "Finanzas", icon: Landmark },
    { to: "/admin/caja", label: "Caja", icon: Banknote },
    { to: "/admin/ventas", label: "Ventas", icon: Wallet },
  ] },
  { titulo: "Catálogo", items: [
    { to: "/admin/productos", label: "Productos", icon: Package },
    { to: "/admin/categorias", label: "Categorías", icon: Layers },
    { to: "/admin/opciones", label: "Opciones", icon: SlidersHorizontal },
    { to: "/admin/insumos", label: "Insumos", icon: Boxes },
    { to: "/admin/inventario", label: "Inventario", icon: ClipboardList },
    { to: "/admin/recetas", label: "Recetas", icon: BookOpen },
  ] },
  { titulo: "Marketing", items: [
    { to: "/admin/promociones", label: "Promociones", icon: Tag },
    { to: "/admin/fidelidad", label: "Fidelidad", icon: Star },
    { to: "/admin/convenio", label: "Convenio", icon: Gift },
  ] },
  { titulo: "Sistema", items: [{ to: "/admin/usuarios", label: "Usuarios", icon: Users }] },
];

function SidebarContent({ onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      {/* Marca */}
      <div className="flex items-center gap-2.5 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-frappe-accent text-white shadow">
          <Coffee size={18} />
        </div>
        <div>
          <div className="font-serif text-lg font-semibold leading-none text-white">Coffetower</div>
          <div className="mt-0.5 text-[11px] text-white/50">Administración</div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2">
        {GRUPOS.map((g) => (
          <div key={g.titulo}>
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/35">{g.titulo}</div>
            <div className="space-y-0.5">
              {g.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isActive ? "bg-frappe-accent text-white shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}

export default function AdminLayout() {
  const { usuario, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-frappe-bg">
      {/* Sidebar fijo (pantallas grandes) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 bg-frappe-sidebar lg:block">
        <SidebarContent />
      </aside>

      {/* Cajón deslizable (móvil/tablet) */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-frappe-sidebar shadow-xl">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-3 rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white">
              <X size={18} />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* Contenido */}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-frappe-border bg-frappe-surface/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <button onClick={() => setOpen(true)} className="rounded-lg border border-frappe-border p-2 text-frappe-text lg:hidden">
              <Menu size={18} />
            </button>
            <span className="font-serif text-base font-semibold text-frappe-text lg:hidden">Coffetower</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-frappe-textSoft sm:inline">{usuario?.nombre}</span>
            <button onClick={logout} className="flex items-center gap-1.5 rounded-lg border border-frappe-border px-3 py-1.5 text-sm font-medium text-frappe-text transition hover:bg-frappe-bg">
              <LogOut size={14} /> Salir
            </button>
          </div>
        </header>

        <main key={location.pathname} className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
