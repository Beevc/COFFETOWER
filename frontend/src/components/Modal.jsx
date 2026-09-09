import { X } from "lucide-react";

export default function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-frappe-border bg-frappe-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-frappe-text">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-frappe-textSoft transition hover:bg-frappe-bg"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
