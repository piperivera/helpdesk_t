// src/lib/email.ts
import nodemailer from "nodemailer";

const APP_URL = process.env.APP_URL || "https://helpdesk-upk.vercel.app/";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true", // false para 587 (STARTTLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM =
  process.env.SMTP_FROM ||
  process.env.SMTP_USER ||
  "Helpdesk UPK <no-reply@example.com>";

function emailEnabled() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(
      "[mailer] SMTP DESHABILITADO. Configura SMTP_* en .env.local para enviar correos."
    );
    return false;
  }
  return true;
}

/**
 * Template base para todos los correos de tickets
 */
function buildTicketEmailTemplate(options: {
  subject: string;
  title: string;
  preheader?: string;
  intro?: string;
  highlight?: string;
  bodyLines?: string[]; // acepta texto o pequeños fragmentos HTML
  actionLabel?: string;
  actionUrl?: string;
  footerNote?: string;
}) {
  const {
    subject,
    title,
    preheader,
    intro,
    highlight,
    bodyLines = [],
    actionLabel,
    actionUrl,
    footerNote,
  } = options;

  const logoUrl = `${APP_URL}/upk-logo.png`;

  const bodyHtml =
    bodyLines.length > 0
      ? bodyLines
          .map((line) =>
            line === ""
              ? `<div style="height:8px;"></div>`
              : `<p style="margin:4px 0; font-size:13px; color:#1f2933; line-height:1.5;">${line}</p>`
          )
          .join("\n")
      : "";

  const preheaderText = preheader || "Notificación de ticket de soporte";

  return `
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charSet="UTF-8" />
    <title>${subject}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      /* fallback minimal para algunos clientes */
      @media (max-width: 600px) {
        .container {
          width: 100% !important;
          padding: 16px !important;
        }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:#0b1220; font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <!-- Preheader (invisible) -->
    <span style="display:none!important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden;">
      ${preheaderText}
    </span>

    <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="background: radial-gradient(circle at top,#172554 0,#020617 55%); padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" class="container" width="100%" cellPadding="0" cellSpacing="0" style="max-width:600px; width:100%; background:linear-gradient(145deg,#020617,#020617); border-radius:24px; border:1px solid rgba(148,163,184,0.4); box-shadow:0 24px 60px rgba(15,23,42,0.8); overflow:hidden;">
            <!-- Header -->
            <tr>
              <td style="padding:20px 24px 16px; border-bottom:1px solid rgba(148,163,184,0.3); background:radial-gradient(circle at top left,#1d4ed8 0,#020617 50%);">
                <table width="100%" cellPadding="0" cellSpacing="0">
                  <tr>
                    <td align="left" style="display:flex; align-items:center; gap:8px;">
                      <img src="${logoUrl}" alt="UPK Helpdesk" width="40" height="40" style="border-radius:999px; border:1px solid rgba(191,219,254,0.4);" />
                    </td>
                    <td align="right" style="font-size:11px; color:#cbd5f5; text-transform:uppercase; letter-spacing:0.08em;">
                      Centro de soporte
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Título -->
            <tr>
              <td style="padding:20px 24px 4px;">
                <h1 style="margin:0 0 6px; font-size:20px; line-height:1.3; color:#e5edff; font-weight:600;">
                  ${title}
                </h1>
                ${
                  intro
                    ? `<p style="margin:0; font-size:13px; color:#cbd5f5; line-height:1.5;">
                    ${intro}
                  </p>`
                    : ""
                }
              </td>
            </tr>

            <!-- Highlight -->
            ${
              highlight
                ? `
            <tr>
              <td style="padding:8px 24px 4px;">
                <div style="display:inline-block; padding:6px 12px; border-radius:999px; border:1px solid rgba(129,140,248,0.6); background:linear-gradient(120deg,rgba(37,99,235,0.2),rgba(79,70,229,0.15)); font-size:11px; color:#bfdbfe; text-transform:uppercase; letter-spacing:0.08em;">
                  ${highlight}
                </div>
              </td>
            </tr>
            `
                : ""
            }

            <!-- Cuerpo -->
            <tr>
              <td style="padding:8px 24px 4px;">
                <div style="background:radial-gradient(circle at top left,rgba(37,99,235,0.12),rgba(15,23,42,0.8)); border-radius:18px; padding:14px 16px; border:1px solid rgba(148,163,184,0.5);">
                  ${bodyHtml}
                </div>
              </td>
            </tr>

            <!-- Botón -->
            ${
              actionLabel && actionUrl
                ? `
            <tr>
              <td style="padding:12px 24px 4px;">
                <a href="${actionUrl}"
                  style="
                    display:inline-block;
                    padding:10px 18px;
                    border-radius:999px;
                    background:linear-gradient(135deg,#2563eb,#4f46e5);
                    color:#e5edff;
                    font-size:13px;
                    font-weight:500;
                    text-decoration:none;
                    box-shadow:0 15px 30px rgba(37,99,235,0.4);
                  ">
                  ${actionLabel}
                </a>
              </td>
            </tr>
            `
                : ""
            }

            <!-- Footer -->
            <tr>
              <td style="padding:18px 24px 20px; border-top:1px solid rgba(51,65,85,0.9); background:radial-gradient(circle at bottom right,#020617 0,#020617 60%);">
                <p style="margin:0 0 4px; font-size:11px; color:#94a3b8;">
                  Este es un correo automático del Helpdesk de UPK.
                </p>
                ${
                  footerNote
                    ? `<p style="margin:0 0 4px; font-size:11px; color:#64748b;">${footerNote}</p>`
                    : ""
                }
                <p style="margin:0; font-size:11px; color:#475569;">
                  Si no esperabas este mensaje, puedes ignorarlo.
                </p>
              </td>
            </tr>
          </table>

          <p style="margin-top:10px; font-size:10px; color:#64748b; max-width:600px;">
            © ${new Date().getFullYear()} UPK · Plataforma de soporte interno.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
}

/* ------------------------------------------------------------------ */
/* 1) Ticket creado                                                    */
/* ------------------------------------------------------------------ */

type TicketCreatedParams = {
  to: string;
  ticketNumber: string;
  title: string;
  requesterName: string;
  ticketId: string;
};

export async function sendTicketCreatedEmail({
  to,
  ticketNumber,
  title,
  requesterName,
  ticketId,
}: TicketCreatedParams) {
  if (!emailEnabled()) return;

  const detailUrl = `${APP_URL}/tickets/${ticketId}`;
  const subject = `Ticket creado: ${ticketNumber}`;

  const html = buildTicketEmailTemplate({
    subject,
    title: `Hemos recibido tu ticket ${ticketNumber}`,
    preheader: `Tu ticket ha sido creado en el Helpdesk`,
    intro: `Hola ${requesterName}, hemos registrado tu solicitud en la mesa de ayuda.`,
    highlight: `Ticket ${ticketNumber}`,
    bodyLines: [
      `Asunto: <strong>${title}</strong>`,
      "",
      `Nuestro equipo revisará tu caso y se pondrá en contacto contigo si necesita más información.`,
    ],
    actionLabel: "Ver ticket",
    actionUrl: detailUrl,
    footerNote: "Conserva este número de ticket para hacer seguimiento a tu caso.",
  });

  await transporter.sendMail({
    from: FROM,
    to,
    subject,
    html,
  });
}

/* ------------------------------------------------------------------ */
/* 2) Ticket actualizado                                               */
/* ------------------------------------------------------------------ */

type TicketUpdatedParams = {
  to: string;
  ticketNumber: string;
  title: string;
  detailUrl: string;
  message: string;
};

export async function sendTicketUpdatedEmail({
  to,
  ticketNumber,
  title,
  detailUrl,
  message,
}: TicketUpdatedParams) {
  if (!emailEnabled()) return;

  const subject = `Actualización del ticket ${ticketNumber}`;

  const html = buildTicketEmailTemplate({
    subject,
    title: `Tu ticket ${ticketNumber} ha sido actualizado`,
    preheader: `Hay una nueva actualización en tu ticket`,
    intro: `Se ha registrado una nueva gestión o comentario en tu ticket.`,
    highlight: `Ticket ${ticketNumber}`,
    bodyLines: [
      `Asunto: <strong>${title}</strong>`,
      "",
      `<strong>Detalle de la actualización:</strong>`,
      message,
    ],
    actionLabel: "Ver actualización",
    actionUrl: detailUrl,
  });

  await transporter.sendMail({
    from: FROM,
    to,
    subject,
    html,
  });
}

/* ------------------------------------------------------------------ */
/* 3) Ticket asignado (al resolutor)                                   */
/* ------------------------------------------------------------------ */

type TicketAssignedParams = {
  to: string;
  ticketNumber: string;
  title: string;
  assigneeName: string;
  ticketId: string;
  requesterName?: string;
};

export async function sendTicketAssignedEmail({
  to,
  ticketNumber,
  title,
  assigneeName,
  ticketId,
  requesterName,
}: TicketAssignedParams) {
  if (!emailEnabled()) return;

  const detailUrl = `${APP_URL}/tickets/${ticketId}`;
  const subject = `Se te ha asignado el ticket ${ticketNumber}`;

  const html = buildTicketEmailTemplate({
    subject,
    title: `Nuevo ticket asignado: ${ticketNumber}`,
    preheader: `Tienes un nuevo ticket asignado en el Helpdesk`,
    intro: `Hola ${assigneeName}, se te ha asignado un nuevo ticket para gestión.`,
    highlight: `Ticket asignado · ${ticketNumber}`,
    bodyLines: [
      `Asunto: <strong>${title}</strong>`,
      requesterName ? `Solicitante: <strong>${requesterName}</strong>` : "",
      "",
      `Por favor, revisa el detalle del caso y avanza con el diagnóstico o solución.`,
    ],
    actionLabel: "Abrir ticket",
    actionUrl: detailUrl,
  });

  await transporter.sendMail({
    from: FROM,
    to,
    subject,
    html,
  });
}

/* ------------------------------------------------------------------ */
/* 4) Ticket resuelto / cerrado (al solicitante)                       */
/* ------------------------------------------------------------------ */

type TicketResolvedParams = {
  to: string;
  ticketNumber: string;
  title: string;
  requesterName: string;
  ticketId: string;
  resolutionSummary?: string;
};

export async function sendTicketResolvedEmail({
  to,
  ticketNumber,
  title,
  requesterName,
  ticketId,
  resolutionSummary,
}: TicketResolvedParams) {
  if (!emailEnabled()) return;

  const detailUrl = `${APP_URL}/tickets/${ticketId}`;
  const subject = `Ticket ${ticketNumber} resuelto`;

  const html = buildTicketEmailTemplate({
    subject,
    title: `Tu ticket ${ticketNumber} ha sido resuelto`,
    preheader: `Hemos marcado tu ticket como resuelto`,
    intro: `Hola ${requesterName}, tu ticket ha sido atendido y se ha marcado como resuelto.`,
    highlight: `Ticket resuelto · ${ticketNumber}`,
    bodyLines: [
      `Asunto: <strong>${title}</strong>`,
      "",
      resolutionSummary
        ? `<strong>Resumen de la solución:</strong><br/>${resolutionSummary}`
        : `Si la solución aplicada no resuelve por completo tu incidencia, puedes responder al ticket para que lo revisemos nuevamente.`,
    ],
    actionLabel: "Ver detalle del ticket",
    actionUrl: detailUrl,
  });

  await transporter.sendMail({
    from: FROM,
    to,
    subject,
    html,
  });
}

/* ------------------------------------------------------------------ */
/* 5) Ticket reabierto                                                 */
/* ------------------------------------------------------------------ */

type TicketReopenedParams = {
  to: string;
  ticketNumber: string;
  title: string;
  ticketId: string;
  whoReopened?: string; // nombre de quien lo reabrió (opcional)
};

export async function sendTicketReopenedEmail({
  to,
  ticketNumber,
  title,
  ticketId,
  whoReopened,
}: TicketReopenedParams) {
  if (!emailEnabled()) return;

  const detailUrl = `${APP_URL}/tickets/${ticketId}`;
  const subject = `Ticket ${ticketNumber} reabierto`;

  const html = buildTicketEmailTemplate({
    subject,
    title: `El ticket ${ticketNumber} ha sido reabierto`,
    preheader: `Un ticket cerrado ha sido reabierto para nueva revisión`,
    intro: whoReopened
      ? `El usuario <strong>${whoReopened}</strong> ha reabierto el ticket.`
      : `El ticket ha sido reabierto para continuar con la gestión.`,
    highlight: `Ticket reabierto · ${ticketNumber}`,
    bodyLines: [
      `Asunto: <strong>${title}</strong>`,
      "",
      `Revisa el historial y los nuevos comentarios para continuar con el caso.`,
    ],
    actionLabel: "Revisar ticket",
    actionUrl: detailUrl,
  });

  await transporter.sendMail({
    from: FROM,
    to,
    subject,
    html,
  });
}

/* ------------------------------------------------------------------ */
/* 6) Alerta SLA (para resolutores)                                    */
/* ------------------------------------------------------------------ */

type TicketSlaAlertParams = {
  to: string;
  ticketNumber: string;
  title: string;
  assigneeName: string;
  ticketId: string;
  slaStatus: "warning" | "breached"; // warning = por vencer, breached = vencido
  dueAt?: string; // ISO
};

export async function sendSlaAlertEmail({
  to,
  ticketNumber,
  title,
  assigneeName,
  ticketId,
  slaStatus,
  dueAt,
}: TicketSlaAlertParams) {
  if (!emailEnabled()) return;

  const detailUrl = `${APP_URL}/tickets/${ticketId}`;
  const isBreached = slaStatus === "breached";

  const subject = isBreached
    ? `SLA vencido · Ticket ${ticketNumber}`
    : `SLA por vencer · Ticket ${ticketNumber}`;

  const highlight = isBreached
    ? `SLA vencido · Atención inmediata`
    : `SLA próximo a vencer`;

  const dueText =
    dueAt != null
      ? new Date(dueAt).toLocaleString("es-ES", {
          dateStyle: "short",
          timeStyle: "short",
        })
      : undefined;

  const bodyLines: string[] = [
    `Asunto: <strong>${title}</strong>`,
  ];

  if (dueText) {
    bodyLines.push(`Compromiso (SLA): <strong>${dueText}</strong>`);
  }

  bodyLines.push(
    "",
    isBreached
      ? "El SLA de este ticket ya se ha vencido. Te recomendamos priorizar su atención de forma inmediata."
      : "Este ticket se encuentra cercano a su tiempo límite de atención. Por favor prioriza la gestión para evitar incumplir el SLA."
  );

  const html = buildTicketEmailTemplate({
    subject,
    title: `Alerta SLA para el ticket ${ticketNumber}`,
    preheader: isBreached
      ? "Este ticket ha incumplido el SLA definido"
      : "Este ticket está por alcanzar el límite de SLA",
    intro: `Hola ${assigneeName}, revisa el siguiente ticket con prioridad.`,
    highlight,
    bodyLines,
    actionLabel: "Abrir ticket",
    actionUrl: detailUrl,
    footerNote:
      "Las alertas SLA te ayudan a priorizar los casos con mayor riesgo de incumplimiento.",
  });

  await transporter.sendMail({
    from: FROM,
    to,
    subject,
    html,
  });
}
