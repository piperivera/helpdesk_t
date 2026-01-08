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
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function hoursLeft(dueAt: string | null) {
  if (!dueAt) return null;
  const ms = new Date(dueAt).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60));
}

const STATUS_OPTIONS = ["Todos", "Abierto", "En_proceso", "En_espera", "Resuelto", "Cerrado"] as const;
const PRIORITY_OPTIONS = ["Todas", "Baja", "Media", "Alta"] as const;

export default function AdminTicketsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("Todos");
  const [priorityFilter, setPriorityFilter] = useState<(typeof PRIORITY_OPTIONS)[number]>("Todas");
  const [areaFilter, setAreaFilter] = useState<string>("Todas");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  async function loadTickets() {
    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await fetch("/api/tickets");
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al cargar tickets");
      }

      const data: Ticket[] = await res.json();
      setTickets(data);
    } catch (err: any) {
      setErrorMsg(err.message ?? "Error inesperado al cargar tickets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      if (session?.user?.role !== "admin") router.push("/");
      else loadTickets();
    }
  }, [status, session, router]);

  const areas = useMemo(() => {
    const unique = Array.from(new Set(tickets.map((t) => (t.area || "").trim()))).filter(Boolean);
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();

    return tickets.filter((t) => {
      if (statusFilter !== "Todos" && t.status !== statusFilter) return false;
      if (priorityFilter !== "Todas" && t.priority !== priorityFilter) return false;
      if (areaFilter !== "Todas" && t.area !== areaFilter) return false;

      if (q) {
        const hay =
          (t.number || "").toLowerCase().includes(q) ||
          (t.title || "").toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q);
        if (!hay) return false;
      }

      return true;
    });
  }, [tickets, statusFilter, priorityFilter, areaFilter, search]);

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
            <h1 className="text-sm font-semibold text-ink">Todos los tickets</h1>
            <p className="text-[11px] text-muted">Vista global del Helpdesk.</p>
          </div>
        </div>

        <div className="topbar-right gap-2">
          <button type="button" onClick={() => router.push("/")} className="btn-ghost btn-sm">
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

          {/* Filtros */}
          <section className="card">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">Estado</label>
                  <select
                    className="input text-xs h-10"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">Prioridad</label>
                  <select
                    className="input text-xs h-10"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value as any)}
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">Área</label>
                  <select
                    className="input text-xs h-10"
                    value={areaFilter}
                    onChange={(e) => setAreaFilter(e.target.value)}
                  >
                    <option value="Todas">Todas</option>
                    {areas.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">Buscar</label>
                  <input
                    className="input text-xs h-10"
                    placeholder="Buscar por #, título o descripción..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={loadTickets} className="btn-outline btn-sm">
                  Refrescar
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted">
              <span className="inline-flex items-center rounded-full bg-slate-900/5 px-2 py-0.5">
                Total: <span className="ml-1 font-semibold text-ink">{tickets.length}</span>
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-900/5 px-2 py-0.5">
                Filtrados: <span className="ml-1 font-semibold text-ink">{filteredTickets.length}</span>
              </span>
            </div>
          </section>

          {/* Tabla */}
          <section className="card p-0 overflow-hidden">
            {loading ? (
              <div className="p-4">
                <p className="text-sm text-muted">Cargando tickets...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-4">
                <p className="text-sm text-muted">No hay tickets con los filtros actuales.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border-t border-gray-100">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-[11px] uppercase text-muted">
                    <tr>
                      <th className="px-3 py-2 text-left"># Ticket</th>
                      <th className="px-3 py-2 text-left">Título</th>
                      <th className="px-3 py-2 text-left">Área</th>
                      <th className="px-3 py-2 text-left">Prioridad</th>
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-left">Estado</th>
                      <th className="px-3 py-2 text-left">Creado</th>
                      <th className="px-3 py-2 text-left">SLA</th>
                      <th className="px-3 py-2 text-left">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((t) => {
                      const hrs = hoursLeft(t.dueAt);
                      let slaText = "-";
                      let slaClass = "text-muted";

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

                      return (
                        <tr
                          key={t.id}
                          className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-3 py-2 font-medium">
                            <button
                              className="text-primary text-xs hover:underline"
                              onClick={() => router.push(`/tickets/${t.id}`)}
                              type="button"
                            >
                              {t.number}
                            </button>
                          </td>
                          <td className="px-3 py-2 text-ink/80 max-w-xs truncate">{t.title}</td>
                          <td className="px-3 py-2 text-ink/80">{t.area}</td>
                          <td className="px-3 py-2 text-ink/80">{t.priority}</td>
                          <td className="px-3 py-2 text-ink/80">{t.type}</td>
                          <td className="px-3 py-2 text-ink/80">{t.status.replace("_", " ")}</td>
                          <td className="px-3 py-2 text-[11px] text-muted">{formatDate(t.createdAt)}</td>
                          <td className={`px-3 py-2 text-[11px] ${slaClass}`}>{slaText}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              className="btn-outline btn-sm"
                              onClick={() => router.push(`/tickets/${t.id}`)}
                            >
                              Ver detalle
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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
