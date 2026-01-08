"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "requester" | "resolver" | "admin";
  area: string | null;
  isActive: boolean;
  createdAt: string;
};

function roleLabel(role: UserRow["role"]) {
  if (role === "requester") return "Solicitante";
  if (role === "resolver") return "Resolutor";
  return "Admin";
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // crear usuario
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [area, setArea] = useState("");
  const [role, setRole] = useState<"requester" | "resolver" | "admin">("requester");
  const [password, setPassword] = useState("");

  // editar usuario
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editRole, setEditRole] = useState<"requester" | "resolver" | "admin">("requester");

  // confirm delete
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // filtros rápidos (UX)
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"Todos" | UserRow["role"]>("Todos");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
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
      setErrorMsg(err.message ?? "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      if (session?.user?.role !== "admin") router.push("/");
      else loadUsers();
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

      setName("");
      setEmail("");
      setArea("");
      setRole("requester");
      setPassword("");
    } catch (err: any) {
      setErrorMsg(err.message ?? "Error al crear usuario");
    }
  }

  function startEditUser(u: UserRow) {
    setEditingUser(u);
    setEditName(u.name);
    setEditArea(u.area || "");
    setEditRole(u.role);
    setDeleteConfirmId(null);
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
      setErrorMsg(err.message ?? "Error al actualizar usuario");
    }
  }

  async function handleToggleActive(u: UserRow) {
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !u.isActive }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al actualizar estado del usuario");
      }

      await loadUsers();
      setSuccessMsg(`Usuario ${u.isActive ? "desactivado" : "activado"} correctamente.`);
    } catch (err: any) {
      setErrorMsg(err.message ?? "Error al actualizar estado");
    }
  }

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

      setSuccessMsg(`Contraseña reseteada. Temporal para ${u.email}: ${tempPass}`);
    } catch (err: any) {
      setErrorMsg(err.message ?? "Error al resetear contraseña");
    }
  }

  function askDeleteUser(u: UserRow) {
    setDeleteConfirmId(u.id);
    setEditingUser(null);
    setErrorMsg(null);
    setSuccessMsg(null);
  }

  async function handleDeleteUser(u: UserRow) {
    setErrorMsg(null);
    setSuccessMsg(null);
    setDeletingId(u.id);

    try {
      const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al eliminar usuario");
      }

      await loadUsers();
      setSuccessMsg("Usuario eliminado correctamente.");
    } catch (err: any) {
      setErrorMsg(err.message ?? "Error al eliminar usuario");
    } finally {
      setDeletingId(null);
      setDeleteConfirmId(null);
    }
  }

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();

    return users.filter((u) => {
      const matchesRole = roleFilter === "Todos" ? true : u.role === roleFilter;
      const matchesQuery =
        q.length === 0
          ? true
          : (u.name || "").toLowerCase().includes(q) ||
            (u.email || "").toLowerCase().includes(q) ||
            (u.area || "").toLowerCase().includes(q);

      return matchesRole && matchesQuery;
    });
  }, [users, query, roleFilter]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7]">
        <p className="text-sm text-muted">Cargando sesión...</p>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "admin") return null;

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
            <p className="text-[11px] text-muted">Administración</p>
            <h1 className="text-sm font-semibold text-ink">Usuarios</h1>
            <p className="text-[11px] text-muted">
              Crea y gestiona los usuarios del Helpdesk.
            </p>
          </div>
        </div>

        <div className="topbar-right gap-2">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="btn-ghost btn-sm"
          >
            Dashboard
          </button>
          <button type="button" onClick={() => router.back()} className="btn-ghost btn-sm">
            Volver
          </button>
        </div>
      </header>

      <main className="page-main">
        <div className="max-w-6xl mx-auto space-y-4 animate-fadeIn">
          {errorMsg && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
              {successMsg}
            </div>
          )}

          {/* Crear usuario */}
          <section className="card">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="card-title">Crear nuevo usuario</h2>
                <p className="card-subtitle">
                  Define nombre, correo, rol y contraseña inicial.
                </p>
              </div>
              <button type="button" onClick={loadUsers} className="btn-outline btn-sm">
                Recargar
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">Nombre</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">Correo</label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">Área</label>
                <input
                  className="input"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="TI, Seguridad, Aseo..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">Rol</label>
                <select
                  className="input text-xs"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                >
                  <option value="requester">Solicitante</option>
                  <option value="resolver">Resolutor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Contraseña inicial
                </label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <p className="text-[11px] text-muted mt-1">
                  Mínimo 6 caracteres. El usuario luego podrá cambiarla en “Mi perfil”.
                </p>
              </div>

              <div className="md:col-span-3 flex justify-end gap-2 pt-1">
                <button type="submit" className="btn-primary btn-sm">
                  Crear usuario
                </button>
              </div>
            </form>
          </section>

          {/* Editar usuario */}
          {editingUser && (
            <section className="card">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="card-title">Editar usuario</h2>
                  <p className="card-subtitle">
                    {editingUser.email}
                  </p>
                </div>
                <button type="button" onClick={() => setEditingUser(null)} className="btn-ghost btn-sm">
                  Cerrar
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">Nombre</label>
                  <input
                    className="input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">Área</label>
                  <input
                    className="input"
                    value={editArea}
                    onChange={(e) => setEditArea(e.target.value)}
                    placeholder="(opcional)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">Rol</label>
                  <select
                    className="input text-xs"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                  >
                    <option value="requester">Solicitante</option>
                    <option value="resolver">Resolutor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="md:col-span-3 flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setEditingUser(null)} className="btn-ghost btn-sm">
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary btn-sm">
                    Guardar cambios
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Lista */}
          <section className="card p-0 overflow-hidden">
            <div className="px-4 pt-4 pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="card-title">Usuarios existentes</h2>
                  <p className="card-subtitle">
                    Edita, activa/desactiva, resetea contraseña o elimina.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    className="input text-xs h-10"
                    placeholder="Buscar por nombre, correo o área..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <select
                    className="input text-xs h-10"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                  >
                    <option value="Todos">Todos</option>
                    <option value="requester">Solicitante</option>
                    <option value="resolver">Resolutor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto border-t border-gray-100">
              {loading ? (
                <div className="p-4">
                  <p className="text-sm text-muted">Cargando usuarios...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4">
                  <p className="text-sm text-muted">No hay usuarios con ese filtro.</p>
                </div>
              ) : (
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
                    {filteredUsers.map((u) => (
                      <tr
                        key={u.id}
                        className="border-t border-gray-100 hover:bg-gray-50 transition-colors align-top"
                      >
                        <td className="px-3 py-2 text-ink font-medium">{u.name}</td>
                        <td className="px-3 py-2 text-ink/80">{u.email}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center rounded-full bg-slate-900/5 px-2 py-0.5 text-[11px] font-medium text-ink">
                            {roleLabel(u.role)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-ink/80">{u.area || "-"}</td>
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
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => startEditUser(u)}
                              className="btn-outline btn-sm"
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleActive(u)}
                              className="btn-ghost btn-sm"
                            >
                              {u.isActive ? "Desactivar" : "Activar"}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleResetPassword(u)}
                              className="btn-ghost btn-sm"
                            >
                              Reset pass
                            </button>

                            {deleteConfirmId === u.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u)}
                                  disabled={deletingId === u.id}
                                  className="h-8 px-3 rounded-xl text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {deletingId === u.id ? "Eliminando..." : "Confirmar"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="btn-ghost btn-sm"
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => askDeleteUser(u)}
                                className="h-8 px-3 rounded-xl text-xs font-medium border border-red-300 text-red-700 hover:bg-red-50"
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
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
