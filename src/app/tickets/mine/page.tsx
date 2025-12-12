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

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function hoursLeft(dueAt: string | null) {
  if (!dueAt) return null;
  const ms = new Date(dueAt).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60));
}

export default function MyTicketsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/tickets");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Error al cargar tickets");
        }
        const data: Ticket[] = await res.json();
        setTickets(data);
      } catch (err: any) {
        setErrorMsg(err.message ?? "Error inesperado al cargar tickets");
      } finally {
        setLoading(false);
      }
    }

    if (status === "authenticated") {
      load();
    }
  }, [status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <p className="text-sm text-muted">Cargando sesión...</p>
      </div>
    );
  }

  if (!session?.user) return null;

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
            <p className="text-[11px] text-muted">Mis tickets</p>
            <p className="text-xs font-medium text-ink">
              Listado de tickets asociados a tu usuario
            </p>
          </div>
        </div>

        <div className="topbar-right gap-2">
          <button
            onClick={() => router.push("/tickets/create")}
            className="btn-primary text-xs"
            type="button"
          >
            + Nuevo ticket
          </button>
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
          ) : tickets.length === 0 ? (
            <div className="card">
              <h2 className="card-title mb-1">Aún no tienes tickets</h2>
              <p className="card-subtitle">
                Cuando crees tu primer ticket aparecerá listado aquí.
              </p>
            </div>
          ) : (
            <section className="card p-0 overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <h2 className="card-title mb-1">Mis tickets</h2>
                <p className="card-subtitle">
                  Haz clic en el número de ticket para ver el detalle y su
                  historial.
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
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-left">Estado</th>
                      <th className="px-3 py-2 text-left">Creado</th>
                      <th className="px-3 py-2 text-left">SLA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => {
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
                          <td
                            className="px-3 py-2 font-medium text-primary hover:underline cursor-pointer"
                            onClick={() => router.push(`/tickets/${t.id}`)}
                          >
                            {t.number}
                          </td>
                          <td className="px-3 py-2 text-ink truncate max-w-xs">
                            {t.title}
                          </td>
                          <td className="px-3 py-2 text-ink/80">{t.area}</td>
                          <td className="px-3 py-2 text-ink/80">
                            {t.priority}
                          </td>
                          <td className="px-3 py-2 text-ink/80">{t.type}</td>
                          <td className="px-3 py-2 text-ink/80">
                            {t.status.replace("_", " ")}
                          </td>
                          <td className="px-3 py-2 text-ink/70">
                            {formatDate(t.createdAt)}
                          </td>
                          <td className={`px-3 py-2 text-[11px] ${slaClass}`}>
                            {slaText}
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
