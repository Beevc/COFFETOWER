import { useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "../../components/Modal";
import { productsApi } from "../../api/products";

const inputCls =
  "w-full rounded-lg border border-frappe-border bg-frappe-bg px-3 py-2.5 text-sm text-frappe-text outline-none focus:border-frappe-accent";
const labelCls = "mb-1 block text-sm text-frappe-textSoft";

export default function ProductFormModal({ modo, producto, onClose, onSaved }) {
  const esEditar = modo === "editar";
  const [sku, setSku] = useState(producto?.sku || "");
  const [nombre, setNombre] = useState(producto?.nombre || "");
  const [precio, setPrecio] = useState(producto?.precio ?? "");
  const [categoria, setCategoria] = useState(producto?.categoria || "");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      const data = {
        sku: sku.trim(),
        nombre: nombre.trim(),
        precio: Math.trunc(Number(precio)),
        categoria: categoria.trim() || null,
      };
      const guardado = esEditar
        ? await productsApi.update(producto.id, data)
        : await productsApi.create(data);
      onSaved(guardado);
    } catch (err) {
      const d = err.response?.data;
      const msg =
        d?.detalles?.map((x) => x.mensaje).join(" · ") ||
        d?.error ||
        "No se pudo guardar";
      setError(msg);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal title={esEditar ? "Editar producto" : "Nuevo producto"} onClose={onClose}>
      <form onSubmit={onSubmit}>
        {error && (
          <div className="mb-4 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">
            {error}
          </div>
        )}

        <label className={labelCls}>Nombre</label>
        <input
          className={`${inputCls} mb-3`}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          placeholder="Frappé Moka"
        />

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>SKU</label>
            <input
              className={inputCls}
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              required
              placeholder="FRP-003"
            />
          </div>
          <div>
            <label className={labelCls}>Precio (CLP)</label>
            <input
              type="number"
              min="0"
              step="1"
              className={inputCls}
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              required
              placeholder="3500"
            />
          </div>
        </div>

        <label className={labelCls}>Categoría (opcional)</label>
        <input
          className={`${inputCls} mb-5`}
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          placeholder="Frappé, Topping, Bebida…"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-frappe-border py-2.5 text-sm font-semibold text-frappe-text transition hover:bg-frappe-bg"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-frappe-accent py-2.5 text-sm font-semibold text-white transition hover:bg-frappe-accentDark disabled:opacity-60"
          >
            {guardando && <Loader2 size={15} className="animate-spin" />}
            {esEditar ? "Guardar" : "Crear"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
