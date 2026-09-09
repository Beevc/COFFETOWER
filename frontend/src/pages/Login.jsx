import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Coffee, Lock, Mail, Loader2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await login(email.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error || "No se pudo iniciar sesión";
      setError(msg);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-frappe-bg px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Marca */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-frappe-accent text-white shadow-sm">
            <Coffee size={26} />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-frappe-text">
            Gestión Frappé
          </h1>
          <p className="mt-1 text-sm text-frappe-textSoft">
            Inicia sesión para continuar
          </p>
        </div>

        {/* Tarjeta */}
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-frappe-border bg-frappe-surface p-6 shadow-sm"
        >
          {error && (
            <div className="mb-4 rounded-lg bg-frappe-dangerSoft px-3 py-2 text-sm font-medium text-frappe-danger">
              {error}
            </div>
          )}

          <label className="mb-1 block text-sm text-frappe-textSoft">Email</label>
          <div className="relative mb-4">
            <Mail
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-frappe-textSoft"
            />
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@frappe.local"
              required
              className="w-full rounded-lg border border-frappe-border bg-frappe-bg py-2.5 pl-9 pr-3 text-sm text-frappe-text outline-none focus:border-frappe-accent"
            />
          </div>

          <label className="mb-1 block text-sm text-frappe-textSoft">Contraseña</label>
          <div className="relative mb-5">
            <Lock
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-frappe-textSoft"
            />
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-lg border border-frappe-border bg-frappe-bg py-2.5 pl-9 pr-3 text-sm text-frappe-text outline-none focus:border-frappe-accent"
            />
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-frappe-accent py-2.5 text-sm font-semibold text-white transition hover:bg-frappe-accentDark disabled:opacity-60"
          >
            {enviando && <Loader2 size={16} className="animate-spin" />}
            {enviando ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-frappe-textSoft">
          Tienda de frappé · un solo local
        </p>
      </div>
    </div>
  );
}
