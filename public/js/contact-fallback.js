/**
 * Champ piège (honeypot) du formulaire de contact.
 *
 * Le reCAPTCHA INVISIBLE d'origine (widget tiers du template) est désormais
 * retiré du HTML côté serveur (voir src/lib/recaptcha.ts) : le formulaire
 * d'origine bloquait sa propre soumission tant que ce widget cassé n'avait pas
 * répondu, perdant le message SANS AUCUNE ERREUR VISIBLE. Il n'y a donc plus
 * rien à neutraliser ici. La protection anti-spam repose sur :
 *   - ce champ piège, invisible pour un humain mais souvent rempli aveuglément
 *     par les robots (rejeté côté serveur, voir src/app/api/contact/route.ts) ;
 *   - une limite de fréquence par IP (idem) ;
 *   - éventuellement une case reCAPTCHA v2, si des clés sont configurées dans
 *     l'administration (injectée côté serveur, indépendante de ce script).
 *
 * Injecté en fin de document (SAFETY_SCRIPTS dans render.ts) : n'affecte jamais
 * le HTML vérifié à l'octet par extract-legacy.mjs.
 */
(function () {
  "use strict";

  var HONEYPOT_NAME = "bd_site_web";

  function addHoneypot(form) {
    if (form.querySelector('[name="' + HONEYPOT_NAME + '"]')) return;
    var field = document.createElement("input");
    field.type = "text";
    field.name = HONEYPOT_NAME;
    field.autocomplete = "off";
    field.tabIndex = -1;
    field.setAttribute("aria-hidden", "true");
    // Invisible pour un humain (et ignoré des lecteurs d'écran), mais présent
    // dans le DOM comme n'importe quel champ : les robots qui remplissent
    // aveuglément tous les champs le renseignent, un visiteur ne le voit jamais.
    field.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;";
    form.appendChild(field);
  }

  function init() {
    document.querySelectorAll('form[action="/api/contact"]').forEach(addHoneypot);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
