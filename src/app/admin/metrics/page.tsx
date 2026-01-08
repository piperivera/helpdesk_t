"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type StatusCount = { status: string; count: number };
type PriorityCount = { priority: string; count: number };
type AreaCount = { area: string | null; count: number };

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

function pct(part: number, total: number) {
  if (!total || total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function clampPct(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export default function AdminMetricsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [rangeDays, setRangeDays] = useState<number>(30);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ useMemo SIEMPRE se ejecuta (aunque metrics sea null)
  const byResolverSorted = useMemo(() => {
    const list = metrics?.byResolver ?? [];
    return list.slice().sort((a, b) => b.count - a.count);
  }, [metrics]);

  const maxStatus = useMemo(() => {
    const list = metrics?.byStatus ?? [];
    return Math.max(1, ...list.map((x) => x.count));
  }, [metrics]);

  const maxPriority = useMemo(() => {
    const list = metrics?.byPriority ?? [];
    return Math.max(1, ...list.map((x) => x.count));
  }, [metrics]);

  const maxArea = useMemo(() => {
    const list = metrics?.byArea ?? [];
    return Math.max(1, ...list.map((x) => x.count));
  }, [metrics]);

  const maxResolver = useMemo(() => {
    const list = metrics?.byResolver ?? [];
    return Math.max(1, ...list.map((x) => x.count));
  }, [metrics]);

  // Redirige si no hay sesión
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  async function loadMetrics(selectedRange?: number) {
    const r = selectedRange ?? rangeDays;

    try {
      if (!metrics) setLoading(true);
      else setRefreshing(true);

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
      if (session?.user?.role !== "admin") router.push("/");
      else loadMetrics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, router]);

  // ✅ returns DESPUÉS de hooks
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7]">
        <p className="text-sm text-muted">Cargando métricas...</p>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "admin") return null;
  if (!metrics) return null;

  const { totalTickets, resolvedTickets, openTickets, slaBreached } = metrics;

  const resolvedPct = clampPct(pct(resolvedTickets, totalTickets));
  const openPct = clampPct(pct(openTickets, totalTickets));
  const slaBreachedPct = clampPct(pct(slaBreached, totalTickets));

  const topResolver = byResolverSorted[0];

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
            <p className="text-[11px] text-muted">Panel de métricas</p>
            <h1 className="text-sm font-semibold text-ink">
              Visión general del Helpdesk
            </h1>
            <p className="text-[11px] text-muted">
              Del {formatDate(metrics.from)} al {formatDate(metrics.to)}
            </p>
          </div>
        </div>

        <div className="topbar-right gap-2">
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="text-muted">Rango</span>
            <select
              className="input text-xs h-9 w-[170px]"
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
            className="btn-outline btn-sm"
            disabled={refreshing}
          >
            {refreshing ? "Actualizando..." : "Actualizar"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="btn-ghost btn-sm"
          >
            Dashboard
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

          {/* KPIs */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card">
              <p className="card-subtitle mb-1">Tickets en el rango</p>
              <p className="text-2xl font-semibold text-ink">{totalTickets}</p>
              <div className="mt-3 h-2 rounded-full bg-slate-900/5 overflow-hidden">
                <div className="h-full bg-[#113082]" style={{ width: "100%" }} />
              </div>
              <p className="text-[11px] text-muted mt-2">Base del análisis</p>
            </div>

            <div className="card">
              <p className="card-subtitle mb-1">Tickets abiertos</p>
              <p className="text-2xl font-semibold text-amber-600">{openTickets}</p>
              <div className="mt-3 h-2 rounded-full bg-slate-900/5 overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: `${openPct}%` }} />
              </div>
              <p className="text-[11px] text-muted mt-2">{openPct}% del total</p>
            </div>

            <div className="card">
              <p className="card-subtitle mb-1">Resueltos o cerrados</p>
              <p className="text-2xl font-semibold text-emerald-700">{resolvedTickets}</p>
              <div className="mt-3 h-2 rounded-full bg-slate-900/5 overflow-hidden">
                <div className="h-full bg-emerald-600" style={{ width: `${resolvedPct}%` }} />
              </div>
              <p className="text-[11px] text-muted mt-2">{resolvedPct}% del total</p>
            </div>

            <div className="card">
              <p className="card-subtitle mb-1">Posibles fuera de SLA</p>
              <p className="text-2xl font-semibold text-red-600">{slaBreached}</p>
              <div className="mt-3 h-2 rounded-full bg-slate-900/5 overflow-hidden">
                <div className="h-full bg-red-600" style={{ width: `${slaBreachedPct}%` }} />
              </div>
              <p className="text-[11px] text-muted mt-2">{slaBreachedPct}% del total</p>
            </div>
          </section>

          {/* Resumen + top resolutor */}
          <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)] gap-3">
            <div className="card">
              <h2 className="card-title mb-1">Resumen ejecutivo</h2>
              <p className="card-subtitle">
                Lectura rápida del comportamiento del Helpdesk en el rango seleccionado.
              </p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="rounded-2xl border border-slate-900/10 bg-slate-900/5 p-3">
                  <div className="text-muted">Tasa de resolución</div>
                  <div className="text-sm font-semibold text-ink mt-1">{resolvedPct}%</div>
                </div>

                <div className="rounded-2xl border border-slate-900/10 bg-slate-900/5 p-3">
                  <div className="text-muted">Backlog (abiertos)</div>
                  <div className="text-sm font-semibold text-ink mt-1">{openPct}%</div>
                </div>

                <div className="rounded-2xl border border-slate-900/10 bg-slate-900/5 p-3">
                  <div className="text-muted">Riesgo SLA</div>
                  <div className="text-sm font-semibold text-ink mt-1">{slaBreachedPct}%</div>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="card-title mb-2">Top resolutor</h2>
              {topResolver ? (
                <>
                  <div className="text-xs text-ink font-semibold">
                    {topResolver.name || "Desconocido"}
                  </div>
                  <div className="text-[11px] text-muted">{topResolver.email || "-"}</div>

                  <div className="mt-3 flex items-baseline gap-2">
                    <div className="text-2xl font-semibold text-ink">{topResolver.count}</div>
                    <div className="text-[11px] text-muted">resueltos</div>
                  </div>

                  <div className="mt-3 h-2 rounded-full bg-slate-900/5 overflow-hidden">
                    <div
                      className="h-full bg-[#113082]"
                      style={{
                        width: `${clampPct(Math.round((topResolver.count / maxResolver) * 100))}%`,
                      }}
                    />
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted">Sin datos en el rango.</p>
              )}
            </div>
          </section>

          {/* Distribuciones (barras) */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="card">
              <h2 className="card-title mb-3">Tickets por estado</h2>
              {metrics.byStatus.length === 0 ? (
                <p className="text-xs text-muted">Sin datos en el rango.</p>
              ) : (
                <ul className="space-y-2">
                  {metrics.byStatus.map((s) => {
                    const w = clampPct(Math.round((s.count / maxStatus) * 100));
                    return (
                      <li key={s.status}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-ink/80">{labelStatus(s.status)}</span>
                          <span className="text-ink font-semibold">{s.count}</span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-slate-900/5 overflow-hidden">
                          <div className="h-full bg-[#113082]" style={{ width: `${w}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="card">
              <h2 className="card-title mb-3">Tickets por prioridad</h2>
              {metrics.byPriority.length === 0 ? (
                <p className="text-xs text-muted">Sin datos en el rango.</p>
              ) : (
                <ul className="space-y-2">
                  {metrics.byPriority.map((p) => {
                    const w = clampPct(Math.round((p.count / maxPriority) * 100));
                    return (
                      <li key={p.priority}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-ink/80">{labelPriority(p.priority)}</span>
                          <span className="text-ink font-semibold">{p.count}</span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-slate-900/5 overflow-hidden">
                          <div className="h-full bg-[#113082]" style={{ width: `${w}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="card">
              <h2 className="card-title mb-3">Tickets por área</h2>
              {metrics.byArea.length === 0 ? (
                <p className="text-xs text-muted">Sin datos en el rango.</p>
              ) : (
                <ul className="space-y-2">
                  {metrics.byArea.map((a, idx) => {
                    const w = clampPct(Math.round((a.count / maxArea) * 100));
                    return (
                      <li key={`${a.area ?? "sin-area"}-${idx}`}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-ink/80">{a.area || "Sin área definida"}</span>
                          <span className="text-ink font-semibold">{a.count}</span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-slate-900/5 overflow-hidden">
                          <div className="h-full bg-[#113082]" style={{ width: `${w}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Ranking por resolutor */}
          <section className="card p-0 overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <h2 className="card-title">Tickets resueltos por resolutor</h2>
              <p className="card-subtitle">
                Solo Resuelto/Cerrado dentro del rango. Ordenado por volumen.
              </p>
            </div>

            {byResolverSorted.length === 0 ? (
              <div className="px-4 pb-4">
                <p className="text-xs text-muted">No hay tickets resueltos en el rango.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border-t border-gray-100">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-[11px] uppercase text-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">Resolutor</th>
                      <th className="px-3 py-2 text-left">Correo</th>
                      <th className="px-3 py-2 text-left">Progreso</th>
                      <th className="px-3 py-2 text-right">Resueltos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byResolverSorted.map((r) => {
                      const w = clampPct(Math.round((r.count / maxResolver) * 100));
                      return (
                        <tr
                          key={r.id ?? r.email}
                          className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-3 py-2 text-ink">{r.name || "Desconocido"}</td>
                          <td className="px-3 py-2 text-ink/80">{r.email || "-"}</td>
                          <td className="px-3 py-2 min-w-[220px]">
                            <div className="h-2 rounded-full bg-slate-900/5 overflow-hidden">
                              <div className="h-full bg-[#113082]" style={{ width: `${w}%` }} />
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right text-ink font-semibold">{r.count}</td>
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
