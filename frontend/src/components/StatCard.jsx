import { ArrowUp, ArrowDown } from "lucide-react";

const TONES = {
  accent: "bg-frappe-accentSoft text-frappe-accentDark",
  success: "bg-frappe-successSoft text-frappe-success",
  danger: "bg-frappe-dangerSoft text-frappe-danger",
  neutral: "bg-frappe-bg text-frappe-textSoft",
};

// Tarjeta de indicador (KPI) con ícono, valor y detalle opcional.
export default function StatCard({ label, value, icon: Icon, tone = "accent", sub, delta }) {
  return (
    <div className="rounded-2xl border border-frappe-border bg-frappe-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-frappe-textSoft">{label}</span>
        {Icon && (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${TONES[tone] || TONES.accent}`}>
            <Icon size={16} />
          </span>
        )}
      </div>
      <div className="mt-2 text-xl font-bold leading-tight text-frappe-text sm:text-2xl">{value}</div>
      <div className="mt-0.5 flex items-center gap-1.5">
        {delta != null && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${delta >= 0 ? "text-frappe-success" : "text-frappe-danger"}`}>
            {delta >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}{delta > 0 ? "+" : ""}{delta}%
          </span>
        )}
        {sub && <span className="text-xs text-frappe-textSoft">{sub}</span>}
      </div>
    </div>
  );
}
