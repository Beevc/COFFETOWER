// Gráfico de barras vertical simple (sin librerías).
// data: [{ label, short?, value, highlight? }]
export default function BarChart({ data, formatValue = (v) => v, height = 150, showValues = false }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center justify-end" title={`${d.label}: ${formatValue(d.value)}`}>
            {showValues && (
              <div className="mb-0.5 w-full truncate text-center text-[9px] font-semibold text-frappe-textSoft">
                {d.value > 0 ? formatValue(d.value) : ""}
              </div>
            )}
            <div
              className={`w-full rounded-t ${d.highlight ? "bg-frappe-honey" : "bg-frappe-accent"}`}
              style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 3 : 1, opacity: d.value > 0 ? 1 : 0.25 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1">
        {data.map((d, i) => (
          <div key={i} className="min-w-0 flex-1 truncate text-center text-[10px] text-frappe-textSoft">
            {d.short ?? d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
