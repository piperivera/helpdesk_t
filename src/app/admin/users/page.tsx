"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "requester" | "resolver" | "admin";
  area: string | null;
  isActive: boolean;
  createdAt: string;
};

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // formulario nuevo usuario
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [area, setArea] = useState("");
  const [role, setRole] = useState<"requester" | "resolver" | "admin">(
    "requester"
  );
  const [password, setPassword] = useState("");

  // edición de usuario existente
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editRole, setEditRole] =
    useState<"requester" | "resolver" | "admin">("requester");

  // confirmación de borrado en UI
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  async function loadUsers() {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/users");
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al cargar usuarios");
      }
      const data: UserRow[] = await res.json();
      setUsers(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      if (session?.user?.role !== "admin") {
        router.push("/"); // bloquea si no es admin
      } else {
        loadUsers();
      }
    }
  }, [status, session, router]);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          area: area || null,
          role,
          password,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al crear usuario");
      }

      await loadUsers();
      setSuccessMsg("Usuario creado correctamente.");

      // limpiar formulario
      setName("");
      setEmail("");
      setArea("");
      setRole("requester");
      setPassword("");
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  function startEditUser(u: UserRow) {
    setEditingUser(u);
    setEditName(u.name);
    setEditArea(u.area || "");
    setEditRole(u.role);
    setSuccessMsg(null);
    setErrorMsg(null);
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          area: editArea || null,
          role: editRole,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al actualizar usuario");
      }

      await loadUsers();
      setSuccessMsg("Usuario actualizado correctamente.");
      setEditingUser(null);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  // activar / desactivar
  async function handleToggleActive(u: UserRow) {
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !u.isActive,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al actualizar estado del usuario");
      }

      await loadUsers();
      setSuccessMsg(
        `Usuario ${u.isActive ? "desactivado" : "activado"} correctamente.`
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  // generador de contraseña temporal
  function generateTempPassword() {
    const base = Math.random().toString(36).slice(-8);
    return base + "A1!";
  }

  async function handleResetPassword(u: UserRow) {
    const tempPass = generateTempPassword();

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetPassword: true,
          newPassword: tempPass,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al resetear contraseña");
      }

      setSuccessMsg(
        `Contraseña reseteada. Nueva contraseña temporal para ${u.email}: ${tempPass}`
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  // eliminar usuario
  function askDeleteUser(u: UserRow) {
    setDeleteConfirmId(u.id);
    setErrorMsg(null);
    setSuccessMsg(null);
  }

  async function handleDeleteUser(u: UserRow) {
    setErrorMsg(null);
    setSuccessMsg(null);
    setDeletingId(u.id);

    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al eliminar usuario");
      }

      await loadUsers();
      setSuccessMsg("Usuario eliminado correctamente.");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setDeletingId(null);
      setDeleteConfirmId(null);
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <p className="text-sm text-muted">Cargando sesión...</p>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "admin") {
    return null;
  }

  return (
    <div className="page-shell">
      {/* Topbar */}
      <header className="topbar">
        <div className="flex flex-col">
          <p className="text-[11px] text-muted">Configuración</p>
          <h1 className="text-sm font-semibold text-ink">
            Administración de usuarios
          </h1>
          <p className="text-[11px] text-muted">
            Crea y gestiona los usuarios del Helpdesk.
          </p>
        </div>
        <div className="topbar-right">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="btn-ghost text-xs"
          >
            Ir al dashboard
          </button>
        </div>
      </header>

      <main className="page-main">
        <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
          {/* Mensajes */}
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

          {/* Formulario crear usuario (NO se toca funcionalidad) */}
          <section className="card">
            <h2 className="text-sm font-semibold text-ink mb-3">
              Crear nuevo usuario
            </h2>
            <form
              onSubmit={handleCreateUser}
              className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm"
            >
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted">Nombre</label>
                <input
                  className="border rounded-xl px-3 py-1.5 text-sm bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted">Correo</label>
                <input
                  type="email"
                  className="border rounded-xl px-3 py-1.5 text-sm bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted">Área</label>
                <input
                  className="border rounded-xl px-3 py-1.5 text-sm bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="TI, Seguridad, Aseo..."
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted">Rol</label>
                <select
                  className="border rounded-xl px-3 py-1.5 text-sm bg-white text-ink/80"
                  value={role}
                  onChange={(e) =>
                    setRole(
                      e.target.value as "requester" | "resolver" | "admin"
                    )
                  }
                >
                  <option value="requester">Solicitante</option>
                  <option value="resolver">Resolutor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted">Contraseña</label>
                <input
                  type="password"
                  className="border rounded-xl px-3 py-1.5 text-sm bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <p className="text-[11px] text-muted mt-0.5">
                  Mínimo 6 caracteres. El usuario luego podrá cambiarla.
                </p>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="btn-primary text-xs px-4"
                >
                  Crear usuario
                </button>
              </div>
            </form>
          </section>

          {/* Formulario editar usuario */}
          {editingUser && (
            <section className="card">
              <h2 className="text-sm font-semibold text-ink mb-3">
                Editar usuario:{" "}
                <span className="font-mono text-xs text-primary">
                  {editingUser.email}
                </span>
              </h2>
              <form
                onSubmit={handleUpdateUser}
                className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm"
              >
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-muted">Nombre</label>
                  <input
                    className="border rounded-xl px-3 py-1.5 text-sm bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-muted">Área</label>
                  <input
                    className="border rounded-xl px-3 py-1.5 text-sm bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                    value={editArea}
                    onChange={(e) => setEditArea(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-muted">Rol</label>
                  <select
                    className="border rounded-xl px-3 py-1.5 text-sm bg-white text-ink/80"
                    value={editRole}
                    onChange={(e) =>
                      setEditRole(
                        e.target.value as "requester" | "resolver" | "admin"
                      )
                    }
                  >
                    <option value="requester">Solicitante</option>
                    <option value="resolver">Resolutor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="btn-ghost text-xs px-4 py-1.5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary text-xs px-4 py-1.5"
                  >
                    Guardar cambios
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Lista de usuarios */}
          <section className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-ink">
                Usuarios existentes
              </h2>
              <button
                type="button"
                onClick={loadUsers}
                className="text-[11px] text-muted hover:text-ink"
              >
                Recargar
              </button>
            </div>

            {loading ? (
              <p className="text-xs text-muted">Cargando usuarios...</p>
            ) : users.length === 0 ? (
              <p className="text-xs text-muted">
                No hay usuarios registrados.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-[11px] uppercase text-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">Nombre</th>
                      <th className="px-3 py-2 text-left">Correo</th>
                      <th className="px-3 py-2 text-left">Rol</th>
                      <th className="px-3 py-2 text-left">Área</th>
                      <th className="px-3 py-2 text-left">Estado</th>
                      <th className="px-3 py-2 text-left">Creado</th>
                      <th className="px-3 py-2 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr
                        key={u.id}
                        className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-3 py-2 text-ink">{u.name}</td>
                        <td className="px-3 py-2 text-ink/80">{u.email}</td>
                        <td className="px-3 py-2 text-ink/80">
                          {u.role === "requester"
                            ? "Solicitante"
                            : u.role === "resolver"
                            ? "Resolutor"
                            : "Admin"}
                        </td>
                        <td className="px-3 py-2 text-ink/80">
                          {u.area || "-"}
                        </td>
                        <td className="px-3 py-2">
                          {u.isActive ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                              Inactivo
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-muted">
                          {new Date(u.createdAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-[11px]">
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => startEditUser(u)}
                              className="btn-outline px-3 py-1"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(u)}
                              className="btn-ghost px-3 py-1 border border-gray-200"
                            >
                              {u.isActive ? "Desactivar" : "Activar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResetPassword(u)}
                              className="btn-ghost px-3 py-1 border border-gray-200"
                            >
                              Reset pass
                            </button>

                            {/* Eliminar con confirmación inline */}
                            {deleteConfirmId === u.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u)}
                                  disabled={deletingId === u.id}
                                  className="px-3 py-1 rounded-full bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300"
                                >
                                  {deletingId === u.id
                                    ? "Eliminando..."
                                    : "Confirmar"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="btn-ghost px-3 py-1 border border-gray-200"
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => askDeleteUser(u)}
                                className="px-3 py-1 rounded-full border border-red-300 text-red-700 hover:bg-red-50"
                              >
                                Eliminar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
