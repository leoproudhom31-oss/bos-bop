import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { readCart, clearCartCookieHeader } from "@/lib/cart";
import { resolveCart, cartTotalCents } from "@/lib/shop";
import { isShopEnabled } from "@/lib/settings";

export const dynamic = "force-dynamic";

function makeReference(): string {
  const now = new Date();
  const stamp = now.toISOString().slice(2, 10).replaceAll("-", "");
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BOS-${stamp}-${random}`;
}

// Enregistre la commande. Le paiement en ligne (Stripe, PayPal...) pourra se
// brancher ici : créer la session de paiement avant de confirmer la commande.
export async function POST(request: NextRequest) {
  if (!(await isShopEnabled())) {
    return Response.redirect(new URL("/", request.url), 303);
  }
  const form = await request.formData();
  const field = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value.trim().slice(0, 2000) : "";
  };

  const customerName = field("customerName");
  const email = field("email");
  const address = field("address");

  if (!customerName || !email || !address) {
    const url = new URL("/commande", request.url);
    url.searchParams.set("erreur", "Merci de renseigner votre nom, votre email et votre adresse.");
    return Response.redirect(url, 303);
  }

  const lines = await resolveCart(readCart(request));
  if (lines.length === 0) {
    return Response.redirect(new URL("/panier", request.url), 303);
  }

  const order = await prisma.order.create({
    data: {
      reference: makeReference(),
      customerName,
      email,
      phone: field("phone"),
      address,
      note: field("note"),
      totalCents: cartTotalCents(lines),
      items: {
        create: lines.map((line) => ({
          productId: line.product.id,
          titleSnapshot: line.product.title,
          unitCents: line.product.priceCents,
          quantity: line.quantity,
        })),
      },
    },
  });

  // Décrémente les stocks (sans passer en négatif)
  for (const line of lines) {
    await prisma.product.update({
      where: { id: line.product.id },
      data: { stock: Math.max(0, line.product.stock - line.quantity) },
    });
  }

  const url = new URL("/commande/confirmation", request.url);
  url.searchParams.set("ref", order.reference);
  return new Response(null, {
    status: 303,
    headers: {
      Location: url.toString(),
      "Set-Cookie": clearCartCookieHeader(),
    },
  });
}
