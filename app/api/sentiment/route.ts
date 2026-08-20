import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analizarSentimiento } from "@/lib/claudeService";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "No autenticado.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const body = await request.json();
  const { texto } = body ?? {};

  if (!texto || typeof texto !== "string") {
    return NextResponse.json(
      { error: "El texto no puede estar vacío.", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  let resultado;
  try {
    resultado = await analizarSentimiento(texto);
  } catch {
    return NextResponse.json(
      { error: "No se pudo analizar el sentimiento.", code: "CLAUDE_API_ERROR" },
      { status: 502 },
    );
  }

  const analisis = await prisma.sentimentAnalysis.create({
    data: {
      organizationId: session.user.organizationId,
      textoOriginal: texto,
      sentimiento: resultado.sentimiento,
      temas: resultado.temas,
    },
  });

  return NextResponse.json(
    {
      data: {
        id: analisis.id,
        sentimiento: analisis.sentimiento,
        temas: analisis.temas,
        resumen: resultado.resumen,
      },
    },
    { status: 201 },
  );
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "No autenticado.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const analisis = await prisma.sentimentAnalysis.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: analisis });
}
