import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import Login from "./pages/Login";
import AdminLayout from "./pages/admin/AdminLayout";
import UsersPage from "./pages/admin/UsersPage";
import ProductsPage from "./pages/admin/ProductsPage";
import VentasPage from "./pages/admin/VentasPage";
import InsumosPage from "./pages/admin/InsumosPage";
import RecetasPage from "./pages/admin/RecetasPage";
import EstadisticasPage from "./pages/admin/EstadisticasPage";
import PromocionesPage from "./pages/admin/PromocionesPage";
import FidelidadPage from "./pages/admin/FidelidadPage";
import ConvenioPage from "./pages/admin/ConvenioPage";
import CajeroLayout from "./pages/cajero/CajeroLayout";
import VenderPage from "./pages/cajero/VenderPage";
import CajaPage from "./pages/cajero/CajaPage";
import BaristaPage from "./pages/barista/BaristaPage";

const HOME_POR_ROL = {
  admin: "/admin",
  cajero: "/cajero",
  barista: "/barista",
};

// Si ya hay sesión, /login redirige al panel del rol.
function LoginRoute() {
  const { usuario, cargando } = useAuth();
  if (cargando) return null;
  if (usuario) return <Navigate to={HOME_POR_ROL[usuario.rol] || "/"} replace />;
  return <Login />;
}

// "/" manda a cada quien a su panel según su rol.
function RoleRedirect() {
  const { usuario, cargando } = useAuth();
  if (cargando) return null;
  if (!usuario) return <Navigate to="/login" replace />;
  return <Navigate to={HOME_POR_ROL[usuario.rol] || "/login"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />

          {/* Panel de administración */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="estadisticas" replace />} />
            <Route path="estadisticas" element={<EstadisticasPage />} />
            <Route path="usuarios" element={<UsersPage />} />
            <Route path="productos" element={<ProductsPage />} />
            <Route path="insumos" element={<InsumosPage />} />
            <Route path="recetas" element={<RecetasPage />} />
            <Route path="promociones" element={<PromocionesPage />} />
            <Route path="fidelidad" element={<FidelidadPage />} />
            <Route path="convenio" element={<ConvenioPage />} />
            <Route path="ventas" element={<VentasPage />} />
          </Route>

          {/* Cajero: POS + caja */}
          <Route
            path="/cajero"
            element={
              <ProtectedRoute roles={["cajero"]}>
                <CajeroLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="vender" replace />} />
            <Route path="vender" element={<VenderPage />} />
            <Route path="caja" element={<CajaPage />} />
          </Route>

          {/* Barista: panel de pedidos */}
          <Route
            path="/barista"
            element={
              <ProtectedRoute roles={["barista"]}>
                <BaristaPage />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<RoleRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
