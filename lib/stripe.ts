import Stripe from "stripe";

// Instanciar el cliente al cargar el módulo rompe el build cuando
// STRIPE_SECRET_KEY todavía no está configurada (la SDK valida la key en
// el constructor). Se crea perezosamente, en el primer uso real.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  }
  return _stripe;
}
