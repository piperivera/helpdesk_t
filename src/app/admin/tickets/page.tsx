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
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function hoursLeft(dueAt: string | null) {
  if (!dueAt) return null;
  const ms = new Date(dueAt).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60));
}

export default function AdminTicketsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [priorityFilter, setPriorityFilter] = useState<string>("Todas");
  const [areaFilter, setAreaFilter] = useState<string>("Todas");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
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
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      if (session?.user?.role !== "admin") {
        router.push("/");
      } else {
        loadTickets();
      }
    }
  }, [status, session, router]);

  if (status === "loading" || (loading && !tickets.length)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <p className="text-sm text-muted">Cargando tickets...</p>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "admin") {
    return null;
  }

  // áreas únicas para filtro
  const areas = Array.from(
    new Set(tickets.map((t) => t.area || ""))
  ).filter(Boolean);

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== "Todos" && t.status !== statusFilter) return false;
    if (priorityFilter !== "Todas" && t.priority !== priorityFilter) return false;
    if (areaFilter !== "Todas" && t.area !== areaFilter) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const hay =
        t.number.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q);
      if (!hay) return false;
    }

    return true;
  });

  return (
    <div className="page-shell">
      {/* Topbar */}
      <header className="topbar">
        <div className="flex flex-col">
          <p className="text-[11px] text-muted">Vista global</p>
          <h1 className="text-sm font-semibold text-ink">
            Todos los tickets del Helpdesk
          </h1>
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
        <div className="max-w-6xl mx-auto space-y-4 animate-fadeIn">
          {errorMsg && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {errorMsg}
            </div>
          )}

          {/* Filtros */}
          <section className="card flex flex-wrap gap-3 items-end text-sm">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted">Estado</label>
              <select
                className="border rounded-full px-3 py-1.5 bg-white text-xs text-ink/80"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {[
                  "Todos",
                  "Abierto",
                  "En_proceso",
                  "En_espera",
                  "Resuelto",
                  "Cerrado",
                ].map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted">Prioridad</label>
              <select
                className="border rounded-full px-3 py-1.5 bg-white text-xs text-ink/80"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="Todas">Todas</option>
                <option value="Baja">Baja</option>
                <option value="Media">Media</option>
                <option value="Alta">Alta</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted">Área</label>
              <select
                className="border rounded-full px-3 py-1.5 bg-white text-xs text-ink/80"
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

            <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
              <label className="text-[11px] text-muted">Buscar</label>
              <input
                className="border rounded-full px-3 py-1.5 bg-white text-xs text-ink/80 placeholder:text-gray-400"
                placeholder="Buscar por #, título o descripción..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={loadTickets}
              className="btn-primary text-xs px-4"
            >
              Refrescar
            </button>
          </section>

          {/* Tabla */}
          <section className="card p-0 overflow-x-auto">
            {filteredTickets.length === 0 ? (
              <p className="text-xs text-muted px-4 py-3">
                No hay tickets con los filtros actuales.
              </p>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-muted">
                  <tr>
                    <th className="px-3 py-2 text-left"># Ticket</th>
                    <th className="px-3 py-2 text-left">Título</th>
                    <th className="px-3 py-2 text-left">Área</th>
                    <th className="px-3 py-2 text-left">Prioridad</th>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-left">Estado</th>
                    <th className="px-3 py-2 text-left">Creado</th>
                    <th className="px-3 py-2 text-left">SLA</th>
                    <th className="px-3 py-2 text-left">Detalle</th>
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

                    return (
                      <tr
                        key={t.id}
                        className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-3 py-2 font-medium text-ink">
                          <button
                            className="text-primary text-xs hover:underline"
                            onClick={() => router.push(`/tickets/${t.id}`)}
                          >
                            {t.number}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-ink/80 max-w-xs truncate">
                          {t.title}
                        </td>
                        <td className="px-3 py-2 text-ink/80">{t.area}</td>
                        <td className="px-3 py-2 text-ink/80">{t.priority}</td>
                        <td className="px-3 py-2 text-ink/80">{t.type}</td>
                        <td className="px-3 py-2 text-ink/80">
                          {t.status.replace("_", " ")}
                        </td>
                        <td className="px-3 py-2 text-muted">
                          {formatDate(t.createdAt)}
                        </td>
                        <td className={`px-3 py-2 text-xs ${slaClass}`}>
                          {slaText}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            className="btn-outline text-[11px] px-3 py-1"
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
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
