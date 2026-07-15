import { escapeHtml } from "./shell.mjs";

/**
 * Personnalisation des « widgets » du gabarit (téléphone, Facebook,
 * LinkedIn) avec les réglages de l'administration — voir /admin/widgets.
 *
 * Sans réglage renseigné, le HTML reste rigoureusement identique à celui du
 * site d'origine (même logique que applyHeroCustomization dans render.ts).
 * Appliqué en post-traitement sur le document assemblé (gabarit + page),
 * après renderShell() : n'affecte donc jamais le HTML vérifié à l'octet par
 * extract-legacy.mjs (qui appelle renderShell directement, sans passer par
 * cette fonction).
 */

export type WidgetSettings = {
  phone: string; // ex. "06.48.69.20.36"
  facebookUrl: string;
  linkedinUrl: string;
};

// Valeurs d'origine du site, telles qu'elles apparaissent dans templates/ —
// un réglage vide restaure exactement le comportement d'origine.
const ORIGINAL_PHONE_DISPLAY = "06.48.69.20.36";
const ORIGINAL_TEL_HREF = "tel:+336648692036";
const ORIGINAL_LINKEDIN_URL =
  "https://www.linkedin.com/in/val%C3%A9rie-calvet-846483a/?originalSubdomain=fr";

/** "06 48 69 20 36" / "0648692036" -> "tel:+33648692036". Repli sur la valeur
 * d'origine si le numéro saisi ne ressemble pas à un numéro français valide. */
function toTelHref(phoneDisplay: string): string {
  const digits = phoneDisplay.replace(/[^\d+]/g, "");
  if (/^0\d{9}$/.test(digits)) return `tel:+33${digits.slice(1)}`;
  if (/^\+\d{6,15}$/.test(digits)) return `tel:${digits}`;
  return ORIGINAL_TEL_HREF;
}

const PHONE_RE = new RegExp(
  `href="${ORIGINAL_TEL_HREF.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">${ORIGINAL_PHONE_DISPLAY.replace(/\./g, "\\.")}<`,
  "g",
);

// Le widget Facebook d'origine (plugin JS officiel) dépend du chargement du
// SDK Facebook au moment de la requête : en pratique souvent en échec
// (bloqueur de contenu, réseau, domaine non whitelisté…), affichant une icône
// « image cassée » à la place de la carte de page. Remplacé par un lien
// simple et robuste — aucune dépendance à un service tiers, ne peut plus se
// casser silencieusement. Ne capture que le widget lui-même (deux </div> :
// le sien puis celui du wrapper .custom qui, lui, reste en place).
const FACEBOOK_WIDGET_RE = /<div class="fb-page fb_iframe_widget"[\s\S]*?<\/iframe><\/span><\/div>/;

const LINKEDIN_URL_RE = new RegExp(ORIGINAL_LINKEDIN_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

function facebookButtonHtml(url: string): string {
  const href = escapeHtml(url);
  // Enveloppé dans un conteneur centré : le bouton (inline-flex, donc de
  // niveau ligne) se centre alors sous le titre « Rejoignez… sur Facebook »,
  // lui aussi centré dans le pied de page.
  return (
    `<div style="text-align:center;padding:6px 0;">` +
    `<a href="${href}" target="_blank" rel="noopener noreferrer" title="Suivre BOS &amp; BOP sur Facebook" ` +
    `style="display:inline-flex;align-items:center;gap:9px;color:#ddc076;text-decoration:none;` +
    `font-weight:600;border:1px solid #ddc076;border-radius:8px;padding:11px 20px;transition:background .15s,color .15s;">` +
    `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">` +
    `<path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.5 ` +
    `1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.9h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94z"/>` +
    `</svg><span>Suivre sur Facebook</span></a>` +
    `</div>`
  );
}

export function applyWidgetCustomization(html: string, widgets: WidgetSettings): string {
  let out = html;

  if (widgets.phone.trim()) {
    const display = escapeHtml(widgets.phone.trim());
    const href = toTelHref(widgets.phone.trim());
    out = out.replace(PHONE_RE, `href="${href}">${display}<`);
  }

  if (widgets.facebookUrl.trim()) {
    out = out.replace(FACEBOOK_WIDGET_RE, facebookButtonHtml(widgets.facebookUrl.trim()));
  }

  if (widgets.linkedinUrl.trim()) {
    out = out.replace(LINKEDIN_URL_RE, escapeHtml(widgets.linkedinUrl.trim()));
  }

  return out;
}
