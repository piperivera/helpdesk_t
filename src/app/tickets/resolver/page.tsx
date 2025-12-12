"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Ticket = {
  id: string;
  number: string;
  title: string;
  description: string;
  area: string;
  priority: "Baja" | "Media" | "Alta";
  type: "Incidente" | "Solicitud" | "Cambio";
  status: string;
  createdAt: string;
  dueAt: string | null;
  assigneeId: string | null;
};

type ResolverUser = {
  id: string;
  name: string;
  role: "resolver" | "admin";
  area: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function hoursLeft(dueAt: string | null) {
  if (!dueAt) return null;
  const ms = new Date(dueAt).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60));
}

const STATUS_OPTIONS = [
  "Abierto",
  "En_proceso",
  "En_espera",
  "Resuelto",
  "Cerrado",
];

export default function ResolverInboxPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [resolvers, setResolvers] = useState<ResolverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("Todos");

  // comentario por fila: { [ticketId]: "texto..." }
  const [rowComments, setRowComments] = useState<Record<string, string>>({});

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    async function load() {
      try {
        const [ticketsRes, resolversRes] = await Promise.all([
          fetch("/api/tickets"),
          fetch("/api/resolvers"),
        ]);

        if (!ticketsRes.ok) {
          const d = await ticketsRes.json().catch(() => ({}));
          throw new Error(d.error || "Error al cargar tickets");
        }
        if (!resolversRes.ok) {
          const d = await resolversRes.json().catch(() => ({}));
          throw new Error(d.error || "Error al cargar resolutores");
        }

        const tData: Ticket[] = await ticketsRes.json();
        const rData: ResolverUser[] = await resolversRes.json();

        setTickets(tData);
        setResolvers(rData);
      } catch (err: any) {
        setErrorMsg(err.message ?? "Error inesperado al cargar bandeja");
      } finally {
        setLoading(false);
      }
    }

    if (status === "authenticated") {
      load();
    }
  }, [status]);

  function handleCommentChange(ticketId: string, value: string) {
    setRowComments((prev) => ({ ...prev, [ticketId]: value }));
  }

  async function updateTicket(id: string, payload: any) {
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al actualizar ticket");
      }

      const updated: Ticket = await res.json();
      setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleChangeStatus(t: Ticket, newStatus: string) {
    const comment = rowComments[t.id] || "";
    await updateTicket(t.id, {
      status: newStatus,
      comment: comment || `Cambio de estado a ${newStatus.replace("_", " ")}`,
    });
    setRowComments((prev) => ({ ...prev, [t.id]: "" }));
  }

  async function handleRelease(t: Ticket) {
    const comment =
      rowComments[t.id] || "Ticket liberado y devuelto a la cola general.";
    await updateTicket(t.id, {
      assigneeId: null,
      comment,
    });
    setRowComments((prev) => ({ ...prev, [t.id]: "" }));
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <p className="text-sm text-muted">Cargando sesión...</p>
      </div>
    );
  }

  if (!session?.user) return null;

  const filteredTickets =
    statusFilter === "Todos"
      ? tickets
      : tickets.filter((t) => t.status === statusFilter);

  const isAdmin = session.user.role === "admin";

  return (
    <div className="page-shell">
      {/* Topbar */}
      <header className="topbar">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-ghost text-xs"
          >
            ← Volver
          </button>
          <div>
            <p className="text-[11px] text-muted">Bandeja de tickets</p>
            <p className="text-xs font-medium text-ink">
              Vista de resolutor · tickets asignados y sin asignar
            </p>
          </div>
        </div>

        <div className="topbar-right gap-3">
          <select
            className="text-xs border rounded-full px-3 py-1 bg-white text-ink/80"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {["Todos", ...STATUS_OPTIONS].map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
          <button
            onClick={() => router.push("/")}
            className="btn-ghost text-xs"
            type="button"
          >
            Ir al dashboard
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

          {loading ? (
            <div className="card">
              <p className="text-sm text-muted">Cargando tickets...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="card">
              <h2 className="card-title mb-1">Sin tickets en esta vista</h2>
              <p className="card-subtitle">
                Ajusta el filtro de estado o verifica la cola general.
              </p>
            </div>
          ) : (
            <section className="card p-0 overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <h2 className="card-title mb-1">Bandeja de resolutor</h2>
                <p className="card-subtitle">
                  Cambia estado, asigna tickets y deja comentarios rápidos por
                  fila.
                </p>
              </div>

              <div className="overflow-x-auto border-t border-gray-100">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-[11px] uppercase text-muted">
                    <tr>
                      <th className="px-3 py-2 text-left"># Ticket</th>
                      <th className="px-3 py-2 text-left">Título</th>
                      <th className="px-3 py-2 text-left">Área</th>
                      <th className="px-3 py-2 text-left">Prioridad</th>
                      <th className="px-3 py-2 text-left">Estado</th>
                      <th className="px-3 py-2 text-left">Asignado a</th>
                      <th className="px-3 py-2 text-left">Creado</th>
                      <th className="px-3 py-2 text-left">SLA</th>
                      <th className="px-3 py-2 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((t) => {
                      const hrs = hoursLeft(t.dueAt);
                      let slaText = "-";
                      let slaClass = "";

                      if (hrs !== null) {
                        if (hrs < 0) {
                          slaText = `Vencido hace ${Math.abs(hrs)}h`;
                          slaClass = "text-red-600";
                        } else if (hrs <= 4) {
                          slaText = `${hrs}h restantes`;
                          slaClass = "text-amber-600";
                        } else {
                          slaText = `${hrs}h restantes`;
                          slaClass = "text-emerald-600";
                        }
                      }

                      const commentValue = rowComments[t.id] || "";

                      return (
                        <tr
                          key={t.id}
                          className="border-t border-gray-100 hover:bg-gray-50 align-top transition-colors"
                        >
                          <td className="px-3 py-2 font-medium text-primary">
                            <button
                              className="hover:underline text-xs"
                              onClick={() => router.push(`/tickets/${t.id}`)}
                            >
                              {t.number}
                            </button>
                          </td>
                          <td className="px-3 py-2 text-ink truncate max-w-xs">
                            {t.title}
                          </td>
                          <td className="px-3 py-2 text-ink/80">{t.area}</td>
                          <td className="px-3 py-2 text-ink/80">
                            {t.priority}
                          </td>
                          <td className="px-3 py-2 text-ink/80">
                            {t.status.replace("_", " ")}
                          </td>
                          <td className="px-3 py-2">
                            {isAdmin ? (
                              <select
                                className="text-xs border rounded-full px-2 py-1 bg-white text-ink/80"
                                value={t.assigneeId || ""}
                                onChange={(e) =>
                                  updateTicket(t.id, {
                                    assigneeId:
                                      e.target.value === ""
                                        ? null
                                        : e.target.value,
                                    comment:
                                      "Cambio de asignación desde bandeja",
                                  })
                                }
                              >
                                <option value="">Sin asignar</option>
                                {resolvers.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.name}{" "}
                                    {r.role === "admin" ? "(Admin)" : ""}
                                  </option>
                                ))}
                              </select>
                            ) : t.assigneeId === session.user.id ? (
                              <button
                                type="button"
                                onClick={() => handleRelease(t)}
                                className="text-xs px-3 py-1 rounded-full border border-gray-200 bg-white hover:bg-gray-50"
                              >
                                Liberar
                              </button>
                            ) : t.assigneeId ? (
                              <span className="text-[11px] text-ink/70">
                                Asignado
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted">
                                Sin asignar
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-ink/70">
                            {formatDate(t.createdAt)}
                          </td>
                          <td className={`px-3 py-2 text-[11px] ${slaClass}`}>
                            {slaText}
                          </td>
                          <td className="px-3 py-2 min-w-[240px]">
                            <div className="flex flex-wrap gap-1 mb-2">
                              {STATUS_OPTIONS.map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => handleChangeStatus(t, s)}
                                  className={`text-[11px] border rounded-full px-3 py-1 ${
                                    t.status === s
                                      ? "bg-blue-50 border-blue-500 text-blue-700"
                                      : "bg-white border-gray-200 text-ink/80 hover:bg-gray-50"
                                  }`}
                                >
                                  {s.replace("_", " ")}
                                </button>
                              ))}
                            </div>
                            <input
                              type="text"
                              placeholder="Comentario opcional para esta acción..."
                              value={commentValue}
                              onChange={(e) =>
                                handleCommentChange(t.id, e.target.value)
                              }
                              className="w-full border rounded-full px-3 py-1 text-xs text-ink placeholder:text-muted bg-gray-50 focus:bg-white"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
