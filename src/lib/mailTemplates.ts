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
  headerLabel: string; // texto pequeño arriba, ej: "Ticket creado"
  mainTitle: string; // título grande del correo
  introHtml: string; // párrafo principal (puede llevar <strong>, <br>, etc.)
  extraInfoHtml?: string; // bloque adicional opcional
  highlightColor?: string; // para SLA alerta, etc.
  preheaderText?: string; // texto previo (preview en bandeja)
};

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Plantilla base con mejoras para:
 * - Mejor render cross-client (Gmail/Outlook) usando tablas
 * - Mejor comportamiento en modo oscuro (forzar colores + bgcolor)
 * - Preheader (texto preview en bandeja)
 * - Escapado básico para campos de usuario
 *
 * CAMBIO CLAVE SOLICITADO:
 * - El bloque "extraInfoHtml" ahora se renderiza dentro de un recuadro OSCURO
 *   y con el TEXTO forzado a BLANCO para que en Gmail/Outlook (dark mode) NO se apague.
 */
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
    preheaderText,
  } = opts;

  const accent = highlightColor || BRAND_BLUE;

  const safeHeaderLabel = escapeHtml(headerLabel);
  const safeMainTitle = escapeHtml(mainTitle);
  const safeTicketNumber = escapeHtml(ticketNumber);
  const safeTicketTitle = escapeHtml(ticketTitle);
  const safePriority = escapeHtml(priority);
  const safeStatus = escapeHtml(status);
  const safeCreatedAt = escapeHtml(createdAt);
  const safeRequesterName = escapeHtml(requesterName);

  // Preheader: lo que se ve en la bandeja antes de abrir el correo
  const preheader =
    preheaderText ||
    `${headerLabel}: Ticket #${ticketNumber} – ${ticketTitle}`.slice(0, 140);

  // Colores “forzados” para legibilidad en dark-mode agresivo
  const BG = BRAND_GRAY_BG;
  const CARD_BG = "#ffffff";
  const BORDER = "#d0d5e2";
  const TEXT = "#111827";
  const MUTED = "#4b5563";
  const SUBTLE = "#6b7280";
  const FOOT_BG = "#f3f4f6";

  // Recuadro “asunto/detalle” oscuro + texto blanco (lo que pediste)
  const NOTE_BG = "#0b1220";
  const NOTE_BORDER = "#27324a";
  const NOTE_TEXT = "#ffffff";
  const NOTE_TEXT_MUTED = "#cbd5e1";

  return `
  <!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <meta name="x-apple-disable-message-reformatting" />
      <meta name="color-scheme" content="light" />
      <meta name="supported-color-schemes" content="light" />
      <title>${safeHeaderLabel} – Ticket #${safeTicketNumber}</title>
    </head>

    <body style="margin:0; padding:0; background:${BG};" bgcolor="${BG}">
      <!-- Preheader (texto oculto que aparece en la bandeja) -->
      <div style="display:none; font-size:1px; line-height:1px; max-height:0px; max-width:0px; opacity:0; overflow:hidden; mso-hide:all;">
        ${escapeHtml(preheader)}
      </div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="background:${BG}; padding:24px 12px;" bgcolor="${BG}">
        <tr>
          <td align="center">

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="max-width: 620px; margin: 0 auto; background:${CARD_BG}; border-radius: 12px; overflow: hidden; border: 1px solid ${BORDER};"
              bgcolor="${CARD_BG}">

              <!-- Header -->
              <tr>
                <td style="background:${BRAND_BLUE}; padding: 16px 24px; color:#ffffff;" bgcolor="${BRAND_BLUE}">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="text-align:left; vertical-align:middle;">
                        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,.85);">
                          ${safeHeaderLabel}
                        </div>
                        <div style="font-family: Arial, Helvetica, sans-serif; margin-top: 4px; font-size: 18px; font-weight: 700; color:#ffffff;">
                          Helpdesk UPK
                        </div>
                      </td>
                      <td style="text-align:right; vertical-align:middle;">
                        <img src="${LOGO_URL}" alt="UPK" width="44"
                          style="max-height: 32px; display: inline-block; border:0; outline:none; text-decoration:none; height:auto;" />
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding: 24px 24px 10px 24px; background:${CARD_BG}; color:${TEXT};" bgcolor="${CARD_BG}">
                  <h1 style="margin: 0 0 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 20px; color: ${TEXT}; font-weight: 700;">
                    ${safeMainTitle}
                  </h1>

                  <p style="margin: 8px 0 16px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: ${MUTED}; line-height: 1.6;">
                    Estimado/a <strong style="color:${TEXT};">${safeRequesterName}</strong>,
                  </p>

                  <div style="margin: 0 0 12px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: ${MUTED}; line-height: 1.6;">
                    ${introHtml}
                  </div>

                  ${
                    extraInfoHtml
                      ? `
                      <!-- Recuadro OSCURO con TEXTO BLANCO (Asunto/Detalle) -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                        style="margin-top: 14px; border-radius: 12px; border: 1px solid ${NOTE_BORDER}; background:${NOTE_BG};"
                        bgcolor="${NOTE_BG}">
                        <tr>
                          <td style="
                            padding: 14px 14px;
                            background:${NOTE_BG};
                            color:${NOTE_TEXT};
                            font-family: Arial, Helvetica, sans-serif;
                            font-size: 13px;
                            line-height: 1.6;
                          " bgcolor="${NOTE_BG}">
                            <div style="color:${NOTE_TEXT};">
                              ${extraInfoHtml}
                            </div>
                          </td>
                        </tr>
                      </table>
                      `
                      : ""
                  }

                  <!-- Detalle del ticket (fondo blanco + texto forzado) -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                    style="margin-top: 20px; border-radius: 10px; border: 1px solid #e0e7ff; background:#ffffff;"
                    bgcolor="#ffffff">
                    <tr>
                      <td style="padding: 12px 14px; color:${TEXT};" bgcolor="#ffffff">
                        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: ${accent}; font-weight: 800; margin-bottom: 6px;">
                          Detalle del ticket
                        </div>

                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif;">
                          <tr>
                            <td style="padding:4px 0; font-size: 13px; color:${TEXT};">
                              <strong>ID:</strong> #${safeTicketNumber}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:4px 0; font-size: 13px; color:${TEXT};">
                              <strong>Título:</strong> ${safeTicketTitle}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:4px 0; font-size: 13px; color:${TEXT};">
                              <strong>Prioridad:</strong> ${safePriority}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:4px 0; font-size: 13px; color:${TEXT};">
                              <strong>Estado:</strong> ${safeStatus}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:4px 0; font-size: 13px; color:${TEXT};">
                              <strong>Creado el:</strong> ${safeCreatedAt}
                            </td>
                          </tr>
                        </table>

                      </td>
                    </tr>
                  </table>

                  <div style="text-align:center; margin-top:24px; margin-bottom:6px;">
                    <a href="${linkToTicket}"
                      style="background:${accent}; color:#ffffff; padding: 10px 22px; border-radius: 999px;
                             text-decoration:none; font-family: Arial, Helvetica, sans-serif; font-size:14px; font-weight:800; display:inline-block;">
                      Ver ticket en el portal
                    </a>
                  </div>

                  <p style="margin-top: 8px; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: ${SUBTLE}; text-align: center; line-height:1.5;">
                    Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
                    <span style="color: ${accent}; word-break: break-all;">${linkToTicket}</span>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:${FOOT_BG}; padding: 12px 24px; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #6b7280;"
                    bgcolor="${FOOT_BG}">
                  Helpdesk UPK – Sistema interno de soporte<br />
                  © ${new Date().getFullYear()} UPK. Todos los derechos reservados.
                </td>
              </tr>

            </table>

          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
}

/* =========================================================
 * 1) Ticket creado
 * =======================================================*/

export function buildTicketCreatedEmail(opts: TicketEmailCommon) {
  const { ticketNumber, ticketTitle } = opts;

  const subject = `Ticket creado (#${ticketNumber}) – ${ticketTitle}`;

  const html = buildBaseTicketEmailHTML({
    ...opts,
    headerLabel: "Ticket creado",
    mainTitle: "Hemos recibido tu solicitud",
    preheaderText: `Ticket #${ticketNumber} creado correctamente. Puedes ver el detalle en el portal.`,
    introHtml: `
      Tu ticket <strong>#${escapeHtml(ticketNumber)}</strong> ha sido creado correctamente en el sistema de Helpdesk UPK.
      Nuestro equipo revisará tu caso y se pondrá en contacto contigo en el menor tiempo posible.
    `,
    extraInfoHtml: `
      <div style="color:#ffffff;"><strong style="color:#ffffff;">Asunto:</strong> ${escapeHtml(ticketTitle)}</div>
      <div style="height:6px; line-height:6px;">&nbsp;</div>
      <div style="color:#ffffff;"><strong style="color:#ffffff;">Detalle:</strong> Ticket creado correctamente.</div>
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
  const { ticketNumber, ticketTitle, updatedBy, newStatusLabel, comment } = opts;

  const subject = `Actualización del ticket (#${ticketNumber}) – ${ticketTitle}`;

  const commentHtml = comment
    ? escapeHtml(comment).replace(/\n/g, "<br />")
    : "El ticket ha sido actualizado en el sistema.";

  const html = buildBaseTicketEmailHTML({
    ...opts,
    headerLabel: "Ticket actualizado",
    mainTitle: `Tu ticket ha cambiado a estado: ${newStatusLabel}`,
    preheaderText: `Tu ticket #${ticketNumber} cambió a estado ${newStatusLabel}.`,
    introHtml: `
      Tu ticket <strong>#${escapeHtml(ticketNumber)}</strong> ha sido actualizado por <strong>${escapeHtml(updatedBy)}</strong>.
    `,
    extraInfoHtml: `
      <div style="color:#ffffff;"><strong style="color:#ffffff;">Asunto:</strong> ${escapeHtml(ticketTitle)}</div>
      <div style="height:6px; line-height:6px;">&nbsp;</div>
      <div style="color:#ffffff;"><strong style="color:#ffffff;">Detalle de la actualización:</strong><br />${commentHtml}</div>
      <div style="height:6px; line-height:6px;">&nbsp;</div>
      <div style="color:#ffffff;"><strong style="color:#ffffff;">Cambio de estado a:</strong> ${escapeHtml(newStatusLabel)}</div>
    `,
  });

  return { subject, html };
}

/* =========================================================
 * 3) Ticket resuelto
 * =======================================================*/

export function buildTicketResolvedEmail(
  opts: TicketEmailCommon & { resolvedBy: string; resolutionNote?: string }
) {
  const { ticketNumber, ticketTitle, resolvedBy, resolutionNote } = opts;

  const subject = `Ticket resuelto (#${ticketNumber}) – ${ticketTitle}`;

  const noteHtml = resolutionNote
    ? escapeHtml(resolutionNote).replace(/\n/g, "<br />")
    : "El ticket ha sido marcado como resuelto por el equipo de soporte.";

  const html = buildBaseTicketEmailHTML({
    ...opts,
    headerLabel: "Ticket resuelto",
    mainTitle: "Tu solicitud ha sido resuelta",
    preheaderText: `Tu ticket #${ticketNumber} fue marcado como Resuelto.`,
    introHtml: `
      El ticket <strong>#${escapeHtml(ticketNumber)}</strong> ha sido marcado como <strong>Resuelto</strong> por <strong>${escapeHtml(resolvedBy)}</strong>.
    `,
    extraInfoHtml: `
      <div style="color:#ffffff;"><strong style="color:#ffffff;">Asunto:</strong> ${escapeHtml(ticketTitle)}</div>
      <div style="height:6px; line-height:6px;">&nbsp;</div>
      <div style="color:#ffffff;"><strong style="color:#ffffff;">Detalle de la resolución:</strong><br />${noteHtml}</div>
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
  const { ticketNumber, ticketTitle, hoursLeft, assigneeName } = opts;

  const subject = `Alerta SLA – Ticket #${ticketNumber} próximo a vencer`;

  const html = buildBaseTicketEmailHTML({
    ...opts,
    headerLabel: "Alerta SLA",
    mainTitle: "Ticket próximo a vencer según el SLA definido",
    preheaderText: `Alerta SLA: el ticket #${ticketNumber} está próximo a vencer.`,
    introHtml: `
      El ticket <strong>#${escapeHtml(ticketNumber)}</strong> (${escapeHtml(ticketTitle)}) se encuentra próximo a vencer.
      ${
        hoursLeft > 0
          ? `Quedan aproximadamente <strong>${hoursLeft} horas</strong> antes de la fecha límite.`
          : ""
      }
    `,
    extraInfoHtml: `
      <div style="color:#ffffff;"><strong style="color:#ffffff;">Asunto:</strong> ${escapeHtml(ticketTitle)}</div>
      <div style="height:6px; line-height:6px;">&nbsp;</div>
      <div style="color:#ffffff;"><strong style="color:#ffffff;">Responsable actual:</strong> ${escapeHtml(assigneeName || "Sin asignar")}</div>
      <div style="height:6px; line-height:6px;">&nbsp;</div>
      <div style="color:#ffffff;"><strong style="color:#ffffff;">Detalle:</strong> Revisa el ticket para evitar incumplimientos de SLA.</div>
    `,
    highlightColor: "#b91c1c", // rojo para alerta
  });

  return { subject, html };
}
