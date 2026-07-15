/**
 * Le formulaire de contact d'origine bloque sa propre soumission tant que le
 * reCAPTCHA invisible de Google n'a pas répondu (voir assets/js/…_form.js :
 * `if (!invisible_recaptcha[0].invisibleRecaptchaVerified) { event.preventDefault();
 * grecaptcha.execute(...); return false; }`). En pratique le callback
 * n'arrivait jamais — domaine non enregistré pour la clé de site, script
 * Google inaccessible, etc. — perdant le message de l'internaute SANS AUCUNE
 * ERREUR VISIBLE. La protection anti-spam ne repose plus sur ce widget tiers :
 * on neutralise donc simplement la condition qu'il vérifie, sans toucher au
 * balisage d'origine (le badge reste affiché, il ne fait juste plus rien), et
 * on la remplace par un champ piège (honeypot) + une limite de fréquence côté
 * serveur (voir src/app/api/contact/route.ts) qui ne dépendent d'aucun
 * service tiers.
 *
 * Le formulaire est soumis via `$(formname).submit()` (jQuery), qui n'invoque
 * pas forcément les écouteurs natifs (`addEventListener`) : intercepter
 * l'évènement "submit" n'est donc pas fiable ici. On marque à la place le
 * widget comme déjà vérifié dès le chargement de la page, une bonne fois pour
 * toutes — la condition ci-dessus est alors toujours vraie.
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

  function neutralizeRecaptcha() {
    document.querySelectorAll(".g-invisible-recaptcha").forEach(function (widget) {
      widget.invisibleRecaptchaVerified = true;
    });
  }

  function init() {
    document.querySelectorAll('form[action="/api/contact"]').forEach(addHoneypot);
    neutralizeRecaptcha();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Filet de sécurité : si une tentative précédente a échoué, le template
  // peut supprimer le marqueur pour permettre une nouvelle tentative
  // (`delete …invisibleRecaptchaVerified`) — on le repose alors avant la
  // prochaine soumission plutôt que d'attendre un nouveau chargement de page.
  document.addEventListener("click", neutralizeRecaptcha, true);
})();
