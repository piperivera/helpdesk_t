"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password: pass,
      redirect: false,
    });

    if (res?.error) {
      setError("Credenciales incorrectas.");
      setLoading(false);
      return;
    }

    window.location.href = "/";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="card w-full max-w-sm animate-fadeIn">
        {/* Logo + título */}
        <div className="text-center mb-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white font-bold shadow-soft">
            UPK
          </div>
          <h1 className="text-lg font-semibold mt-3 text-ink">
            Iniciar sesión
          </h1>
          <p className="text-xs text-muted">
            Accede al sistema de Helpdesk
          </p>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-3">
            {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">Correo</label>
            <input
              type="email"
              className="input"
              placeholder="usuario@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">Contraseña</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Ingresando..." : "Entrar"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-[11px] text-center text-muted mt-4">
          UPK Helpdesk 
        </p>
      </div>
    </div>
  );
}
