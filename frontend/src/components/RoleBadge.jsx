const ESTILOS = {
  admin: "bg-frappe-accentSoft text-frappe-accentDark",
  cajero: "bg-frappe-successSoft text-frappe-success",
  barista: "bg-frappe-dangerSoft text-frappe-danger",
  cajero_barista: "bg-frappe-accentSoft text-frappe-accentDark",
};

const LABEL = {
  admin: "Administrador",
  cajero: "Cajero/a",
  barista: "Barista",
  cajero_barista: "Cajero/a y Barista",
};

export default function RoleBadge({ rol }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        ESTILOS[rol] || "bg-frappe-bg text-frappe-textSoft"
      }`}
    >
      {LABEL[rol] || rol}
    </span>
  );
}
