import { useEffect, useState } from "react";
import { Plus, Pencil, Eye, EyeOff, Loader2, Search } from "lucide-react";
import { productsApi } from "../../api/products";
import { money } from "../../utils/format";
import ProductFormModal from "./ProductFormModal";

const FILTROS = [
  { id: "todos", label: "Todos" },
  { id: "activo", label: "Activos" },
  { id: "inactivo", label: "Inactivos" },
];

export default function ProductsPage() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [modal, setModal] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const cargar = async (params) => {
    setError("");
    try {
      const data = await productsApi.list(params);
      setProductos(data);
    } catch {
      setError("No se pudieron cargar los productos");
    } finally {
      setCargando(false);
    }
  };

  // Recarga con debounce cuando cambian la búsqueda o el filtro.
  useEffect(() => {
    const params = {};
    if (q.trim()) params.q = q.trim();
    if (filtro !== "todos") params.activo = filtro === "activo";
    const t = setTimeout(() => cargar(params), 250);
    return () => clearTimeout(t);
  }, [q, filtro]);

  const onSaved = (p) => {
    setProductos((prev) => {
      const existe = prev.some((x) => x.id === p.id);
      return existe ? prev.map((x) => (x.id === p.id ? p : x)) : [p, ...prev];
    });
    setModal(null);
  };

  const toggleActivo = async (p) => {
    setError("");
    setTogglingId(p.id);
    try {
      const actualizado = await productsApi.update(p.id, { activo: !p.activo });
      setProductos((prev) => prev.map((x) => (x.id === p.id ? actualizado : x)));
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo cambiar el estado");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-semibold text-frappe-text">Productos</h1>
          <p className="text-sm text-frappe-textSoft">
            Frappés y otros ítems a la venta.
          </p>
        </div>
        <button
          onClick={() => setModal({ modo: "crear" })}
          className="flex items-center gap-1.5 rounded-lg bg-frappe-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-frappe-accentDark"
        >
          <Plus size={16} />
          Nuevo producto
        </button>
      </div>

      {/* Búsqueda + filtro */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-frappe-textSoft"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o SKU"
            className="w-full rounded-lg border border-frappe-border bg-frappe-surface py-2 pl-9 pr-3 text-sm text-frappe-text outline-none focus:border-frappe-accent"
          />
        </div>
        <div className="flex gap-1 rounded-lg bg-frappe-accentSoft p-1">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                filtro === f.id
                  ? "bg-frappe-surface text-frappe-accentDark shadow-sm"
                  : "text-frappe-textSoft hover:text-frappe-text"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">
          {error}
        </div>
      )}

      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-16 text-frappe-textSoft">
          <Loader2 size={18} className="animate-spin" /> Cargando…
        </div>
      ) : productos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-frappe-border bg-frappe-surface py-16 text-center text-sm text-frappe-textSoft">
          No hay productos que coincidan.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-frappe-border bg-frappe-surface">
          {productos.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                i > 0 ? "border-t border-frappe-border" : ""
              } ${!p.activo ? "opacity-60" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-frappe-text">
                  {p.nombre}
                </div>
                <div className="truncate text-xs text-frappe-textSoft">
                  {p.sku}
                  {p.categoriaPath?.length ? ` · ${p.categoriaPath.join(" › ")}` : ""}
                </div>
              </div>

              <span className="text-sm font-bold text-frappe-accentDark">
                {money(p.precio)}
              </span>

              <span
                className={`hidden w-20 text-center text-xs font-semibold sm:inline ${
                  p.activo ? "text-frappe-success" : "text-frappe-danger"
                }`}
              >
                {p.activo ? "Activo" : "Inactivo"}
              </span>

              <div className="flex items-center gap-1">
                <button
                  title="Editar"
                  onClick={() => setModal({ modo: "editar", producto: p })}
                  className="rounded-lg p-2 text-frappe-textSoft transition hover:bg-frappe-bg hover:text-frappe-text"
                >
                  <Pencil size={15} />
                </button>
                <button
                  title={p.activo ? "Desactivar" : "Activar"}
                  disabled={togglingId === p.id}
                  onClick={() => toggleActivo(p)}
                  className="rounded-lg p-2 text-frappe-textSoft transition hover:bg-frappe-bg hover:text-frappe-text disabled:opacity-40"
                >
                  {togglingId === p.id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : p.activo ? (
                    <EyeOff size={15} />
                  ) : (
                    <Eye size={15} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ProductFormModal
          modo={modal.modo}
          producto={modal.producto}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
