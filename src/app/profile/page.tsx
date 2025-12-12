"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type ProfileData = {
  id: string;
  name: string;
  email: string;
  role: "requester" | "resolver" | "admin";
  area: string | null;
  createdAt: string;
};

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

  // redirige si no hay sesión
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
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

  // carga el perfil cuando ya sabemos que está autenticado
  useEffect(() => {
    if (status === "authenticated") {
      loadProfile();
    }
  }, [status]);

  async function handleSaveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          area,
        }),
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
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <p className="text-sm text-muted">Cargando perfil...</p>
      </div>
    );
  }

  if (!session?.user || !profile) return null;

  return (
    <div className="page-shell">
      {/* Topbar */}
      <header className="topbar">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
            UPK
          </div>
          <div>
            <h1 className="text-base font-semibold text-ink">Mi perfil</h1>
            <p className="text-[11px] text-muted">
              Gestiona tus datos de usuario y contraseña.
            </p>
          </div>
        </div>
        <div className="topbar-right">
          <button
            onClick={() => router.push("/")}
            className="btn-ghost text-xs"
          >
            Volver al dashboard
          </button>
        </div>
      </header>

      <main className="page-main">
        <div className="page-grid animate-fadeIn">
          {/* Mensajes globales */}
          {errorMsg && (
            <div className="col-span-full text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="col-span-full text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
              {successMsg}
            </div>
          )}

          {/* Información de perfil */}
          <section className="card">
            <h2 className="card-title mb-1">Información de perfil</h2>
            <p className="card-subtitle mb-3">
              Actualiza tu nombre y área. El correo y el rol los gestiona el
              administrador.
            </p>

            <form
              onSubmit={handleSaveProfile}
              className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
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
                <label className="text-xs text-muted">Correo</label>
                <input
                  className="input bg-gray-50 text-gray-500"
                  value={profile.email}
                  disabled
                />
                <p className="text-[11px] text-muted mt-0.5">
                  El correo es tu usuario de acceso. Solo el admin puede
                  cambiarlo.
                </p>
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
                <label className="text-xs text-muted">Rol</label>
                <input
                  className="input bg-gray-50 text-gray-500"
                  value={
                    profile.role === "requester"
                      ? "Solicitante"
                      : profile.role === "resolver"
                      ? "Resolutor"
                      : "Admin"
                  }
                  disabled
                />
                <p className="text-[11px] text-muted mt-0.5">
                  Tu rol lo gestiona el administrador.
                </p>
              </div>

              <div className="md:col-span-2 flex justify-end mt-2">
                <button type="submit" className="btn-primary">
                  Guardar cambios
                </button>
              </div>
            </form>
          </section>

          {/* Cambio de contraseña */}
          <section className="card">
            <h2 className="card-title mb-1">Cambiar contraseña</h2>
            <p className="card-subtitle mb-3">
              Usa una contraseña segura que no utilices en otros sistemas.
            </p>

            <form
              onSubmit={handleChangePassword}
              className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
            >
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted">
                  Contraseña actual
                </label>
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
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted">
                  Confirmar nueva contraseña
                </label>
                <input
                  type="password"
                  className="input"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="md:col-span-2 flex justify-end mt-2">
                <button type="submit" className="btn-secondary">
                  Actualizar contraseña
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
