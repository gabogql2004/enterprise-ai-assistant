import { prisma } from "@/lib/prisma";

// Límites de ejemplo para el plan gratuito — el plan "pro" no tiene tope.
// No son límites "reales" de negocio, son un placeholder razonable para
// demostrar el flujo de upgrade con Stripe.
export const LIMITES_PLAN_FREE = {
  documentos: 5,
  mensajesPorMes: 50,
};

export async function excedeLimiteDocumentos(organizationId: string, plan: string): Promise<boolean> {
  if (plan !== "free") return false;
  const cantidad = await prisma.document.count({ where: { organizationId } });
  return cantidad >= LIMITES_PLAN_FREE.documentos;
}

export async function excedeLimiteMensajes(organizationId: string, plan: string): Promise<boolean> {
  if (plan !== "free") return false;

  const inicioDeMes = new Date();
  inicioDeMes.setDate(1);
  inicioDeMes.setHours(0, 0, 0, 0);

  const cantidad = await prisma.message.count({
    where: {
      rol: "user",
      createdAt: { gte: inicioDeMes },
      conversation: { organizationId },
    },
  });
  return cantidad >= LIMITES_PLAN_FREE.mensajesPorMes;
}
