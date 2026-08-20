import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extraerTexto, FormatoNoSoportadoError } from "@/lib/documentExtraction";
import { dividirEnChunks } from "@/lib/chunking";
import { generarEmbeddings } from "@/lib/vectorStore";
import { excedeLimiteDocumentos } from "@/lib/planLimits";

const TIPOS_SOPORTADOS = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  const session = await auth();
  // organizationId y userId salen SIEMPRE de la sesión autenticada, nunca
  // del body de la request, para no exponer datos entre organizaciones.
  if (!session?.user) {
    return NextResponse.json(
      { error: "No autenticado.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  // viewer es de solo lectura: puede chatear y ver documentos, pero no
  // subir/modificar contenido.
  if (session.user.rol === "viewer") {
    return NextResponse.json(
      { error: "Tu rol no tiene permiso para subir documentos.", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: session.user.organizationId },
  });
  if (await excedeLimiteDocumentos(organization.id, organization.plan)) {
    return NextResponse.json(
      {
        error: "Alcanzaste el límite de documentos de tu plan. Actualiza a Pro para subir más.",
        code: "PLAN_LIMIT_REACHED",
      },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No se envió ningún archivo.", code: "INVALID_DOCUMENT_FORMAT" },
      { status: 400 },
    );
  }

  if (!TIPOS_SOPORTADOS.includes(file.type)) {
    return NextResponse.json(
      {
        error: "Formato no soportado. Solo se aceptan PDF y Word (.docx).",
        code: "INVALID_DOCUMENT_FORMAT",
      },
      { status: 400 },
    );
  }

  if (file.size > TAMANO_MAXIMO_BYTES) {
    return NextResponse.json(
      { error: "El archivo supera el límite de 10MB.", code: "DOCUMENT_TOO_LARGE" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let texto: string;
  try {
    texto = await extraerTexto(buffer, file.type);
  } catch (err) {
    if (err instanceof FormatoNoSoportadoError) {
      return NextResponse.json(
        { error: "Formato no soportado.", code: "INVALID_DOCUMENT_FORMAT" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        error: "No se pudo extraer el texto del documento.",
        code: "DOCUMENT_PROCESSING_FAILED",
      },
      { status: 422 },
    );
  }

  const textosChunks = dividirEnChunks(texto);
  if (textosChunks.length === 0) {
    return NextResponse.json(
      { error: "El documento no contiene texto extraíble.", code: "DOCUMENT_PROCESSING_FAILED" },
      { status: 422 },
    );
  }

  let embeddings: number[][];
  try {
    embeddings = await generarEmbeddings(textosChunks, "document");
  } catch {
    return NextResponse.json(
      { error: "No se pudieron generar los embeddings del documento.", code: "EMBEDDING_FAILED" },
      { status: 502 },
    );
  }

  const document = await prisma.document.create({
    data: {
      organizationId: session.user.organizationId,
      nombreArchivo: file.name,
      estado: "procesado",
      uploadedBy: session.user.id,
    },
  });

  // Unsupported("vector") no es escribible vía el Client de Prisma — el
  // insert de cada chunk (con su embedding) se hace con SQL crudo.
  for (let i = 0; i < textosChunks.length; i++) {
    const vectorLiteral = `[${embeddings[i].join(",")}]`;
    await prisma.$executeRaw`
      INSERT INTO "DocumentChunk" (id, "documentId", contenido, "chunkIndex", embedding)
      VALUES (${randomUUID()}, ${document.id}, ${textosChunks[i]}, ${i}, ${vectorLiteral}::vector)
    `;
  }

  return NextResponse.json(
    { data: { id: document.id, estado: document.estado, chunks: textosChunks.length } },
    { status: 201 },
  );
}
