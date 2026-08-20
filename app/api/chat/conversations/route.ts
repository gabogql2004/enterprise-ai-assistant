import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Historial de conversaciones: cada usuario ve solo las suyas dentro de su
// organización (no las de sus compañeros) — filtro doble por userId y
// organizationId, ambos desde la sesión.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "No autenticado.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const conversaciones = await prisma.conversation.findMany({
    where: {
      organizationId: session.user.organizationId,
      userId: session.user.id,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, titulo: true, createdAt: true },
  });

  return NextResponse.json({ data: conversaciones });
}
