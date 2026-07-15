// Aides HTTP partagées par les routes.

/**
 * Redirection 303 « voir autre chose » vers un chemin RELATIF du site.
 *
 * Toujours préférer ceci à `Response.redirect(new URL(path, request.url))` :
 * derrière un reverse proxy (Nginx + pm2…), `request.url` reflète l'adresse
 * INTERNE du serveur Next.js (http://localhost:3000/…) et non le domaine
 * public — le visiteur se retrouvait alors redirigé vers localhost après un
 * ajout au panier ou l'envoi du formulaire de contact. Une Location relative
 * (autorisée par la RFC 7231, comprise par tous les navigateurs) reste sur
 * le domaine que le visiteur utilise déjà, quel que soit le proxy.
 */
export function seeOther(path: string, extraHeaders: Record<string, string> = {}): Response {
  return new Response(null, {
    status: 303,
    headers: { Location: path, ...extraHeaders },
  });
}
