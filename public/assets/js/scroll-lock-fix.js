/**
 * Filet de sécurité pour le menu mobile (offcanvas) du template d'origine.
 *
 * Le script du template verrouille le défilement de la page en posant
 * `position: fixed` sur <html> pendant que le menu mobile est ouvert
 * (fonctions disableScroll/enableScroll de assets/js/139f0c33e96c_script.js).
 * Le déverrouillage normal n'intervient qu'à la toute fin de l'animation de
 * fermeture (évènement Bootstrap "hidden.bs.collapse", ~700ms après le
 * clic) : jusque-là, le défilement reste figé, ce qui se perçoit comme un
 * bug si on essaie de faire défiler la page juste après avoir fermé le menu.
 *
 * Ce fichier ne modifie pas le script du template : il ajoute un
 * déverrouillage dès le tout DÉBUT de la fermeture (évènement
 * "hide.bs.collapse", déclenché immédiatement au clic), pour que le
 * défilement redevienne utilisable sans délai perceptible. Un filet de
 * secours plus lent (sans dépendance à jQuery) couvre en plus les cas où le
 * défilement resterait bloqué sans qu'aucune fermeture normale n'ait eu
 * lieu (navigation interrompue, erreur JS, etc.).
 */
(function () {
  "use strict";

  function unlockScroll() {
    var html = document.documentElement;
    if (html.style.position !== "fixed") return;
    var body = document.body;
    var top = body.style.top;
    html.style.position = "";
    html.style.overflowY = "";
    html.style.width = "";
    body.style.top = "";
    var y = top ? -parseInt(top, 10) || 0 : window.scrollY;
    window.scrollTo(window.scrollX, y);
  }

  function bindInstantUnlock($) {
    $(document).on("hide.bs.collapse", ".navbar-collapse.width", unlockScroll);
  }

  if (window.jQuery) {
    bindInstantUnlock(window.jQuery);
  } else {
    // jQuery peut ne pas être encore disponible selon l'ordre de chargement
    // des scripts sur certaines pages : quelques tentatives avant d'abandonner
    // (le filet de sécurité ci-dessous prend alors seul le relais).
    var tries = 0;
    var waitForJQuery = setInterval(function () {
      tries += 1;
      if (window.jQuery) {
        clearInterval(waitForJQuery);
        bindInstantUnlock(window.jQuery);
      } else if (tries > 40) {
        clearInterval(waitForJQuery);
      }
    }, 50);
  }

  // Filet de sécurité indépendant : couvre le cas où ni l'évènement du
  // template ni le hook jQuery ci-dessus n'auraient déverrouillé le
  // défilement. Volontairement peu fréquent et prudent (ignore l'état
  // "collapsing" pour ne jamais interrompre une animation d'ouverture).
  function menuVisuallyOpenOrOpening() {
    return !!document.querySelector(".navbar-collapse.in, .navbar-collapse.collapsing");
  }
  function safetyCheck() {
    if (document.documentElement.style.position === "fixed" && !menuVisuallyOpenOrOpening()) {
      unlockScroll();
    }
  }
  window.addEventListener("pageshow", safetyCheck);
  setInterval(safetyCheck, 1000);
})();
