import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";



export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (session.user.role !== "resolver" && session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: {
      role: { in: ["resolver", "admin"] as any },
    },
    select: {
      id: true,
      name: true,
      role: true,
      area: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}
