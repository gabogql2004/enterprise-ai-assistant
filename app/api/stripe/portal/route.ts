import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "No autenticado.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  if (session.user.rol !== "admin") {
    return NextResponse.json(
      { error: "Solo un administrador puede gestionar la suscripción.", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: session.user.organizationId },
  });

  if (!organization.stripeCustomerId) {
    return NextResponse.json(
      { error: "Esta organización todavía no tiene una suscripción.", code: "NO_SUBSCRIPTION" },
      { status: 400 },
    );
  }

  const origin = new URL(request.url).origin;
  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: organization.stripeCustomerId,
    return_url: `${origin}/billing`,
  });

  return NextResponse.json({ data: { url: portalSession.url } });
}
