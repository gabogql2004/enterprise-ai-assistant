import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "No autenticado.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { id } = await params;

  // organizationId Y userId deben coincidir con la sesión: nunca se confía
  // en el id de la URL para decidir qué conversación devolver.
  const conversation = await prisma.conversation.findFirst({
    where: { id, organizationId: session.user.organizationId, userId: session.user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversación no encontrada.", code: "CONVERSATION_NOT_FOUND" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: {
      id: conversation.id,
      titulo: conversation.titulo,
      messages: conversation.messages.map((m) => ({ rol: m.rol, contenido: m.contenido })),
    },
  });
}
