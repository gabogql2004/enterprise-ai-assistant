import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LIMITES_PLAN_FREE } from "@/lib/planLimits";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "No autenticado.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: session.user.organizationId },
    include: { subscription: true },
  });

  return NextResponse.json({
    data: {
      plan: organization.plan,
      limites: organization.plan === "free" ? LIMITES_PLAN_FREE : null,
      subscription: organization.subscription
        ? {
            estado: organization.subscription.estado,
            periodoFin: organization.subscription.periodoFin,
          }
        : null,
    },
  });
}
