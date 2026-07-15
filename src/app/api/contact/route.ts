import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { formString } from "@/lib/forms";
import { isRateLimited, clientIp } from "@/lib/rate-limit";
import { seeOther } from "@/lib/http";

export const dynamic = "force-dynamic";

// Nom du champ piège (honeypot) injecté par public/js/contact-fallback.js :
// invisible pour un humain, souvent rempli aveuglément par les robots de spam.
const HONEYPOT_FIELD = "bd_site_web";

// Réception du formulaire de contact (balisage Joomla "Uniform" conservé à
// l'identique : les noms de champs numériques viennent du site d'origine).
//
// Anti-spam : ni reCAPTCHA (widget tiers du template, non fiable — voir
// contact-fallback.js) ni vérification côté serveur associée. La protection
// repose ici sur un champ piège et une limite de fréquence par IP, sans
// dépendance à un service externe.
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const field = (name: string) => formString(form, name, 2000);

  const isBot = field(HONEYPOT_FIELD) !== "";
  const limited = isRateLimited(`contact:${clientIp(request)}`, 5, 10 * 60 * 1000);

  if (!isBot && !limited) {
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
  }
  // Robot détecté ou limite atteinte : on ne l'indique pas au client (même
  // redirection de succès) pour ne donner aucun indice exploitable.

  // Retour sur la page d'origine avec le message de confirmation. Seul le
  // CHEMIN du referer est repris (jamais son hôte) et la redirection est
  // relative : on reste toujours sur le domaine que le visiteur utilise,
  // même derrière un reverse proxy (voir seeOther dans src/lib/http.ts).
  const referer = request.headers.get("referer");
  let path = "/contact-orientation-scolaire-professionnel-toulouse";
  if (referer) {
    try {
      path = new URL(referer).pathname;
    } catch {
      // referer invalide : on garde la page de contact par défaut
    }
  }
  return seeOther(`${path}?sent=1`);
}
