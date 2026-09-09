import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { tokenStore } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Al montar: si hay token, hidratamos el usuario con /auth/me.
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setCargando(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => setUsuario(res.data.usuario))
      .catch(() => tokenStore.clear())
      .finally(() => setCargando(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    tokenStore.set(res.data.token);
    setUsuario(res.data.usuario);
    return res.data.usuario;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUsuario(null);
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
