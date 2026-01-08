"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7] px-4">
      <div className="card w-full max-w-sm animate-fadeIn">
        {/* Logo + título */}
        <div className="text-center mb-4">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
            <Image
              src="/upk-logo.png"
              alt="UPK Helpdesk"
              width={44}
              height={44}
              className="object-contain"
              priority
            />
          </div>

          <h1 className="text-lg font-semibold mt-3 text-ink">
            Iniciar sesión
          </h1>
          <p className="text-xs text-muted">Accede al sistema de Helpdesk</p>
        </div>

        {/* Error */}
        {error && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-3">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted">Correo</label>
            <input
              type="email"
              className="input"
              placeholder="usuario@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted">Contraseña</label>

            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                className="input pr-24"
                placeholder="••••••••"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="btn-ghost btn-sm absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3"
                aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPass ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
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
