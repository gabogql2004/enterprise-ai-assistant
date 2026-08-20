import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { responderChat } from "@/lib/claudeService";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "No autenticado.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const body = await request.json();
  const { conversationId, mensaje } = body ?? {};

  if (!mensaje || typeof mensaje !== "string") {
    return NextResponse.json(
      { error: "El mensaje no puede estar vacío.", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  let conversation;
  if (conversationId) {
    // Se busca SIEMPRE filtrando por organizationId de la sesión: nunca se
    // confía en que el conversationId enviado por el cliente pertenezca a
    // la organización correcta.
    conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, organizationId: session.user.organizationId },
    });
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversación no encontrada.", code: "CONVERSATION_NOT_FOUND" },
        { status: 404 },
      );
    }
  } else {
    conversation = await prisma.conversation.create({
      data: {
        organizationId: session.user.organizationId,
        userId: session.user.id,
        titulo: mensaje.slice(0, 60),
      },
    });
  }

  await prisma.message.create({
    data: { conversationId: conversation.id, rol: "user", contenido: mensaje },
  });

  const historial = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
  });

  let respuesta: string;
  try {
    respuesta = await responderChat(
      historial.map((m) => ({ rol: m.rol as "user" | "assistant", contenido: m.contenido })),
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudo obtener respuesta del asistente.", code: "CLAUDE_API_ERROR" },
      { status: 502 },
    );
  }

  await prisma.message.create({
    data: { conversationId: conversation.id, rol: "assistant", contenido: respuesta },
  });

  return NextResponse.json({
    data: { conversationId: conversation.id, mensaje: respuesta },
  });
}
