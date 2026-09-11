import { X } from "lucide-react";

export default function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-frappe-border bg-frappe-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado fijo */}
        <div className="flex shrink-0 items-center justify-between border-b border-frappe-border px-6 py-4">
          <h2 className="font-serif text-lg font-semibold text-frappe-text">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-frappe-textSoft transition hover:bg-frappe-bg"
          >
            <X size={18} />
          </button>
        </div>
        {/* Cuerpo desplazable */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 [-webkit-overflow-scrolling:touch]">
          {children}
        </div>
      </div>
    </div>
  );
}
