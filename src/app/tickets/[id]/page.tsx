"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";

type TicketEvent = {
  id: string;
  at: string;
  action: string;
  description: string | null;
  by: string | null;
};

type TicketAttachment = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  uploadedAt: string;
};

type TicketDetail = {
  id: string;
  number: string;
  title: string;
  description: string;
  area: string;
  priority: "Baja" | "Media" | "Alta";
  type: "Incidente" | "Solicitud" | "Cambio";
  status: string;
  createdAt: string;
  updatedAt: string;
  dueAt: string | null;
  requester: {
    id: string;
    name: string;
    email: string;
    area: string | null;
  };
  assignee: {
    id: string;
    name: string;
    email: string;
    area: string | null;
  } | null;
  events: TicketEvent[];
  attachments: TicketAttachment[];
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

export default function TicketDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  // Id seguro desde params
  const ticketId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : undefined;

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [newStatus, setNewStatus] = useState<string>("");
  const [comment, setComment] = useState<string>("");

  // archivos adjuntos
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleUploadAttachment() {
    if (!ticketId || ticketId === "undefined") return;

    if (!selectedFile) {
      setUploadError("Selecciona un archivo antes de subirlo.");
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch(`/api/tickets/${ticketId}/attachments`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al subir archivo");
      }

      // recargamos el ticket para ver el adjunto nuevo
      const ticketRes = await fetch(`/api/tickets/${ticketId}`);
      if (!ticketRes.ok) {
        const d = await ticketRes.json().catch(() => ({}));
        throw new Error(d.error || "Error al refrescar ticket");
      }

      const updated: TicketDetail = await ticketRes.json();
      setTicket(updated);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (!ticketId || ticketId === "undefined") return;

    async function load() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/tickets/${ticketId}`);
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "Error al cargar ticket");
        }
        const data: TicketDetail = await res.json();
        setTicket(data);
        setNewStatus(data.status);
      } catch (err: any) {
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [ticketId]);

  async function handleUpdate() {
    if (!ticketId || ticketId === "undefined") return;

    try {
      setErrorMsg(null);
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          comment: comment || undefined,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al actualizar ticket");
      }

      const updated: TicketDetail = await res.json();
      setTicket(updated);
      setComment("");
    } catch (err: any) {
      setErrorMsg(err.message ?? "Error al actualizar ticket");
    }
  }

  if (status === "loading" || !session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <p className="text-sm text-muted">Cargando sesión...</p>
      </div>
    );
  }

  if (!ticketId || ticketId === "undefined") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="rounded-full px-4 py-2 bg-white border text-sm text-ink/80 shadow-sm">
          Id de ticket inválido
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <p className="text-sm text-muted">Cargando ticket...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="rounded-full px-4 py-2 bg-white border text-sm text-ink/80 shadow-sm">
          {errorMsg || "Error al cargar ticket"}
        </div>
      </div>
    );
  }

  const slaHrs = hoursLeft(ticket.dueAt);
  let slaText = "-";
  let slaClass = "";

  if (slaHrs !== null) {
    if (slaHrs < 0) {
      slaText = `Vencido hace ${Math.abs(slaHrs)}h`;
      slaClass = "text-red-600";
    } else if (slaHrs <= 4) {
      slaText = `${slaHrs}h restantes`;
      slaClass = "text-amber-600";
    } else {
      slaText = `${slaHrs}h restantes`;
      slaClass = "text-emerald-600";
    }
  }

  const isResolverOrAdmin =
    session.user.role === "resolver" || session.user.role === "admin";

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
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-[11px] font-semibold">
              UPK
            </div>
            <div>
              <p className="text-[11px] text-muted">Detalle de ticket</p>
              <p className="text-xs font-medium text-ink">
                Ticket {ticket.number}
              </p>
            </div>
          </div>
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
        <div className="max-w-5xl mx-auto space-y-4 animate-fadeIn">
          {/* Mensajes de error globales */}
          {errorMsg && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {errorMsg}
            </div>
          )}

          {/* Encabezado del ticket */}
          <section className="card">
            <div className="flex flex-col gap-1">
              <h1 className="text-base sm:text-lg font-semibold text-ink">
                Ticket {ticket.number}
              </h1>
              <p className="text-sm text-muted">{ticket.title}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted">
              <span className="badge">
                Prioridad:{" "}
                <span className="font-medium text-ink ml-1">
                  {ticket.priority}
                </span>
              </span>
              <span className="badge">
                Tipo:{" "}
                <span className="font-medium text-ink ml-1">{ticket.type}</span>
              </span>
              <span className="badge">
                Estado:{" "}
                <span className="font-medium text-ink ml-1">
                  {ticket.status.replace("_", " ")}
                </span>
              </span>
            </div>
          </section>

          {/* Detalle + solicitante / SLA */}
          <section className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr),minmax(0,1.3fr)] gap-4">
            {/* Detalle */}
            <div className="card space-y-3">
              <h2 className="card-title">Detalle del ticket</h2>
              <p className="text-sm text-ink/80 whitespace-pre-line">
                {ticket.description}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px] text-muted mt-2">
                <div>
                  <div className="font-semibold text-ink text-xs mb-0.5">
                    Área
                  </div>
                  <div>{ticket.area}</div>
                </div>
                <div>
                  <div className="font-semibold text-ink text-xs mb-0.5">
                    Prioridad
                  </div>
                  <div>{ticket.priority}</div>
                </div>
                <div>
                  <div className="font-semibold text-ink text-xs mb-0.5">
                    Tipo
                  </div>
                  <div>{ticket.type}</div>
                </div>
                <div>
                  <div className="font-semibold text-ink text-xs mb-0.5">
                    Creado
                  </div>
                  <div>{formatDate(ticket.createdAt)}</div>
                </div>
                <div>
                  <div className="font-semibold text-ink text-xs mb-0.5">
                    Actualizado
                  </div>
                  <div>{formatDate(ticket.updatedAt)}</div>
                </div>
              </div>
            </div>

            {/* Solicitante / Asignado / SLA */}
            <div className="card space-y-3">
              <div>
                <h2 className="card-title">Solicitante</h2>
                <div className="mt-2 text-xs text-ink/80 space-y-0.5">
                  <div className="font-semibold">
                    {ticket.requester.name || ticket.requester.email}
                  </div>
                  <div>{ticket.requester.email}</div>
                  {ticket.requester.area && (
                    <div className="text-muted">
                      Área: {ticket.requester.area}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-1 text-xs">
                <div className="font-semibold text-ink">Asignado a</div>
                {ticket.assignee ? (
                  <div className="text-ink/80 space-y-0.5">
                    <div>{ticket.assignee.name}</div>
                    <div>{ticket.assignee.email}</div>
                    {ticket.assignee.area && (
                      <div className="text-muted">
                        Área: {ticket.assignee.area}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-muted text-[11px]">Sin asignar</div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-3 text-xs space-y-1">
                <div className="font-semibold text-ink">SLA</div>
                <div className={slaClass || "text-muted"}>{slaText}</div>
                {ticket.dueAt && (
                  <div className="text-[11px] text-muted">
                    Vence: {formatDate(ticket.dueAt)}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Formulario de gestión (solo resolutor/admin) */}
          {isResolverOrAdmin && (
            <section className="card space-y-4">
              <div>
                <h2 className="card-title">Gestión del ticket</h2>
                <p className="card-subtitle mt-1">
                  Cambia el estado y registra la acción realizada. Los
                  comentarios quedan en el historial.
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <div className="md:w-1/3">
                  <label className="block text-xs font-medium text-muted mb-1">
                    Estado
                  </label>
                  <select
                    className="input text-xs"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-xs font-medium text-muted mb-1">
                    Descripción / Comentario
                  </label>
                  <textarea
                    rows={3}
                    className="input text-xs min-h-[80px] resize-none"
                    placeholder="Describe la acción realizada, contacto con el usuario, pruebas, hallazgos, etc."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>
              </div>

              {/* Adjuntar archivos */}
              <div className="mt-2 border-t border-gray-100 pt-4 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    Adjuntar archivos
                  </h3>
                  <p className="card-subtitle mt-1">
                    Puedes adjuntar capturas, reportes o documentos relacionados
                    con la gestión.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSelectedFile(file);
                    setUploadError(null);
                  }}
                />

                <div className="flex flex-col md:flex-row gap-3 md:items-center">
                  <div className="text-xs text-ink/80">
                    {selectedFile ? (
                      <>
                        <span className="font-semibold">
                          Archivo seleccionado:
                        </span>{" "}
                        {selectedFile.name} (
                        {Math.round(selectedFile.size / 1024)} KB)
                      </>
                    ) : (
                      <span className="text-muted">
                        Ningún archivo seleccionado
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-ghost text-xs"
                    >
                      Seleccionar archivo
                    </button>
                    <button
                      type="button"
                      onClick={handleUploadAttachment}
                      disabled={uploading}
                      className="btn-secondary text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {uploading ? "Subiendo..." : "Subir archivo"}
                    </button>
                  </div>
                </div>

                {uploadError && (
                  <div className="text-xs text-red-600">{uploadError}</div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="btn-ghost text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleUpdate}
                  className="btn-primary text-xs"
                >
                  Guardar gestión
                </button>
              </div>
            </section>
          )}

          {/* Adjuntos visibles para cualquier rol */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <section className="card">
              <h2 className="card-title mb-2">Archivos adjuntos</h2>
              <ul className="space-y-1 text-xs text-ink/80">
                {ticket.attachments.map((att) => (
                  <li key={att.id} className="flex justify-between gap-2">
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline truncate max-w-xs"
                    >
                      {att.fileName}
                    </a>
                    <span className="text-[11px] text-muted">
                      {Math.round(att.fileSize / 1024)} KB ·{" "}
                      {new Date(att.uploadedAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Historial */}
          <section className="card">
            <h2 className="card-title mb-3">Historial del ticket</h2>
            {ticket.events.length === 0 ? (
              <div className="text-xs text-muted">Sin eventos aún.</div>
            ) : (
              <ul className="space-y-2">
                {ticket.events.map((ev) => (
                  <li key={ev.id} className="flex gap-2 text-xs">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div>
                      <div className="text-ink">
                        <span className="font-semibold">{ev.action}</span>{" "}
                        <span className="text-muted">
                          · {formatDate(ev.at)}
                          {ev.by ? ` · ${ev.by}` : ""}
                        </span>
                      </div>
                      {ev.description && (
                        <div className="text-ink/80">{ev.description}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
