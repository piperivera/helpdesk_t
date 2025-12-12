"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="page-shell">
        <main className="page-main flex items-center justify-center">
          <div className="card text-center">
            <p className="text-xs text-muted">Cargando sesión...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!session?.user) {
    // mientras redirige
    return null;
  }

  const role = session.user.role;
  const name = session.user.name;
  const area = session.user.area;

  return (
    <div className="page-shell">
      {/* Topbar */}
      <header className="topbar">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-[10px] font-semibold text-white shadow-soft">
            UPK
          </div>
          <div>
            <h1 className="text-sm md:text-base font-semibold text-ink">
              UPK Helpdesk
            </h1>
            <p className="text-[11px] text-muted">
              Inicio
            </p>
          </div>
        </div>

        <div className="topbar-right gap-3 text-xs md:text-sm">
          <div className="text-right">
            <div className="font-medium text-ink">{name}</div>
            <div className="text-[11px] text-muted">
              Rol: <span className="uppercase">{role}</span>
              {area ? ` · Área: ${area}` : ""}
            </div>
          </div>

          <button
            onClick={() => router.push("/profile")}
            className="btn-secondary"
          >
            Mi perfil
          </button>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="btn-ghost"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="page-main space-y-4">
        {/* Mensaje según rol */}
        <section className="card">
          <h2 className="card-title">Bienvenido/a, {name}</h2>
          <p className="card-subtitle">
            Estás autenticado como{" "}
            <span className="font-semibold">{role}</span>
            {area ? ` del área ${area}` : ""}.
          </p>
        </section>

        {/* Acciones solicitante */}
        {role === "requester" && (
          <section className="card">
            <h3 className="section-title">Acciones de solicitante</h3>
            <p className="text-xs text-muted mb-3">
              Crea nuevos tickets, revisa el estado y consulta tu histórico de
              solicitudes.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => router.push("/tickets/create")}
                className="btn-primary"
              >
                Crear ticket
              </button>
              <button
                onClick={() => router.push("/tickets/mine")}
                className="btn-secondary"
              >
                Ver mis tickets
              </button>
            </div>
          </section>
        )}

        {/* Acciones resolutor */}
        {(role === "resolver" || role === "admin") && (
          <section className="card">
            <h3 className="section-title">Acciones de resolutor</h3>
            <p className="text-xs text-muted mb-3">
              Accede a tu bandeja de tickets asignados, cambia estados y agrega
              comentarios a cada caso.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => router.push("/tickets/resolver")}
                className="btn-primary"
              >
                Bandeja de tickets
              </button>
            </div>
          </section>
        )}

        {/* Vista admin */}
        {role === "admin" && (
          <section className="card">
            <h3 className="section-title">Vista de administrador</h3>
            <p className="text-xs text-muted mb-3">
              Revisa métricas generales, SLA, volumen por área, desempeño de
              resolutores y gestiona los usuarios del sistema.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => router.push("/admin/tickets")}
                className="btn-primary"
              >
                Ver todos los tickets
              </button>
              <button
                onClick={() => router.push("/admin/metrics")}
                className="btn-success"
              >
                Ver métricas
              </button>
              <button
                onClick={() => router.push("/admin/users")}
                className="btn-warning"
              >
                Gestionar usuarios
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
