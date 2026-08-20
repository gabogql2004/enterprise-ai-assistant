import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

// Solo un admin puede iniciar la suscripción de la organización.
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
  const stripe = getStripe();

  // Un Customer de Stripe se crea una sola vez por organización y se
  // reutiliza en checkouts/portal posteriores.
  let stripeCustomerId = organization.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: session.user.email ?? undefined,
      name: organization.nombre,
      metadata: { organizationId: organization.id },
    });
    stripeCustomerId = customer.id;
    await prisma.organization.update({
      where: { id: organization.id },
      data: { stripeCustomerId },
    });
  }

  const origin = new URL(request.url).origin;
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID_PRO, quantity: 1 }],
    success_url: `${origin}/billing?checkout=success`,
    cancel_url: `${origin}/billing?checkout=cancelled`,
    metadata: { organizationId: organization.id },
  });

  return NextResponse.json({ data: { url: checkoutSession.url } });
}
