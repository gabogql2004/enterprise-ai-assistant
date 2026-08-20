import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// Stripe requiere el body SIN parsear (raw) para poder verificar la firma
// con el header stripe-signature. En el App Router basta con leer el body
// como texto en vez de con request.json() — no hace falta config especial.
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Falta la firma de Stripe.", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET ?? "",
    );
  } catch {
    return NextResponse.json(
      { error: "Firma de webhook inválida.", code: "INVALID_SIGNATURE" },
      { status: 400 },
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const checkoutSession = event.data.object as Stripe.Checkout.Session;
      const organizationId = checkoutSession.metadata?.organizationId;
      const subscriptionId = checkoutSession.subscription;
      if (organizationId && typeof subscriptionId === "string") {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await sincronizarSuscripcion(organizationId, subscription);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const organization = await prisma.organization.findFirst({
        where: { stripeCustomerId: subscription.customer as string },
      });
      if (organization) {
        await sincronizarSuscripcion(organization.id, subscription);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ data: { received: true } });
}

async function sincronizarSuscripcion(organizationId: string, subscription: Stripe.Subscription) {
  // current_period_start/end vive en cada SubscriptionItem (no en la
  // Subscription) desde que Stripe permite ítems con distinto ciclo de
  // facturación dentro de una misma suscripción.
  const item = subscription.items.data[0];
  const periodoInicio = new Date(item.current_period_start * 1000);
  const periodoFin = new Date(item.current_period_end * 1000);
  const activa = subscription.status === "active" || subscription.status === "trialing";

  await prisma.subscription.upsert({
    where: { organizationId },
    create: {
      organizationId,
      stripeSubscriptionId: subscription.id,
      estado: subscription.status,
      plan: "pro",
      periodoInicio,
      periodoFin,
    },
    update: {
      stripeSubscriptionId: subscription.id,
      estado: subscription.status,
      periodoInicio,
      periodoFin,
    },
  });

  await prisma.organization.update({
    where: { id: organizationId },
    data: { plan: activa ? "pro" : "free" },
  });
}
