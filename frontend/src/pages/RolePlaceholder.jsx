import { Coffee, LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import RoleBadge from "../components/RoleBadge";

// Vista base para cajero y barista. Sus pantallas reales llegan en
// Fase 2 (POS/caja) y Fase 5 (panel del barista).
export default function RolePlaceholder({ titulo, descripcion }) {
  const { usuario, logout } = useAuth();

  return (
    <div className="min-h-full bg-frappe-bg">
      <header className="flex items-center justify-between border-b border-frappe-border bg-frappe-surface px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-frappe-accent text-white">
            <Coffee size={16} />
          </div>
          <span className="font-serif text-lg font-semibold text-frappe-text">
            Gestión Frappé
          </span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-lg border border-frappe-border px-3 py-1.5 text-sm font-medium text-frappe-text transition hover:bg-frappe-bg"
        >
          <LogOut size={14} />
          Salir
        </button>
      </header>

      <main className="mx-auto max-w-lg px-5 py-10">
        <div className="rounded-2xl border border-frappe-border bg-frappe-surface p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm text-frappe-textSoft">{usuario?.nombre}</span>
            <RoleBadge rol={usuario?.rol} />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-frappe-text">{titulo}</h1>
          <p className="mt-3 text-sm text-frappe-textSoft">{descripcion}</p>
        </div>
      </main>
    </div>
  );
}
