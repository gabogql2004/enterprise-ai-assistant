import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const client = new Anthropic();

const MODEL = "claude-sonnet-4-6";

export interface MensajeChat {
  rol: "user" | "assistant";
  contenido: string;
}

// El último mensaje de `historial` puede venir ya "aumentado" con el
// contexto de documentos recuperado por RAG (ver app/api/chat/route.ts);
// los turnos anteriores se envían tal como se guardaron.
export async function responderChat(historial: MensajeChat[]): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system:
      "Eres el asistente interno de una empresa. Responde preguntas de los " +
      "empleados basándote en el contexto de documentos que se te da en " +
      "cada mensaje. Si la información no está en el contexto, dilo " +
      "claramente en vez de inventar una respuesta.",
    messages: historial.map((m) => ({ role: m.rol, content: m.contenido })),
  });

  const bloqueTexto = response.content.find((b) => b.type === "text");
  return bloqueTexto?.text ?? "";
}

const SentimientoSchema = z.object({
  sentimiento: z.enum(["positivo", "negativo", "neutral"]),
  temas: z.array(z.string()),
  resumen: z.string(),
});

export type ResultadoSentimiento = z.infer<typeof SentimientoSchema>;

// output_config.format fuerza la salida a validar contra el schema — más
// confiable que pedir JSON en el prompt y parsear a mano.
export async function analizarSentimiento(texto: string): Promise<ResultadoSentimiento> {
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Analiza el sentimiento del siguiente feedback de cliente:\n\n${texto}`,
      },
    ],
    output_config: {
      format: zodOutputFormat(SentimientoSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("Claude no devolvió una salida estructurada válida.");
  }

  return response.parsed_output;
}
