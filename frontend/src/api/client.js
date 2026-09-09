import axios from "axios";

const TOKEN_KEY = "frappe_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// En desarrollo usamos el proxy de Vite ("/api"). En producción (Vercel)
// se define VITE_API_URL con la URL del backend en Render (ej.
// https://frappe-api.onrender.com/api).
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api" });

// Adjunta el token en cada request.
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si el token expira o es inválido, limpiamos la sesión.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      tokenStore.clear();
      // Evita bucles si ya estamos en el login.
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
