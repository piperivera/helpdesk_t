import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { sendTicketCreatedEmail } from "@/lib/email";

const prisma = new PrismaClient();

// Función helper: calcula SLA según prioridad
function slaHoursByPriority(priority: string) {
  switch (priority) {
    case "Alta":
      return 8;
    case "Media":
      return 24;
    case "Baja":
      return 72;
    default:
      return 48;
  }
}

// -------------------------
// POST: Crear ticket
// -------------------------
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (session.user.role !== "requester") {
    return NextResponse.json(
      { error: "Solo los solicitantes pueden crear tickets" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { title, description, area, priority, type } = body;

  if (!title || !description || !area || !priority || !type) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  const slaHours = slaHoursByPriority(priority);
  const dueAt = new Date(Date.now() + slaHours * 3600 * 1000);

  // Generar número consecutivo
  const count = await prisma.ticket.count();
  const number = `TIT-${String(count + 1).padStart(5, "0")}`;

  const ticket = await prisma.ticket.create({
    data: {
      number,
      title,
      description,
      area,
      requesterId: session.user.id,
      priority,
      type,
      dueAt,
      events: {
        create: [
          {
            action: "Ticket creado",
            by: session.user.name,
          },
        ],
      },
    },
    include: {
      requester: true,
      assignee: true,
      events: true,
    },
  });

  if (ticket.requester?.email) {
    await sendTicketCreatedEmail({
      to: ticket.requester.email,
      ticketNumber: ticket.number,
      title: ticket.title,
      requesterName: ticket.requester.name,
      ticketId: ticket.id,
    });
  }

  return NextResponse.json(ticket);
}

// -------------------------
// GET: Listar tickets
// -------------------------
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const role = session.user.role;

  let tickets;

  if (role === "admin") {
    tickets = await prisma.ticket.findMany({
      orderBy: { createdAt: "desc" },
    });
  } else if (role === "resolver") {
    tickets = await prisma.ticket.findMany({
      where: {
        OR: [
          { assigneeId: session.user.id },
          { assigneeId: null }, // sin asignar
        ],
      },
      orderBy: { createdAt: "desc" },
    });
  } else {
    // requester
    tickets = await prisma.ticket.findMany({
      where: { requesterId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
  }

  return NextResponse.json(tickets);
}
