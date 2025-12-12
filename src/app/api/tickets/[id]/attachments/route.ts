import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/options";
import fs from "fs/promises";
import path from "path";



type RouteParams = { id: string };

// POST /api/tickets/:id/attachments
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<RouteParams> }    // 👈 Promise aquí
) {
  const { id } = await params;

  if (!id || id === "undefined") {
    return NextResponse.json({ error: "Id de ticket inválido" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { error: "No se recibió archivo" },
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const fileName = `${Date.now()}_${safeName}`;
  const filePath = path.join(uploadDir, fileName);

  await fs.writeFile(filePath, buffer);

  const url = `/uploads/${fileName}`;

  const attachment = await prisma.ticketAttachment.create({
    data: {
      ticketId: id,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileSize: buffer.length,
      url,
    },
  });

  return NextResponse.json(attachment);
}
