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
    "#bd-cart-widget{display:inline-flex;align-items:center;gap:7px;margin-top:8px;" +
    "color:inherit;text-decoration:none;font-weight:600;white-space:nowrap;cursor:pointer;}" +
    "#bd-cart-widget:hover .bd-cart-label{text-decoration:underline;}" +
    "#bd-cart-widget .bd-cart-badge{display:none;min-width:19px;height:19px;border-radius:10px;" +
    "background:#ddc076;color:#102f40;font-size:12px;line-height:19px;text-align:center;" +
    "padding:0 5px;font-weight:700;}" +
    "#bd-cart-widget.bd-cart-floating{position:fixed;right:16px;bottom:16px;z-index:9998;" +
    "margin:0;background:#102f40;color:#fff;border-radius:24px;padding:11px 18px;" +
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
        CART_ICON +
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
