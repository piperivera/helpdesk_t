"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type StatusCount = {
  status: string;
  count: number;
};

type PriorityCount = {
  priority: string;
  count: number;
};

type AreaCount = {
  area: string | null;
  count: number;
};

type ResolverCount = {
  id: string | null;
  name: string;
  email: string;
  count: number;
};

type Metrics = {
  rangeDays: number;
  from: string;
  to: string;
  totalTickets: number;
  resolvedTickets: number;
  openTickets: number;
  slaBreached: number;
  byStatus: StatusCount[];
  byPriority: PriorityCount[];
  byArea: AreaCount[];
  byResolver: ResolverCount[];
};

export default function AdminMetricsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [rangeDays, setRangeDays] = useState<number>(30);
  const [refreshing, setRefreshing] = useState(false);

  // Redirige si no hay sesión
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  async function loadMetrics(selectedRange?: number) {
    const r = selectedRange ?? rangeDays;

    try {
      if (!metrics) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setErrorMsg(null);

      const res = await fetch(`/api/admin/metrics?rangeDays=${r}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al cargar métricas");
      }

      const data: Metrics = await res.json();
      setMetrics(data);
    } catch (err: any) {
      setErrorMsg(err.message ?? "Error inesperado al cargar métricas");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Carga inicial
  useEffect(() => {
    if (status === "authenticated") {
      if (session?.user?.role !== "admin") {
        router.push("/");
      } else {
        loadMetrics();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, router]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString();
  }

  function labelStatus(status: string) {
    switch (status) {
      case "Abierto":
        return "Abierto";
      case "En_proceso":
        return "En proceso";
      case "En_espera":
        return "En espera";
      case "Resuelto":
        return "Resuelto";
      case "Cerrado":
        return "Cerrado";
      default:
        return status.replace("_", " ");
    }
  }

  function labelPriority(priority: string) {
    switch (priority) {
      case "Alta":
        return "Alta";
      case "Media":
        return "Media";
      case "Baja":
        return "Baja";
      default:
        return priority;
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <p className="text-sm text-muted">Cargando métricas...</p>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "admin" || !metrics) {
    return null;
  }

  const { totalTickets, resolvedTickets, openTickets, slaBreached } = metrics;

  return (
    <div className="page-shell">
      {/* Topbar */}
      <header className="topbar">
        <div className="flex flex-col">
          <p className="text-[11px] text-muted">Panel de métricas</p>
          <h1 className="text-sm font-semibold text-ink">
            Visión general del rendimiento del Helpdesk
          </h1>
        </div>

        <div className="topbar-right gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted">Rango:</span>
            <select
              className="border rounded-full px-3 py-1 text-[11px] bg-white text-ink/80"
              value={rangeDays}
              onChange={(e) => {
                const newRange = Number(e.target.value) || 30;
                setRangeDays(newRange);
                loadMetrics(newRange);
              }}
            >
              <option value={7}>Últimos 7 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value={90}>Últimos 90 días</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => loadMetrics()}
            className="btn-ghost text-[11px]"
          >
            {refreshing ? "Actualizando..." : "Actualizar"}
          </button>

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

          {/* Resumen superior */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card">
              <p className="card-subtitle mb-1">Tickets en el rango</p>
              <p className="text-2xl font-semibold text-ink">{totalTickets}</p>
              <p className="text-[11px] text-muted mt-1">
                Del {formatDate(metrics.from)} al {formatDate(metrics.to)}
              </p>
            </div>

            <div className="card">
              <p className="card-subtitle mb-1">Tickets abiertos</p>
              <p className="text-2xl font-semibold text-amber-600">
                {openTickets}
              </p>
              <p className="text-[11px] text-muted mt-1">
                Abiertos / En proceso / En espera
              </p>
            </div>

            <div className="card">
              <p className="card-subtitle mb-1">
                Tickets resueltos o cerrados
              </p>
              <p className="text-2xl font-semibold text-emerald-700">
                {resolvedTickets}
              </p>
            </div>

            <div className="card">
              <p className="card-subtitle mb-1">Posibles fuera de SLA</p>
              <p className="text-2xl font-semibold text-red-600">
                {slaBreached}
              </p>
              <p className="text-[11px] text-muted mt-1">
                Aproximación basada en dueAt / updatedAt
              </p>
            </div>
          </section>

          {/* Distribuciones por estado / prioridad / área */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Por estado */}
            <div className="card">
              <h2 className="card-title mb-2">Tickets por estado</h2>
              {metrics.byStatus.length === 0 ? (
                <p className="text-xs text-muted">Sin datos en el rango.</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {metrics.byStatus.map((s) => (
                    <li
                      key={s.status}
                      className="flex items-center justify-between"
                    >
                      <span className="text-ink/80">
                        {labelStatus(s.status)}
                      </span>
                      <span className="text-ink font-semibold">
                        {s.count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Por prioridad */}
            <div className="card">
              <h2 className="card-title mb-2">Tickets por prioridad</h2>
              {metrics.byPriority.length === 0 ? (
                <p className="text-xs text-muted">Sin datos en el rango.</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {metrics.byPriority.map((p) => (
                    <li
                      key={p.priority}
                      className="flex items-center justify-between"
                    >
                      <span className="text-ink/80">
                        {labelPriority(p.priority)}
                      </span>
                      <span className="text-ink font-semibold">
                        {p.count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Por área */}
            <div className="card">
              <h2 className="card-title mb-2">Tickets por área</h2>
              {metrics.byArea.length === 0 ? (
                <p className="text-xs text-muted">Sin datos en el rango.</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {metrics.byArea.map((a, idx) => (
                    <li
                      key={`${a.area ?? "sin-area"}-${idx}`}
                      className="flex items-center justify-between"
                    >
                      <span className="text-ink/80">
                        {a.area || "Sin área definida"}
                      </span>
                      <span className="text-ink font-semibold">
                        {a.count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Ranking por resolutor */}
          <section className="card p-0 overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <div>
                <h2 className="card-title">
                  Tickets resueltos por resolutor
                </h2>
                <p className="card-subtitle">
                  Solo tickets en estado Resuelto / Cerrado dentro del rango.
                </p>
              </div>
            </div>

            {metrics.byResolver.length === 0 ? (
              <div className="px-4 pb-4">
                <p className="text-xs text-muted">
                  No hay tickets resueltos en el rango seleccionado.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border-t border-gray-100">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 text-muted uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Resolutor</th>
                      <th className="px-3 py-2 text-left">Correo</th>
                      <th className="px-3 py-2 text-right">
                        Tickets resueltos
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.byResolver
                      .slice()
                      .sort((a, b) => b.count - a.count)
                      .map((r) => (
                        <tr
                          key={r.id ?? r.email}
                          className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-3 py-2 text-ink">
                            {r.name || "Desconocido"}
                          </td>
                          <td className="px-3 py-2 text-ink/80">
                            {r.email || "-"}
                          </td>
                          <td className="px-3 py-2 text-right text-ink font-semibold">
                            {r.count}
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
