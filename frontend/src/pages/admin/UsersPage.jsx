import { useEffect, useState } from "react";
import { Plus, Pencil, UserCheck, UserX, Loader2 } from "lucide-react";
import { usersApi } from "../../api/users";
import { useAuth } from "../../auth/AuthContext";
import RoleBadge from "../../components/RoleBadge";
import UserFormModal from "./UserFormModal";

export default function UsersPage() {
  const { usuario: yo } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // { modo, usuario }
  const [togglingId, setTogglingId] = useState(null);

  const cargar = async () => {
    setCargando(true);
    setError("");
    try {
      setUsuarios(await usersApi.list());
    } catch {
      setError("No se pudieron cargar los usuarios");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const onSaved = (u) => {
    setUsuarios((prev) => {
      const existe = prev.some((x) => x.id === u.id);
      return existe ? prev.map((x) => (x.id === u.id ? u : x)) : [...prev, u];
    });
    setModal(null);
  };

  const toggleActivo = async (u) => {
    setError("");
    setTogglingId(u.id);
    try {
      const actualizado = await usersApi.update(u.id, { activo: !u.activo });
      setUsuarios((prev) => prev.map((x) => (x.id === u.id ? actualizado : x)));
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
          <h1 className="font-serif text-xl font-semibold text-frappe-text">Usuarios</h1>
          <p className="text-sm text-frappe-textSoft">
            Administra las cuentas de cajero, barista y administración.
          </p>
        </div>
        <button
          onClick={() => setModal({ modo: "crear" })}
          className="flex items-center gap-1.5 rounded-lg bg-frappe-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-frappe-accentDark"
        >
          <Plus size={16} />
          Nuevo usuario
        </button>
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
      ) : (
        <div className="overflow-hidden rounded-xl border border-frappe-border bg-frappe-surface">
          {usuarios.map((u, i) => (
            <div
              key={u.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                i > 0 ? "border-t border-frappe-border" : ""
              } ${!u.activo ? "opacity-60" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-frappe-text">
                    {u.nombre}
                  </span>
                  {u.id === yo.id && (
                    <span className="text-xs text-frappe-textSoft">(tú)</span>
                  )}
                </div>
                <div className="truncate text-xs text-frappe-textSoft">{u.email}</div>
              </div>

              <RoleBadge rol={u.rol} />

              <span
                className={`hidden w-20 text-center text-xs font-semibold sm:inline ${
                  u.activo ? "text-frappe-success" : "text-frappe-danger"
                }`}
              >
                {u.activo ? "Activo" : "Inactivo"}
              </span>

              <div className="flex items-center gap-1">
                <button
                  title="Editar"
                  onClick={() => setModal({ modo: "editar", usuario: u })}
                  className="rounded-lg p-2 text-frappe-textSoft transition hover:bg-frappe-bg hover:text-frappe-text"
                >
                  <Pencil size={15} />
                </button>
                <button
                  title={u.activo ? "Desactivar" : "Activar"}
                  disabled={u.id === yo.id || togglingId === u.id}
                  onClick={() => toggleActivo(u)}
                  className="rounded-lg p-2 text-frappe-textSoft transition hover:bg-frappe-bg hover:text-frappe-text disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {togglingId === u.id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : u.activo ? (
                    <UserX size={15} />
                  ) : (
                    <UserCheck size={15} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <UserFormModal
          modo={modal.modo}
          usuario={modal.usuario}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
