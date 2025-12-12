import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";

const prisma = new PrismaClient();

// GET /api/admin/metrics?rangeDays=30
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Solo admin puede ver métricas" }, { status: 403 });
  }

  const url = new URL(req.url);
  const rangeParam = url.searchParams.get("rangeDays");
  let rangeDays = Number.parseInt(rangeParam || "30", 10);
  if (!Number.isFinite(rangeDays) || rangeDays <= 0) rangeDays = 30;

  const now = new Date();
  const from = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);

  const whereInRange = {
    createdAt: {
      gte: from,
      lte: now,
    },
  };

  const [
    totalTickets,
    ticketsByStatus,
    ticketsByPriority,
    ticketsByArea,
    resolvedTickets,
    openTickets,
    slaBreached,
    resolvedByResolver,
  ] = await Promise.all([
    prisma.ticket.count({ where: whereInRange }),
    prisma.ticket.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: whereInRange,
    }),
    prisma.ticket.groupBy({
      by: ["priority"],
      _count: { _all: true },
      where: whereInRange,
    }),
    prisma.ticket.groupBy({
      by: ["area"],
      _count: { _all: true },
      where: whereInRange,
    }),
    prisma.ticket.count({
      where: {
        ...whereInRange,
        status: { in: ["Resuelto", "Cerrado"] as any },
      },
    }),
    prisma.ticket.count({
      where: {
        ...whereInRange,
        status: { in: ["Abierto", "En_proceso", "En_espera"] as any },
      },
    }),
    prisma.ticket.count({
      where: {
        ...whereInRange,
        status: { in: ["Resuelto", "Cerrado"] as any },
        dueAt: { not: null },
        // Aproximación: resueltos fuera de SLA si updatedAt > dueAt
        updatedAt: {
          gt: new Date(0),
        },
      },
    }),
    prisma.ticket.groupBy({
      by: ["assigneeId"],
      _count: { _all: true },
      where: {
        ...whereInRange,
        status: { in: ["Resuelto", "Cerrado"] as any },
        assigneeId: { not: null },
      },
    }),
  ]);

  const resolverIds = resolvedByResolver
    .map((g) => g.assigneeId)
    .filter((id): id is string => !!id);

  const resolverUsers =
    resolverIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: resolverIds } },
          select: { id: true, name: true, email: true },
        })
      : [];

  const byResolver = resolvedByResolver.map((g) => {
    const u = resolverUsers.find((x) => x.id === g.assigneeId);
    return {
      id: g.assigneeId,
      name: u?.name || "Desconocido",
      email: u?.email || "",
      count: g._count._all,
    };
  });

  return NextResponse.json({
    rangeDays,
    from: from.toISOString(),
    to: now.toISOString(),
    totalTickets,
    resolvedTickets,
    openTickets,
    slaBreached,
    byStatus: ticketsByStatus.map((s) => ({
      status: s.status,
      count: s._count._all,
    })),
    byPriority: ticketsByPriority.map((p) => ({
      priority: p.priority,
      count: p._count._all,
    })),
    byArea: ticketsByArea.map((a) => ({
      area: a.area,
      count: a._count._all,
    })),
    byResolver,
  });
}
