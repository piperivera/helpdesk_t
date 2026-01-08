"use client";

import { useState, useEffect, FormEvent, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7]">
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

      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, area, priority, type }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Error al crear ticket");
      }

      const created = await res.json();

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
          setUploadError(d.error || "El ticket se creó, pero el archivo falló.");
        }
      }

      router.push(`/tickets/${created.id}`);
    } catch (err: any) {
      setErrorMsg(err.message ?? "Error inesperado al crear el ticket");
    } finally {
      setSaving(false);
    }
  }

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
            <p className="text-[11px] text-muted">Nuevo ticket</p>
            <p className="text-xs font-medium text-ink">
              Crear solicitud al área TI
            </p>
          </div>
        </div>

        <div className="topbar-right gap-2">
          <button
            onClick={() => router.back()}
            className="btn-ghost btn-sm"
            type="button"
          >
            Volver
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

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Descripción
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="input min-h-[120px] resize-none"
                placeholder="Describe el problema con el mayor detalle posible..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Área
                </label>
                <input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="input"
                  placeholder="Ej: TI, Logística..."
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

            {/* Adjuntar archivo (UI visible) */}
            <div className="border-t border-gray-100 pt-4 mt-2 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  Adjuntar archivos (opcional)
                </h3>
                <p className="card-subtitle mt-1">
                  Adjunta capturas o documentos para acelerar la solución.
                </p>
              </div>

              {/* input real oculto */}
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
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-outline btn-sm"
                >
                  Seleccionar archivo
                </button>

                <div className="text-[11px] text-ink/80">
                  {selectedFile ? (
                    <>
                      <span className="font-semibold">Seleccionado:</span>{" "}
                      {selectedFile.name} ·{" "}
                      {Math.round(selectedFile.size / 1024)} KB
                    </>
                  ) : (
                    <span className="text-muted">
                      Ningún archivo seleccionado
                    </span>
                  )}
                </div>

                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="btn-ghost btn-sm"
                  >
                    Quitar
                  </button>
                )}
              </div>

              {uploadError && (
                <div className="mt-1 text-xs text-red-600">{uploadError}</div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="btn-ghost btn-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary btn-sm disabled:opacity-60 disabled:cursor-not-allowed"
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
