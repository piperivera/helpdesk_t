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

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function hoursLeft(dueAt: string | null) {
  if (!dueAt) return null;
  const ms = new Date(dueAt).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60));
}

function statusLabel(s: string) {
  return s.replaceAll("_", " ");
}

export default function MyTicketsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
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

    if (status === "authenticated") load();
  }, [status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7]">
        <p className="text-sm text-muted">Cargando sesión...</p>
      </div>
    );
  }

  if (!session?.user) return null;

  const rows = useMemo(() => tickets, [tickets]);

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
            <p className="text-[11px] text-muted">Mis tickets</p>
            <p className="text-xs font-medium text-ink">
              Listado de tickets asociados a tu usuario
            </p>
          </div>
        </div>

        <div className="topbar-right gap-2">
          <button
            onClick={() => router.push("/tickets/create")}
            className="btn-primary btn-sm"
            type="button"
          >
            Nuevo ticket
          </button>
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
          ) : rows.length === 0 ? (
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
                  Haz clic en el número de ticket para ver el detalle y su historial.
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
                      <th>Tipo</th>
                      <th>Estado</th>
                      <th>Creado</th>
                      <th>SLA</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((t) => {
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

                      return (
                        <tr key={t.id} className="transition-colors">
                          <td className="font-semibold text-primary">
                            <button
                              type="button"
                              className="hover:underline"
                              onClick={() => router.push(`/tickets/${t.id}`)}
                            >
                              {t.number}
                            </button>
                          </td>
                          <td className="text-ink truncate max-w-xs">{t.title}</td>
                          <td className="text-ink/80">{t.area}</td>
                          <td className="text-ink/80">{t.priority}</td>
                          <td className="text-ink/80">{t.type}</td>
                          <td className="text-ink/80">{statusLabel(t.status)}</td>
                          <td className="text-ink/70">{formatDate(t.createdAt)}</td>
                          <td>
                            <span className={slaChip}>{slaText}</span>
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
