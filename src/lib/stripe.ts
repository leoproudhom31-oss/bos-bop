import Stripe from "stripe";

/**
 * Client Stripe. Clé secrète et secret de webhook lus depuis l'environnement
 * (jamais depuis la base de données) — même logique que SESSION_SECRET : ce
 * sont des identifiants sensibles, pas un réglage de contenu du site.
 *
 * Tant que STRIPE_SECRET_KEY n'est pas renseignée, la boutique reste
 * pleinement fonctionnelle : le paiement en ligne bascule automatiquement
 * sur le circuit « commande enregistrée, réglage organisé manuellement »
 * (voir src/app/api/checkout/route.ts).
 */

let client: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getStripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY n'est pas configurée.");
  }
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return client;
}

export function isStripeWebhookConfigured(): boolean {
  return !!process.env.STRIPE_WEBHOOK_SECRET;
}
