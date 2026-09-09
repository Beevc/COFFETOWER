import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

// Protege rutas: exige sesión y, opcionalmente, ciertos roles.
export default function ProtectedRoute({ children, roles }) {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="flex h-full items-center justify-center text-frappe-textSoft">
        Cargando…
      </div>
    );
  }

  if (!usuario) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(usuario.rol)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
