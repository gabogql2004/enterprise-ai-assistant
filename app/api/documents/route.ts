import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extraerTexto, FormatoNoSoportadoError } from "@/lib/documentExtraction";

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

  // El chunking real (división en ~500 tokens + embeddings) llega en Fase 2.
  // Por ahora se guarda un único chunk con el texto completo para que el
  // documento ya quede disponible en la biblioteca.
  const document = await prisma.document.create({
    data: {
      organizationId: session.user.organizationId,
      nombreArchivo: file.name,
      estado: "procesado",
      uploadedBy: session.user.id,
      chunks: {
        create: {
          contenido: texto,
          chunkIndex: 0,
        },
      },
    },
  });

  return NextResponse.json({ data: { id: document.id, estado: document.estado } }, { status: 201 });
}
