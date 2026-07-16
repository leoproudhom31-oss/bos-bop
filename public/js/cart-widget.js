/**
 * Pastille « Mon panier » de l'en-tête (boutique).
 *
 * Injectée UNIQUEMENT quand la boutique est activée (voir renderDocument dans
 * src/lib/render.ts) : boutique désactivée, ce fichier n'est pas chargé et le
 * site reste strictement identique à l'original.
 *
 * Le compteur lit le cookie du panier (bosbop_panier, JSON {id: quantité},
 * non HttpOnly — il ne contient rien de sensible) : il est donc toujours à
 * jour à chaque affichage de page, y compris au retour arrière du navigateur
 * (évènement pageshow, pages servies depuis le cache de navigation).
 */
(function () {
  "use strict";

  var CART_ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px">' +
    '<path d="M3 4h2.2l2.4 11.2a1.6 1.6 0 0 0 1.57 1.3h7.9a1.6 1.6 0 0 0 1.56-1.22L20.5 8H6.1"/>' +
    '<circle cx="10" cy="20" r="1.4"/><circle cx="17.5" cy="20" r="1.4"/></svg>';

  var CSS =
    // Encadré « téléphone + panier » de l'en-tête : le numéro reste tel quel
    // (icône dorée), et le panier devient un vrai bouton — pastille marine
    // aux accents dorés, étirée sur la largeur de l'encadré — plutôt qu'une
    // simple ligne de texte : l'intégration paraît voulue, pas rapportée.
    // Hauteur volontairement compacte (l'espace vertical de l'en-tête est
    // compté : un panneau plus haut déborderait sur la barre de navigation).
    ".bd-joomlaposition-32 .custom{display:inline-flex;flex-direction:column;" +
    "align-items:stretch;line-height:1.25;}" +
    ".bd-joomlaposition-32 .custom>div{display:flex;align-items:center;gap:9px;" +
    "white-space:nowrap;font-size:16px;font-weight:600;}" +
    ".bd-joomlaposition-32 .custom>div a{color:inherit;text-decoration:none;}" +
    ".bd-joomlaposition-32 .custom>div a:hover{text-decoration:underline;}" +
    ".bd-joomlaposition-32 .custom>div .icon-phone{color:#ddc076;}" +

    "#bd-cart-widget{display:flex;align-items:center;justify-content:center;gap:8px;" +
    "margin-top:7px;padding:6px 14px;border-radius:18px;background:#102f40;color:#fff;" +
    "text-decoration:none;font-size:14px;font-weight:600;white-space:nowrap;cursor:pointer;" +
    "transition:background .15s ease;}" +
    "#bd-cart-widget:hover{background:#1d4a63;}" +
    "#bd-cart-widget .bd-cart-icon{color:#ddc076;display:inline-flex;}" +
    "#bd-cart-widget .bd-cart-badge{display:none;min-width:20px;height:20px;border-radius:10px;" +
    "background:#ddc076;color:#102f40;font-size:12px;line-height:20px;text-align:center;" +
    "padding:0 6px;font-weight:700;margin-left:1px;}" +

    // Repli (gabarit inattendu, encadré téléphone absent) : pastille flottante
    // autonome, sans dépendre du panneau parent.
    "#bd-cart-widget.bd-cart-floating{position:fixed;right:16px;bottom:16px;z-index:9998;" +
    "margin:0;padding:11px 18px;border-radius:24px;" +
    "box-shadow:0 4px 14px rgba(0,0,0,.3);}";

  function cartCount() {
    var match = document.cookie.match(/(?:^|;\s*)bosbop_panier=([^;]*)/);
    if (!match) return 0;
    try {
      var data = JSON.parse(decodeURIComponent(match[1]));
      var total = 0;
      for (var id in data) total += Math.max(0, Math.floor(Number(data[id])) || 0);
      return total;
    } catch (e) {
      return 0;
    }
  }

  function ensureWidget() {
    var widget = document.getElementById("bd-cart-widget");
    if (!widget) {
      var style = document.createElement("style");
      style.textContent = CSS;
      document.head.appendChild(style);

      widget = document.createElement("a");
      widget.id = "bd-cart-widget";
      widget.href = "/panier";
      widget.title = "Voir mon panier";
      widget.innerHTML =
        '<span class="bd-cart-icon">' + CART_ICON + "</span>" +
        '<span class="bd-cart-label">Mon panier</span>' +
        '<span class="bd-cart-badge" aria-label="articles dans le panier"></span>';

      // Emplacement privilégié : la boîte téléphone en haut à droite de
      // l'en-tête. À défaut (gabarit inattendu), pastille flottante.
      var host = document.querySelector(".bd-joomlaposition-32 .custom");
      if (host) {
        host.appendChild(widget);
      } else {
        widget.className = "bd-cart-floating";
        document.body.appendChild(widget);
      }
    }
    return widget;
  }

  function refresh() {
    var widget = ensureWidget();
    var badge = widget.querySelector(".bd-cart-badge");
    var count = cartCount();
    badge.textContent = String(count);
    badge.style.display = count > 0 ? "inline-block" : "none";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refresh);
  } else {
    refresh();
  }
  window.addEventListener("pageshow", refresh);
})();
