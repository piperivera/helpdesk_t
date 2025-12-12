// src/lib/mailTemplates.ts

const BRAND_BLUE = "#00207a"; // azul UPK aproximado
const BRAND_GRAY_BG = "#f4f5fb";

// Ajusta si usas otra env var
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";

const LOGO_URL = `${APP_URL}/upk-logo.png`;

type TicketEmailCommon = {
  ticketNumber: string;
  ticketTitle: string;
  priority: string;
  status: string;
  createdAt: string;
  requesterName: string;
  linkToTicket: string;
};

type BaseTemplateOptions = TicketEmailCommon & {
  headerLabel: string;   // texto pequeño arriba, ej: "Ticket creado"
  mainTitle: string;     // título grande del correo
  introHtml: string;     // párrafo principal (puede llevar <strong>, <br>, etc.)
  extraInfoHtml?: string; // bloque adicional opcional
  highlightColor?: string; // para SLA alerta, etc.
};

function buildBaseTicketEmailHTML(opts: BaseTemplateOptions): string {
  const {
    headerLabel,
    mainTitle,
    introHtml,
    extraInfoHtml,
    ticketNumber,
    ticketTitle,
    priority,
    status,
    createdAt,
    requesterName,
    linkToTicket,
    highlightColor,
  } = opts;

  const accent = highlightColor || BRAND_BLUE;

  return `
  <div style="font-family: Arial, Helvetica, sans-serif; background-color: ${BRAND_GRAY_BG}; padding: 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #d0d5e2;">
      <!-- Header -->
      <tr>
        <td style="background-color: ${BRAND_BLUE}; padding: 16px 24px; color: #ffffff;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="text-align: left;">
                <div style="font-size: 11px; text-transform: uppercase; opacity: 0.85; letter-spacing: 1px;">
                  ${headerLabel}
                </div>
                <div style="margin-top: 4px; font-size: 18px; font-weight: 600;">
                  Helpdesk UPK
                </div>
              </td>
              <td style="text-align: right;">
                <img src="${LOGO_URL}" alt="UPK" style="max-height: 32px; display: inline-block;" />
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding: 24px 24px 10px 24px;">
          <h1 style="margin: 0 0 8px 0; font-size: 20px; color: #111827; font-weight: 600;">
            ${mainTitle}
          </h1>
          <p style="margin: 8px 0 16px 0; font-size: 14px; color: #4b5563; line-height: 1.6;">
            Estimado/a <strong>${requesterName}</strong>,
          </p>
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #4b5563; line-height: 1.6;">
            ${introHtml}
          </p>

          ${
            extraInfoHtml
              ? `<div style="margin-top: 8px; font-size: 13px; color: #4b5563; line-height: 1.5;">
                   ${extraInfoHtml}
                 </div>`
              : ""
          }

          <div style="margin-top: 20px; padding: 12px 14px; border-radius: 10px; background: #f3f4ff; border: 1px solid #e0e7ff;">
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: ${accent}; font-weight: 600; margin-bottom: 6px;">
              Detalle del ticket
            </div>
            <div style="font-size: 13px; color: #374151; line-height: 1.5;">
              <div><strong>ID:</strong> #${ticketNumber}</div>
              <div><strong>Título:</strong> ${ticketTitle}</div>
              <div><strong>Prioridad:</strong> ${priority}</div>
              <div><strong>Estado:</strong> ${status}</div>
              <div><strong>Creado el:</strong> ${createdAt}</div>
            </div>
          </div>

          <div style="text-align: center; margin-top: 24px; margin-bottom: 6px;">
            <a href="${linkToTicket}"
              style="background-color: ${accent}; color: #ffffff; padding: 10px 22px; border-radius: 999px;
                     text-decoration: none; font-size: 14px; font-weight: 500; display: inline-block;">
              Ver ticket en el portal
            </a>
          </div>

          <p style="margin-top: 8px; font-size: 12px; color: #6b7280; text-align: center;">
            Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
            <span style="color: ${accent}; word-break: break-all;">${linkToTicket}</span>
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background-color: #f3f4f6; padding: 12px 24px; text-align: center; font-size: 11px; color: #9ca3af;">
          Helpdesk UPK – Sistema interno de soporte<br />
          © ${new Date().getFullYear()} UPK. Todos los derechos reservados.
        </td>
      </tr>
    </table>
  </div>
  `;
}

/* =========================================================
 * 1) Ticket creado
 * =======================================================*/

