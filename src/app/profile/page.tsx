"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type ProfileData = {
  id: string;
  name: string;
  email: string;
  role: "requester" | "resolver" | "admin";
  area: string | null;
  createdAt: string;
};

function roleLabel(role: ProfileData["role"]) {
  if (role === "requester") return "Solicitante";
  if (role === "resolver") return "Resolutor";
  return "Admin";
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // campos editables
  const [name, setName] = useState("");
  const [area, setArea] = useState("");

  // cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  async function loadProfile() {
    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await fetch("/api/profile");
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al cargar perfil");
      }

      const data: ProfileData = await res.json();
      setProfile(data);
      setName(data.name || "");
      setArea(data.area || "");
    } catch (err: any) {
      setErrorMsg(err.message ?? "Error inesperado al cargar perfil");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function handleSaveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, area }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al actualizar perfil");
      }

      const updated: ProfileData = await res.json();
      setProfile(updated);
      setSuccessMsg("Perfil actualizado correctamente.");
    } catch (err: any) {
      setErrorMsg(err.message ?? "Error inesperado al actualizar perfil");
    }
  }

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword !== confirmNewPassword) {
      setErrorMsg("La nueva contraseña y la confirmación no coinciden.");
      return;
    }

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changePassword: true,
          currentPassword,
          newPassword,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al cambiar contraseña");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setSuccessMsg("Contraseña actualizada correctamente.");
    } catch (err: any) {
      setErrorMsg(err.message ?? "Error inesperado al cambiar contraseña");
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7]">
        <p className="text-sm text-muted">Cargando perfil...</p>
      </div>
    );
  }

  if (!session?.user || !profile) return null;

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="h-9 w-9 flex items-center justify-center"
            type="button"
            aria-label="Ir al dashboard"
          >
            <Image
              src="/upk-logo.png"
              alt="UPK Helpdesk"
              width={36}
              height={36}
              className="object-contain"
              priority
            />
          </button>

          <div>
            <h1 className="text-sm md:text-base font-semibold text-ink">
              Mi perfil
            </h1>
            <p className="text-[11px] text-muted">
              Gestiona tus datos de usuario y contraseña.
            </p>
          </div>
        </div>

        <div className="topbar-right gap-2">
  <button
    onClick={() => router.push("/")}
    className="btn-primary btn-sm"
    type="button"
  >
    Dashboard
  </button>
  <button
    onClick={() => router.back()}
    className="btn-outline btn-sm"
    type="button"
  >
    Volver
  </button>
</div>

      </header>

      <main className="page-main">
        <div className="max-w-6xl mx-auto space-y-4 animate-fadeIn">
          {errorMsg && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
              {successMsg}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Perfil */}
            <section className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="card-title mb-1">Información de perfil</h2>
                  <p className="card-subtitle">
                    Actualiza tu nombre y área. El correo y el rol los gestiona el
                    administrador.
                  </p>
                </div>

                <div className="hidden sm:flex flex-col items-end">
                  <span className="chip-muted">{roleLabel(profile.role)}</span>
                  {profile.area ? (
                    <span className="text-[11px] text-muted mt-1">
                      Área: {profile.area}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted mt-1">
                      Área: —
                    </span>
                  )}
                </div>
              </div>

              <form
                onSubmit={handleSaveProfile}
                className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mt-4"
              >
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted">Nombre</label>
                  <input
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted">Área</label>
                  <input
                    className="input"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="TI, Seguridad, Aseo..."
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted">Correo</label>
                  <input
                    className="input bg-gray-50 text-gray-500"
                    value={profile.email}
                    disabled
                  />
                  <p className="text-[11px] text-muted mt-0.5">
                    El correo es tu usuario de acceso. Solo el admin puede cambiarlo.
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted">Rol</label>
                  <input
                    className="input bg-gray-50 text-gray-500"
                    value={roleLabel(profile.role)}
                    disabled
                  />
                  <p className="text-[11px] text-muted mt-0.5">
                    Tu rol lo gestiona el administrador.
                  </p>
                </div>

                <div className="md:col-span-2 flex justify-end mt-1">
                  <button type="submit" className="btn-primary btn-sm">
                    Guardar cambios
                  </button>
                </div>
              </form>
            </section>

            {/* Password */}
            <section className="card">
              <h2 className="card-title mb-1">Cambiar contraseña</h2>
              <p className="card-subtitle">
                Usa una contraseña segura que no utilices en otros sistemas.
              </p>

              <form
                onSubmit={handleChangePassword}
                className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mt-4"
              >
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs text-muted">Contraseña actual</label>
                  <input
                    type="password"
                    className="input"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted">Nueva contraseña</label>
                  <input
                    type="password"
                    className="input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <p className="text-[11px] text-muted">
                    Mínimo 6 caracteres.
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted">Confirmar nueva contraseña</label>
                  <input
                    type="password"
                    className="input"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <div className="md:col-span-2 flex justify-end mt-1">
                  <button type="submit" className="btn-secondary btn-sm">
                    Actualizar contraseña
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
