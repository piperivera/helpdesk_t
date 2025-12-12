import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import bcrypt from "bcrypt";



// GET /api/profile -> datos del usuario logueado
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      area: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  return NextResponse.json(user);
}

// PATCH /api/profile -> actualizar nombre / área / contraseña
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const body = await req.json();
  const {
    name,
    area,
    changePassword,
    currentPassword,
    newPassword,
  } = body as {
    name?: string;
    area?: string | null;
    changePassword?: boolean;
    currentPassword?: string;
    newPassword?: string;
  };

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const dataToUpdate: any = {};

  // actualizar nombre / área
  if (typeof name !== "undefined") {
    dataToUpdate.name = name;
  }
  if (typeof area !== "undefined") {
    dataToUpdate.area = area || null;
  }

  // cambio de contraseña opcional
  if (changePassword) {
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Debes enviar contraseña actual y nueva" },
        { status: 400 }
      );
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "La contraseña actual no es correcta" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    dataToUpdate.passwordHash = newHash;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: dataToUpdate,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      area: true,
      createdAt: true,
    },
  });

  return NextResponse.json(updated);
}
// DELETE /api/profile -> desactivar/eliminar cuenta del usuario actual
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    // Si quieres borrado lógico:
    // await prisma.user.update({
    //   where: { id: userId },
    //   data: { isActive: false },
    // });

    // Si prefieres eliminar el registro:
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ message: "Cuenta eliminada" });
  } catch (err) {
    console.error("Error al eliminar cuenta:", err);
    return NextResponse.json(
      { error: "Error al eliminar la cuenta" },
      { status: 500 }
    );
  }
}
