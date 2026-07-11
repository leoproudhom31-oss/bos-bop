import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Réception du formulaire de contact (balisage Joomla "Uniform" conservé à
// l'identique : les noms de champs numériques viennent du site d'origine).
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const field = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value.trim().slice(0, 2000) : "";
  };

  const audience = field("4") === "Others" ? field("fieldOthers[4]") : field("4");
  const message = {
    civility: field("name[1][title]"),
    firstName: field("name[1][first]"),
    lastName: field("name[1][last]"),
    audience,
    phone: field("phone[3][default]"),
    email: field("2"),
    subject: field("5"),
    body: field("6"),
  };

  // Ne pas enregistrer les soumissions manifestement vides
  const hasContent = Object.values(message).some((v) => v !== "");
  if (hasContent) {
    await prisma.contactMessage.create({ data: message });
  }

  // Retour sur la page d'origine avec le message de confirmation
  const referer = request.headers.get("referer");
  let path = "/contact-orientation-scolaire-professionnel-toulouse";
  if (referer) {
    try {
      const url = new URL(referer);
      if (url.origin === request.nextUrl.origin) path = url.pathname;
    } catch {
      // referer invalide : on garde la page de contact par défaut
    }
  }
  return Response.redirect(new URL(`${path}?sent=1`, request.url), 303);
}
