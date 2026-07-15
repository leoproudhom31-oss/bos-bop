import { NextRequest } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripeClient, isStripeWebhookConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// Confirmation de paiement Stripe. Doit lire le corps BRUT de la requête
// (pas de parsing JSON) : la vérification de signature Stripe porte sur les
// octets exacts envoyés, un corps reconstruit après parsing échouerait.
export async function POST(request: NextRequest) {
  if (!isStripeWebhookConfigured()) {
    return Response.json({ error: "Webhook Stripe non configuré (STRIPE_WEBHOOK_SECRET)." }, { status: 501 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Signature manquante" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (error) {
    console.error("Signature Stripe invalide :", error);
    return Response.json({ error: "Signature invalide" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = Number(session.metadata?.orderId);
    if (orderId) await markOrderPaid(orderId);
  }

  if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = Number(session.metadata?.orderId);
    if (orderId) {
      await prisma.order.updateMany({
        where: { id: orderId, paymentStatus: "PENDING" },
        data: { paymentStatus: "FAILED" },
      });
    }
  }

  return Response.json({ received: true });
}

/** Idempotent : plusieurs livraisons du même évènement (Stripe réessaie en
 * cas de non-réponse) ne décrémentent le stock qu'une seule fois. */
async function markOrderPaid(orderId: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order || order.paymentStatus === "PAID") return;

  await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: "PAID", status: "CONFIRMED" },
  });

  for (const item of order.items) {
    if (!item.productId) continue;
    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } },
    }).catch(() => {
      // Produit supprimé depuis : rien à décrémenter.
    });
  }
}
