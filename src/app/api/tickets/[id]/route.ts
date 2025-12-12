import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { sendTicketUpdatedEmail } from "@/lib/email";

const prisma = new PrismaClient();

type RouteParams = {
  id: string;
};

// GET /api/tickets/:id
export async function GET(
  req: Request,
  { params }: { params: Promise<RouteParams> }   // 👈 params es Promise
) {
  const { id } = await params;                   // 👈 desestructuramos con await

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (!id) {
    return NextResponse.json(
      { error: "Id de ticket inválido" },
      { status: 400 }
    );
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      requester: true,
      assignee: true,
      events: {
        orderBy: { at: "asc" },
      },
      attachments: {
        orderBy: { uploadedAt: "asc" }, // 👈 adjuntos ordenados
      },
    },
  });

  if (!ticket) {
    return NextResponse.json(
      { error: "Ticket no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json(ticket);
}

// PATCH /api/tickets/:id
export async function PATCH(
  req: Request,
  { params }: { params: Promise<RouteParams> }   // 👈 igual aquí
) {
  const { id } = await params;

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (!id) {
    return NextResponse.json(
      { error: "Id de ticket inválido" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));

  const { status, assigneeId, comment } = body as {
    status?: string;
    assigneeId?: string | null;
    comment?: string;
  };

  if (!status && typeof assigneeId === "undefined" && !comment) {
    return NextResponse.json(
      { error: "No hay cambios para aplicar" },
      { status: 400 }
    );
  }

  const updates: any = {};
  const actions: string[] = [];

  if (status) {
    updates.status = status as any;
    actions.push(`Estado cambiado a ${status.replace("_", " ")}`);
  }

  if (typeof assigneeId !== "undefined") {
    updates.assigneeId = assigneeId;
    if (assigneeId) {
      actions.push("Ticket reasignado");
    } else {
      actions.push("Ticket dejado sin asignar");
    }
  }

  const actionText =
    actions.length > 0 ? actions.join(" · ") : "Actualización de ticket";

  try {
    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        ...updates,
        events: {
          create: {
            action: actionText,
            description: comment || null,
            by: session.user.name ?? session.user.email ?? "Sistema",
          },
        },
      },
      include: {
        requester: true,
        assignee: true,
        events: { orderBy: { at: "asc" } },
        attachments: { orderBy: { uploadedAt: "asc" } }, // 👈 adjuntos también aquí
      },
    });

    try {
      await sendTicketUpdatedEmail({
        to: ticket.requester.email,
        ticketNumber: ticket.number,
        title: ticket.title,
        detailUrl: `${
          process.env.APP_URL || "http://localhost:3000"
        }/tickets/${ticket.id}`,
        message: comment || actionText,
      });
    } catch {
      // ignorar errores de envío de correo
    }

    return NextResponse.json(ticket);
  } catch (err) {
    console.error("Error al actualizar ticket:", err);
    return NextResponse.json(
      { error: "Error al actualizar ticket" },
      { status: 500 }
    );
  }
}
