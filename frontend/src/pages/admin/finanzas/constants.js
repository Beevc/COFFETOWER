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

export const hoyISO = () => new Date().toISOString().slice(0, 10);
