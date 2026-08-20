import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { responderChat } from "@/lib/claudeService";
import { buscarChunksSimilares, generarEmbeddings } from "@/lib/vectorStore";

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
    // Se busca SIEMPRE filtrando por organizationId Y userId de la sesión:
    // nunca se confía en que el conversationId enviado por el cliente
    // pertenezca a la organización o al usuario correctos. Cada usuario
    // solo puede continuar sus propias conversaciones.
    conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId: session.user.organizationId,
        userId: session.user.id,
      },
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

  // RAG: se busca contexto relevante para la pregunta actual y se "aumenta"
  // solo el último turno (user) antes de mandarlo a Claude. Lo que queda
  // guardado en la DB (arriba) es la pregunta original, sin el contexto
  // inyectado — así el historial se mantiene legible en la UI.
  let mensajesParaClaude = historial.map((m) => ({
    rol: m.rol as "user" | "assistant",
    contenido: m.contenido,
  }));

  try {
    const [embeddingConsulta] = await generarEmbeddings([mensaje], "query");
    const chunks = await buscarChunksSimilares(session.user.organizationId, embeddingConsulta, 5);

    if (chunks.length > 0) {
      const contexto = chunks
        .map((c) => `[${c.nombreArchivo}]\n${c.contenido}`)
        .join("\n\n---\n\n");

      const promptAumentado =
        `Responde la siguiente pregunta basándote ÚNICAMENTE en el contexto ` +
        `proporcionado. Si la respuesta no está en el contexto, indica que ` +
        `no tienes esa información.\n\n` +
        `Contexto:\n${contexto}\n\n` +
        `Pregunta: ${mensaje}`;

      mensajesParaClaude = [
        ...mensajesParaClaude.slice(0, -1),
        { rol: "user", contenido: promptAumentado },
      ];
    }
  } catch {
    // Si falla la búsqueda RAG (ej. Voyage caído), se sigue con la pregunta
    // tal cual — mejor una respuesta sin contexto que un chat roto.
  }

  let respuesta: string;
  try {
    respuesta = await responderChat(mensajesParaClaude);
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
