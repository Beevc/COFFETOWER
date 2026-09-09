import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "../../components/Modal";
import { productsApi } from "../../api/products";
import { categoriasApi } from "../../api/categorias";

const inputCls =
  "w-full rounded-lg border border-frappe-border bg-frappe-bg px-3 py-2.5 text-sm text-frappe-text outline-none focus:border-frappe-accent";
const labelCls = "mb-1 block text-sm text-frappe-textSoft";

export default function ProductFormModal({ modo, producto, onClose, onSaved }) {
  const esEditar = modo === "editar";
  const [sku, setSku] = useState(producto?.sku || "");
  const [nombre, setNombre] = useState(producto?.nombre || "");
  const [precio, setPrecio] = useState(producto?.precio ?? "");
  // Categorías encadenadas (nivel 1 → 2 → 3). Guardamos el id de cada nivel elegido.
  const [cats, setCats] = useState([]);
  const [cat1, setCat1] = useState("");
  const [cat2, setCat2] = useState("");
  const [cat3, setCat3] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Carga las categorías y, si estamos editando, reconstruye la cadena desde categoriaId.
  useEffect(() => {
    categoriasApi.list().then((lista) => {
      setCats(lista);
      const id = producto?.categoriaId;
      if (!id) return;
      const byId = (x) => lista.find((c) => c.id === x);
      const nodo = byId(id);
      if (!nodo) return;
      if (nodo.nivel === 3) { setCat3(String(nodo.id)); setCat2(String(nodo.parentId)); const p = byId(nodo.parentId); setCat1(String(p?.parentId)); }
      else if (nodo.nivel === 2) { setCat2(String(nodo.id)); setCat1(String(nodo.parentId)); }
      else { setCat1(String(nodo.id)); }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hijosDe = (parentId) =>
    cats.filter((c) => c.parentId === (parentId ? Number(parentId) : null) && c.activo);

  const nivel1 = hijosDe(null);
  const nivel2 = cat1 ? hijosDe(cat1) : [];
  const nivel3 = cat2 ? hijosDe(cat2) : [];

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      // El id de categoría es el nivel más específico elegido.
      const categoriaId = cat3 ? Number(cat3) : cat2 ? Number(cat2) : cat1 ? Number(cat1) : null;
      const data = {
        sku: sku.trim(),
        nombre: nombre.trim(),
        precio: Math.trunc(Number(precio)),
        categoriaId,
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
        {nivel1.length === 0 ? (
          <p className="mb-5 rounded-lg border border-dashed border-frappe-border bg-frappe-bg px-3 py-2 text-xs text-frappe-textSoft">
            Aún no hay categorías. Créalas en la pestaña <b>Categorías</b> para poder asignarlas.
          </p>
        ) : (
          <div className="mb-5 space-y-2">
            <select
              className={inputCls}
              value={cat1}
              onChange={(e) => { setCat1(e.target.value); setCat2(""); setCat3(""); }}
            >
              <option value="">— Categoría —</option>
              {nivel1.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            {cat1 && nivel2.length > 0 && (
              <select
                className={inputCls}
                value={cat2}
                onChange={(e) => { setCat2(e.target.value); setCat3(""); }}
              >
                <option value="">— Subcategoría —</option>
                {nivel2.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            )}
            {cat2 && nivel3.length > 0 && (
              <select
                className={inputCls}
                value={cat3}
                onChange={(e) => setCat3(e.target.value)}
              >
                <option value="">— Con / sin café —</option>
                {nivel3.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            )}
          </div>
        )}

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
