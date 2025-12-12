import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import bcrypt from "bcrypt";



// PATCH /api/users/:id -> editar, activar/desactivar, reset pass
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // 👈 aquí se resuelve el Promise

  if (!id) {
    return NextResponse.json(
      { error: "Id de usuario inválido" },
      { status: 400 }
    );
  }

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json(
      { error: "Solo admin puede modificar usuarios" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));

  const {
    name,
    area,
    role,
    isActive,
    resetPassword,
    newPassword,
  } = body as {
    name?: string;
    area?: string | null;
    role?: "requester" | "resolver" | "admin";
    isActive?: boolean;
    resetPassword?: boolean;
    newPassword?: string;
  };

  const dataToUpdate: any = {};

  if (typeof name !== "undefined") dataToUpdate.name = name;
  if (typeof area !== "undefined") dataToUpdate.area = area || null;
  if (typeof role !== "undefined") dataToUpdate.role = role;
  if (typeof isActive !== "undefined") dataToUpdate.isActive = isActive;

  if (resetPassword) {
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }
    const hash = await bcrypt.hash(newPassword, 10);
    dataToUpdate.passwordHash = hash;
  }

  if (Object.keys(dataToUpdate).length === 0) {
    return NextResponse.json(
      { error: "No hay cambios para aplicar" },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        area: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Error al actualizar usuario:", err);
    return NextResponse.json(
      { error: "Error al actualizar usuario" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/:id -> eliminar usuario (solo admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // 👈 igual aquí

  if (!id) {
    return NextResponse.json(
      { error: "Id de usuario inválido" },
      { status: 400 }
    );
  }

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json(
      { error: "Solo admin puede eliminar usuarios" },
      { status: 403 }
    );
  }

  const loggedId = (session.user as any).id;
  if (id === loggedId) {
    return NextResponse.json(
      { error: "No puedes eliminar tu propio usuario" },
      { status: 400 }
    );
  }

  try {
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error al eliminar usuario:", err);
    return NextResponse.json(
      { error: "Error al eliminar usuario" },
      { status: 500 }
    );
  }
}
