import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// GET /api/users -> solo admin
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json(
      { error: "Solo admin puede ver usuarios" },
      { status: 403 }
    );
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      area: true,
      isActive: true,    // 👈
      createdAt: true,
    },
  });

  return NextResponse.json(users);
}

// POST /api/users -> crear usuario (solo admin)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json(
      { error: "Solo admin puede crear usuarios" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { name, email, password, role, area } = body as {
    name?: string;
    email?: string;
    password?: string;
    role?: "requester" | "resolver" | "admin";
    area?: string | null;
  };

  if (!name || !email || !password || !role) {
    return NextResponse.json(
      { error: "Faltan campos obligatorios" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Ya existe un usuario con ese correo" },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      area: area || null,
      isActive: true, // 👈 por si acaso
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      area: true,
      isActive: true,   // 👈
      createdAt: true,
    },
  });

  return NextResponse.json(user, { status: 201 });
}
