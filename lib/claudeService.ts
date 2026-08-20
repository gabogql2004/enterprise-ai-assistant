import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const MODEL = "claude-sonnet-4-6";

export interface MensajeChat {
  rol: "user" | "assistant";
  contenido: string;
}

// Fase 1: chat directo, sin contexto de documentos. El prompt de sistema
// se reemplaza en Fase 2 por uno que inyecta los chunks relevantes del RAG.
export async function responderChat(historial: MensajeChat[]): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system:
      "Eres el asistente interno de una empresa. Responde de forma clara y concisa.",
    messages: historial.map((m) => ({ role: m.rol, content: m.contenido })),
  });

  const bloqueTexto = response.content.find((b) => b.type === "text");
  return bloqueTexto?.text ?? "";
}
