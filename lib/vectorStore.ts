import { VoyageAIClient } from "voyageai";
import { prisma } from "@/lib/prisma";

const voyage = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY });
const MODELO_EMBEDDING = "voyage-3-lite"; // 512 dimensiones, ver prisma/schema.prisma

// Voyage distingue "document" (texto que se indexa) de "query" (la pregunta
// del usuario) — usar el tipo correcto mejora la calidad de la búsqueda.
export async function generarEmbeddings(
  textos: string[],
  tipo: "document" | "query",
): Promise<number[][]> {
  const respuesta = await voyage.embed({
    input: textos,
    model: MODELO_EMBEDDING,
    inputType: tipo,
  });

  return (respuesta.data ?? []).map((item) => item.embedding ?? []);
}

export interface ChunkSimilar {
  id: string;
  documentId: string;
  contenido: string;
  nombreArchivo: string;
  similitud: number;
}

// Búsqueda por similitud coseno vía el operador <=> de pgvector. Se filtra
// SIEMPRE por organizationId (a través del JOIN con Document) para no
// devolver nunca chunks de otra organización.
export async function buscarChunksSimilares(
  organizationId: string,
  embeddingConsulta: number[],
  limite = 5,
): Promise<ChunkSimilar[]> {
  const vectorLiteral = `[${embeddingConsulta.join(",")}]`;

  return prisma.$queryRaw<ChunkSimilar[]>`
    SELECT
      dc.id,
      dc."documentId",
      dc.contenido,
      d."nombreArchivo",
      1 - (dc.embedding <=> ${vectorLiteral}::vector) AS similitud
    FROM "DocumentChunk" dc
    JOIN "Document" d ON d.id = dc."documentId"
    WHERE d."organizationId" = ${organizationId}
      AND dc.embedding IS NOT NULL
    ORDER BY dc.embedding <=> ${vectorLiteral}::vector
    LIMIT ${limite}
  `;
}
