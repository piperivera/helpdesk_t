"use client";

import { useState, useEffect, FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Priority = "Baja" | "Media" | "Alta";
type TicketType = "Incidente" | "Solicitud" | "Cambio";

export default function CreateTicketPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [area, setArea] = useState("");
  const [priority, setPriority] = useState<Priority>("Media");
  const [type, setType] = useState<TicketType>("Incidente");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // adjuntos
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-muted">Cargando sesión...</p>
      </div>
    );
  }

  if (!session?.user) return null;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setUploadError(null);

    if (!title || !description || !area) {
      setErrorMsg("Completa título, descripción y área.");
      return;
    }

    try {
      setSaving(true);

      // 1) Crear ticket
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          area,
          priority,
          type,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al crear ticket");
      }

      const created = await res.json(); // created.id

      // 2) Si hay archivo seleccionado, subirlo
      if (selectedFile) {
        const fd = new FormData();
        fd.append("file", selectedFile);

        const uploadRes = await fetch(
          `/api/tickets/${created.id}/attachments`,
          {
            method: "POST",
            body: fd,
          }
        );

        if (!uploadRes.ok) {
          const d = await uploadRes.json().catch(() => ({}));
          // No frenamos la creación, solo mostramos aviso
          setUploadError(
            d.error || "El ticket se creó, pero el archivo falló."
          );
        }
      }

      // 3) Redirigir al detalle del ticket
      router.push(`/tickets/${created.id}`);
    } catch (err: any) {
      setErrorMsg(err.message ?? "Error inesperado al crear el ticket");
    } finally {
      setSaving(false);
    }
  }

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
              <p className="text-[11px] text-muted">Nuevo ticket</p>
              <p className="text-xs font-medium text-ink">
                Crear solicitud al área TI
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
        <div className="max-w-2xl mx-auto animate-fadeIn">
          <form
            onSubmit={handleSubmit}
            className="card space-y-4 sm:space-y-5 sm:p-6"
          >
            <div>
              <h1 className="card-title mb-1">Nuevo ticket</h1>
              <p className="card-subtitle">
                Describe tu solicitud o incidente para que el equipo de TI pueda
                ayudarte rápidamente.
              </p>
            </div>

            {errorMsg && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {errorMsg}
              </div>
            )}

            {/* Título */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Título
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
                placeholder="Ej: PC no enciende"
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Descripción
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="input min-h-[120px] resize-none"
                placeholder="Describe el problema con el mayor detalle posible: cuándo empezó, qué has intentado, mensajes de error, etc."
              />
            </div>

            {/* Área / Prioridad / Tipo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Área
                </label>
                <input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="input"
                  placeholder="Ej: TI, Logística, Operaciones..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Prioridad
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="input text-xs"
                >
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Tipo
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as TicketType)}
                  className="input text-xs"
                >
                  <option value="Incidente">Incidente</option>
                  <option value="Solicitud">Solicitud</option>
                  <option value="Cambio">Cambio</option>
                </select>
              </div>
            </div>

            {/* Adjuntar archivo en la creación */}
            <div className="border-t border-gray-100 pt-4 mt-2 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  Adjuntar archivos (opcional)
                </h3>
                <p className="card-subtitle mt-1">
                  Puedes adjuntar capturas de pantalla, reportes o documentos
                  relacionados. Esto ayuda a resolver más rápido tu solicitud.
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-3 md:items-center">
                <input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSelectedFile(file);
                    setUploadError(null);
                  }}
                  className="text-xs"
                />
                {selectedFile && (
                  <span className="text-[11px] text-ink/80">
                    {selectedFile.name} ·{" "}
                    {Math.round(selectedFile.size / 1024)} KB
                  </span>
                )}
              </div>

              {uploadError && (
                <div className="mt-1 text-xs text-red-600">{uploadError}</div>
              )}
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="btn-ghost text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary text-xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? "Creando..." : "Crear ticket"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
