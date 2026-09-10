// Config compartida de estados del pedido (barista y caja).
export const ESTADO = {
  pendiente:      { label: "En espera",      cls: "bg-frappe-dangerSoft text-frappe-danger" },
  en_preparacion: { label: "En preparación", cls: "bg-frappe-accentSoft text-frappe-accentDark" },
  listo:          { label: "Listo",          cls: "bg-frappe-successSoft text-frappe-success" },
  entregado:      { label: "Entregado",      cls: "bg-frappe-bg text-frappe-textSoft" },
  // Legado (antes existía 'preparado'); se muestra como Listo.
  preparado:      { label: "Listo",          cls: "bg-frappe-successSoft text-frappe-success" },
};

export const estadoInfo = (e) => ESTADO[e] || ESTADO.pendiente;
