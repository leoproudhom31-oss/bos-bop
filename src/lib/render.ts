import type { Page } from "@prisma/client";
import { prisma } from "./db";
import { getTemplates, getHeadTemplate } from "./templates";
import { getSetting, DEFAULT_SITE_URL } from "./settings";
// Module JavaScript partagé avec le script d'extraction/vérification
import { renderShell, escapeHtml } from "./shell.mjs";

export const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
} as const;

/** Suffixe commun des <title> du site d'origine. */
export const TITLE_SUFFIX =
  " - BOS & BOP - Orientation scolaire et professionnelle à Toulouse";

export const INNER_BODY_CLASS = "bootstrap bd-body-7 bd-pagebackground-104 bd-margins";

export type MenuEntry = {
  label: string;
  titleAttr: string;
  cssTag: string;
  url: string;
};

export async function getMenuEntries(): Promise<MenuEntry[]> {
  const items = await prisma.menuItem.findMany({
    orderBy: { position: "asc" },
    include: { page: true },
  });
  return items.map((item) => ({
    label: item.label,
    titleAttr: item.titleAttr,
    cssTag: item.cssTag || `item-${200 + item.id}`,
    url: item.page ? (item.page.slug === "" ? "/" : `/${item.page.slug}`) : item.url,
  }));
}

type ShellPage = {
  slug: string;
  title: string;
  metaDescription: string;
  metaKeywords: string;
  bodyClass: string;
  headHtml: string;
  contentHtml: string;
  extraTail: string;
  breadcrumbLabel: string;
  sharePath: string;
};

/** Assemble le document HTML complet d'une page (gabarit + contenu + menu). */
export async function renderDocument(page: ShellPage): Promise<string> {
  const menu = await getMenuEntries();
  const siteUrl = await getSetting("siteUrl", DEFAULT_SITE_URL);
  return renderShell(getTemplates(), page, menu, { siteUrl });
}

/** Rendu d'une page stockée en base. */
export async function renderPage(
  page: Page,
  options: { injectFormMessage?: string } = {},
): Promise<string> {
  let contentHtml = page.contentHtml;
  if (options.injectFormMessage) {
    contentHtml = contentHtml.replace(
      '<div class="message-uniform"> </div>',
      `<div class="message-uniform">${options.injectFormMessage}</div>`,
    );
  }
  return renderDocument({
    slug: page.slug,
    title: page.title,
    metaDescription: page.metaDescription,
    metaKeywords: page.metaKeywords,
    bodyClass: page.bodyClass,
    headHtml: page.headHtml || getHeadTemplate(),
    contentHtml,
    extraTail: page.extraTail,
    breadcrumbLabel: page.breadcrumbLabel,
    sharePath: page.sharePath || (page.slug === "" ? "/" : `/${page.slug}.html`),
  });
}

/**
 * Rendu d'une page "virtuelle" (boutique, 404…) : même habillage que le reste
 * du site, contenu généré par le code.
 */
export async function renderVirtualPage(options: {
  path: string; // ex. "livres" ou "panier"
  shortTitle: string;
  contentHtml: string;
  metaDescription?: string;
}): Promise<string> {
  return renderDocument({
    slug: options.path,
    title: options.shortTitle + TITLE_SUFFIX,
    metaDescription: options.metaDescription ?? "",
    metaKeywords: "",
    bodyClass: INNER_BODY_CLASS,
    headHtml: getHeadTemplate(),
    contentHtml: options.contentHtml,
    extraTail: "",
    breadcrumbLabel: options.shortTitle,
    sharePath: `/${options.path}`,
  });
}

/** Page 404 habillée comme le site. */
export async function renderNotFound(): Promise<Response> {
  const contentHtml = `
<section class="bd-section-17 bd-tagstyles" data-section-title="Section" id="section17">
<div class="bd-container-inner bd-margins clearfix">
<div class="bd-joomlaposition-22 clearfix">
<div class="bd-block-79 bd-own-margins">
<div class="bd-blockcontent bd-tagstyles">
<div class="custom">
<h2>Page non trouvée</h2>
<p>La page que vous cherchez n'existe pas ou a été déplacée.</p>
<p><a href="/" title="Retour à l'accueil"> <button>Retour à l'accueil</button> </a></p>
</div>
</div>
</div>
</div>
</div>
</section>
`;
  const html = await renderVirtualPage({
    path: "page-non-trouvee",
    shortTitle: "Page non trouvée",
    contentHtml,
  });
  return new Response(html, { status: 404, headers: HTML_HEADERS });
}

export { escapeHtml };
