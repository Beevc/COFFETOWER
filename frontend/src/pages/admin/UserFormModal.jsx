import { useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "../../components/Modal";
import { usersApi } from "../../api/users";

const inputCls =
  "w-full rounded-lg border border-frappe-border bg-frappe-bg px-3 py-2.5 text-sm text-frappe-text outline-none focus:border-frappe-accent";
const labelCls = "mb-1 block text-sm text-frappe-textSoft";

export default function UserFormModal({ modo, usuario, onClose, onSaved }) {
  const esEditar = modo === "editar";
  const [nombre, setNombre] = useState(usuario?.nombre || "");
  const [email, setEmail] = useState(usuario?.email || "");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState(usuario?.rol || "cajero");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      if (esEditar) {
        const data = { nombre, rol };
        if (password) data.password = password; // solo si se ingresó una nueva
        const actualizado = await usersApi.update(usuario.id, data);
        onSaved(actualizado);
      } else {
        const creado = await usersApi.create({ nombre, email, password, rol });
        onSaved(creado);
      }
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
    <Modal title={esEditar ? "Editar usuario" : "Nuevo usuario"} onClose={onClose}>
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
        />

        <label className={labelCls}>Email</label>
        <input
          type="email"
          className={`${inputCls} mb-3 ${esEditar ? "opacity-60" : ""}`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={esEditar}
          placeholder="persona@frappe.local"
        />
        {esEditar && (
          <p className="-mt-2 mb-3 text-xs text-frappe-textSoft">
            El email no se puede cambiar (es el identificador de acceso).
          </p>
        )}

        <label className={labelCls}>
          {esEditar ? "Nueva contraseña (opcional)" : "Contraseña"}
        </label>
        <input
          type="password"
          className={`${inputCls} mb-3`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required={!esEditar}
          placeholder={esEditar ? "Dejar en blanco para mantenerla" : "Mínimo 6 caracteres"}
        />

        <label className={labelCls}>Rol</label>
        <select
          className={`${inputCls} mb-5`}
          value={rol}
          onChange={(e) => setRol(e.target.value)}
        >
          <option value="cajero">Cajero/a</option>
          <option value="barista">Barista</option>
          <option value="admin">Administrador</option>
        </select>

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
