export const CATEGORIAS = [
  { id: "insumos", label: "Insumos" },
  { id: "arriendo", label: "Arriendo" },
  { id: "sueldos", label: "Sueldos" },
  { id: "servicios", label: "Servicios" },
  { id: "equipamiento", label: "Equipamiento" },
  { id: "otros", label: "Otros" },
];

export const MEDIOS = [
  { id: "efectivo", label: "Efectivo" },
  { id: "debito", label: "Débito" },
  { id: "credito", label: "Crédito" },
  { id: "transferencia", label: "Transferencia" },
];

export const catLabel = (id) => CATEGORIAS.find((c) => c.id === id)?.label || id;
export const medioLabel = (id) => MEDIOS.find((m) => m.id === id)?.label || id;

export const ESTADO_FACTURA = {
  pendiente: { label: "Pendiente", cls: "bg-frappe-dangerSoft text-frappe-danger" },
  parcial: { label: "Parcial", cls: "bg-frappe-accentSoft text-frappe-accentDark" },
  pagada: { label: "Pagada", cls: "bg-frappe-successSoft text-frappe-success" },
};

export const ESTADO_CUOTA = {
  pendiente: { label: "Pendiente", cls: "bg-frappe-bg text-frappe-textSoft" },
  vencida: { label: "Vencida", cls: "bg-frappe-dangerSoft text-frappe-danger" },
  pagada: { label: "Pagada", cls: "bg-frappe-successSoft text-frappe-success" },
};

export const FRECUENCIAS = [
  { id: "mensual", label: "Mensual" },
  { id: "quincenal", label: "Quincenal" },
  { id: "semanal", label: "Semanal" },
];

export const hoyISO = () => new Date().toISOString().slice(0, 10);

// Suma días a una fecha ISO (YYYY-MM-DD).
function addDiasISO(iso, dias) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Suma meses a una fecha ISO, ajustando si el día no existe (ej. 31 → último día).
function addMesesISO(iso, meses) {
  const [y, m, day] = iso.split("-").map(Number);
  const d = new Date(y, m - 1 + meses, day);
  if (d.getDate() !== day) d.setDate(0);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Genera un plan de cuotas de montos iguales (el resto se ajusta en la última).
// total: entero (CLP), cantidad: N° de cuotas, primeraFecha: ISO, frecuencia: mensual|quincenal|semanal
export function construirCuotas(total, cantidad, primeraFecha, frecuencia) {
  const n = Math.max(1, Math.trunc(cantidad));
  const base = Math.floor(total / n);
  const cuotas = [];
  let venc = primeraFecha;
  for (let i = 0; i < n; i++) {
    const monto = i === n - 1 ? total - base * (n - 1) : base;
    cuotas.push({ monto, fechaVencimiento: venc });
    if (frecuencia === "mensual") venc = addMesesISO(primeraFecha, i + 1);
    else if (frecuencia === "quincenal") venc = addDiasISO(venc, 15);
    else venc = addDiasISO(venc, 7);
  }
  return cuotas;
}
