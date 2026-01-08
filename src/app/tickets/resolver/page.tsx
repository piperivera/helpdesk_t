"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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

const STATUS_OPTIONS = ["Abierto", "En_proceso", "En_espera", "Resuelto", "Cerrado"];

function statusLabel(s: string) {
  return s.replaceAll("_", " ");
}

function statusChipClass(s: string) {
  if (s === "Abierto") return "chip-blue";
  if (s === "En_proceso") return "chip-amber";
  if (s === "En_espera") return "chip-muted";
  if (s === "Resuelto") return "chip-emerald";
  if (s === "Cerrado") return "chip-muted";
  return "chip-muted";
}

function priorityChipClass(p: Ticket["priority"]) {
  if (p === "Alta") return "chip-red";
  if (p === "Media") return "chip-amber";
  return "chip-muted";
}

export default function ResolverInboxPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [resolvers, setResolvers] = useState<ResolverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("Todos");

  // comentario por fila
  const [rowComments, setRowComments] = useState<Record<string, string>>({});
  // estado seleccionado por fila
  const [rowNextStatus, setRowNextStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
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

        const init: Record<string, string> = {};
        for (const t of tData) init[t.id] = t.status;
        setRowNextStatus(init);
      } catch (err: any) {
        setErrorMsg(err.message ?? "Error inesperado al cargar bandeja");
      } finally {
        setLoading(false);
      }
    }

    if (status === "authenticated") load();
  }, [status]);

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
      setRowNextStatus((prev) => ({ ...prev, [id]: updated.status }));
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleApplyStatus(t: Ticket) {
    const newStatus = rowNextStatus[t.id] ?? t.status;
    const comment = (rowComments[t.id] || "").trim();

    await updateTicket(t.id, {
      status: newStatus,
      comment: comment || `Cambio de estado a ${statusLabel(newStatus)}`,
    });

    setRowComments((prev) => ({ ...prev, [t.id]: "" }));
  }

  async function handleRelease(t: Ticket) {
    const comment =
      (rowComments[t.id] || "").trim() ||
      "Ticket liberado y devuelto a la cola general.";

    await updateTicket(t.id, {
      assigneeId: null,
      comment,
    });

    setRowComments((prev) => ({ ...prev, [t.id]: "" }));
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7]">
        <p className="text-sm text-muted">Cargando sesión...</p>
      </div>
    );
  }

  if (!session?.user) return null;

  const isAdmin = session.user.role === "admin";

  const filteredTickets = useMemo(() => {
    return statusFilter === "Todos"
      ? tickets
      : tickets.filter((t) => t.status === statusFilter);
  }, [tickets, statusFilter]);

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
            <p className="text-[11px] text-muted">Bandeja de tickets</p>
            <p className="text-xs font-medium text-ink">
              Vista de resolutor · tickets asignados y sin asignar
            </p>
          </div>
        </div>

        <div className="topbar-right gap-2">
          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {["Todos", ...STATUS_OPTIONS].map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>

          <button onClick={() => router.back()} className="btn-ghost btn-sm" type="button">
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
                  Cambia estado, asigna tickets y deja comentarios rápidos por fila.
                </p>
              </div>

              <div className="overflow-x-auto border-t border-gray-100">
                <table className="table">
                  <thead>
                    <tr>
                      <th># Ticket</th>
                      <th>Título</th>
                      <th>Área</th>
                      <th>Prioridad</th>
                      <th>Estado</th>
                      <th>Asignación</th>
                      <th>Creado</th>
                      <th>SLA</th>
                      <th className="min-w-[340px]">Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredTickets.map((t) => {
                      const hrs = hoursLeft(t.dueAt);

                      let slaText = "-";
                      let slaChip = "chip-muted";
                      if (hrs !== null) {
                        if (hrs < 0) {
                          slaText = `Vencido ${Math.abs(hrs)}h`;
                          slaChip = "chip-red";
                        } else if (hrs <= 4) {
                          slaText = `${hrs}h`;
                          slaChip = "chip-amber";
                        } else {
                          slaText = `${hrs}h`;
                          slaChip = "chip-emerald";
                        }
                      }

                      const commentValue = rowComments[t.id] || "";
                      const nextStatus = rowNextStatus[t.id] ?? t.status;

                      return (
                        <tr key={t.id} className="transition-colors">
                          <td className="font-semibold text-primary">
                            <button
                              className="hover:underline"
                              onClick={() => router.push(`/tickets/${t.id}`)}
                              type="button"
                            >
                              {t.number}
                            </button>
                          </td>

                          <td className="text-ink truncate max-w-xs">{t.title}</td>

                          <td className="text-ink/80">{t.area}</td>

                          <td>
                            <span className={priorityChipClass(t.priority)}>{t.priority}</span>
                          </td>

                          <td>
                            <span className={statusChipClass(t.status)}>
                              {statusLabel(t.status)}
                            </span>
                          </td>

                          <td>
                            {isAdmin ? (
                              <select
                                className="select"
                                value={t.assigneeId || ""}
                                onChange={(e) =>
                                  updateTicket(t.id, {
                                    assigneeId: e.target.value === "" ? null : e.target.value,
                                    comment: "Cambio de asignación desde bandeja",
                                  })
                                }
                              >
                                <option value="">Sin asignar</option>
                                {resolvers.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.name} {r.role === "admin" ? "(Admin)" : ""}
                                  </option>
                                ))}
                              </select>
                            ) : t.assigneeId === session.user.id ? (
                              <button
                                type="button"
                                onClick={() => handleRelease(t)}
                                className="btn-outline btn-sm"
                              >
                                Liberar
                              </button>
                            ) : t.assigneeId ? (
                              <span className="text-[11px] text-slate-600">Asignado</span>
                            ) : (
                              <span className="text-[11px] text-muted">Sin asignar</span>
                            )}
                          </td>

                          <td className="text-ink/70">{formatDate(t.createdAt)}</td>

                          <td>
                            <span className={slaChip}>{slaText}</span>
                          </td>

                          <td>
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <select
                                  className="select"
                                  value={nextStatus}
                                  onChange={(e) =>
                                    setRowNextStatus((prev) => ({
                                      ...prev,
                                      [t.id]: e.target.value,
                                    }))
                                  }
                                >
                                  {STATUS_OPTIONS.map((s) => (
                                    <option key={s} value={s}>
                                      {statusLabel(s)}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  type="button"
                                  onClick={() => handleApplyStatus(t)}
                                  className="btn-primary btn-sm"
                                >
                                  Aplicar
                                </button>

                                <button
                                  type="button"
                                  onClick={() => router.push(`/tickets/${t.id}`)}
                                  className="btn-ghost btn-sm"
                                >
                                  Ver
                                </button>
                              </div>

                              <input
                                type="text"
                                placeholder="Comentario opcional para esta acción..."
                                value={commentValue}
                                onChange={(e) =>
                                  setRowComments((prev) => ({ ...prev, [t.id]: e.target.value }))
                                }
                                className="input !h-8 !rounded-xl !px-3 !py-0 text-xs"
                              />
                            </div>
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