export function buildTicketCreatedEmail(opts: TicketEmailCommon) {
  const { requesterName, ticketNumber, ticketTitle } = opts;

  const subject = `Ticket creado (#${ticketNumber}) – ${ticketTitle}`;

  const html = buildBaseTicketEmailHTML({
    ...opts,
    headerLabel: "Ticket creado",
    mainTitle: "Hemos recibido tu solicitud",
    introHtml: `
      Tu ticket <strong>#${ticketNumber}</strong> ha sido creado correctamente en el sistema de Helpdesk UPK.
      Nuestro equipo revisará tu caso y se pondrá en contacto contigo en el menor tiempo posible.
    `,
    extraInfoHtml: `
      Puedes hacer seguimiento al estado del ticket desde el portal. Si necesitas aportar más información,
      responde a este correo o agrega comentarios directamente en el ticket.
    `,
  });

  return { subject, html };
}

/* =========================================================
 * 2) Ticket actualizado / cambio de estado
 * =======================================================*/

export function buildTicketUpdatedEmail(
  opts: TicketEmailCommon & { updatedBy: string; newStatusLabel: string; comment?: string }
) {
  const { requesterName, ticketNumber, ticketTitle, updatedBy, newStatusLabel, comment } = opts;

  const subject = `Actualización del ticket (#${ticketNumber}) – ${ticketTitle}`;

  const commentHtml = comment
    ? `<strong>Comentario del gestor:</strong><br />${comment.replace(/\n/g, "<br />")}`
    : "El ticket ha sido actualizado en el sistema.";

  const html = buildBaseTicketEmailHTML({
    ...opts,
    headerLabel: "Ticket actualizado",
    mainTitle: `Tu ticket ha cambiado a estado: ${newStatusLabel}`,
    introHtml: `
      Tu ticket <strong>#${ticketNumber}</strong> ha sido actualizado por <strong>${updatedBy}</strong>.
    `,
    extraInfoHtml: commentHtml,
  });

  return { subject, html };
}

/* =========================================================
 * 3) Ticket resuelto
 * =======================================================*/

export function buildTicketResolvedEmail(
  opts: TicketEmailCommon & { resolvedBy: string; resolutionNote?: string }
) {
  const { requesterName, ticketNumber, ticketTitle, resolvedBy, resolutionNote } = opts;

  const subject = `Ticket resuelto (#${ticketNumber}) – ${ticketTitle}`;

  const noteHtml = resolutionNote
    ? `<strong>Detalle de la resolución:</strong><br />${resolutionNote.replace(/\n/g, "<br />")}`
    : "El ticket ha sido marcado como resuelto por el equipo de soporte.";

  const html = buildBaseTicketEmailHTML({
    ...opts,
    headerLabel: "Ticket resuelto",
    mainTitle: "Tu solicitud ha sido resuelta",
    introHtml: `
      El ticket <strong>#${ticketNumber}</strong> ha sido marcado como <strong>Resuelto</strong> por <strong>${resolvedBy}</strong>.
    `,
    extraInfoHtml: `
      ${noteHtml}
      <br /><br />
      Si consideras que el incidente no ha quedado completamente resuelto, puedes responder a este correo
      o reabrir el ticket desde el portal.
    `,
  });

  return { subject, html };
}

/* =========================================================
 * 4) Alerta de SLA
 * =======================================================*/

export function buildTicketSlaWarningEmail(
  opts: TicketEmailCommon & { hoursLeft: number; assigneeName?: string | null }
) {
  const { ticketNumber, ticketTitle, requesterName, hoursLeft, assigneeName } = opts;

  const subject = `Alerta SLA – Ticket #${ticketNumber} próximo a vencer`;

  const html = buildBaseTicketEmailHTML({
    ...opts,
    headerLabel: "Alerta SLA",
    mainTitle: "Ticket próximo a vencer según el SLA definido",
    introHtml: `
      El ticket <strong>#${ticketNumber}</strong> (${ticketTitle}) se encuentra próximo a vencer.
      ${hoursLeft > 0 ? `Quedan aproximadamente <strong>${hoursLeft} horas</strong> antes de la fecha límite.` : ""}
    `,
    extraInfoHtml: `
      <strong>Responsable actual:</strong> ${assigneeName || "Sin asignar"}<br />
      Te recomendamos revisar la información del ticket y priorizar su atención para evitar incumplimientos de SLA.
    `,
    highlightColor: "#b91c1c", // rojo para alerta
  });

  return { subject, html };
}
