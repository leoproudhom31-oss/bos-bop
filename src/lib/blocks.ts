// Constructeur de pages « à la Wix ».
//
// Chaque bloc est compilé vers une « bande » (section) HTML autonome, en
// réutilisant les classes CSS du template d'origine (typographie, grille
// Bootstrap, cartes .bloc-x/.titre-bloc, boutons, bannière .bd-textblock-20).
// Les blocs s'empilent verticalement, comme des sections Wix.
//
// Le bloc « HTML brut » émet son contenu tel quel (sans habillage) : c'est ce
// qui permet d'ouvrir une page du site d'origine dans le constructeur sans en
// modifier le rendu (le contenu historique devient un unique bloc HTML).

import { escapeHtml } from "./shell.mjs";

export type TextAlign = "left" | "center" | "right";

export type Block =
  | { type: "hero"; title: string; subtitle: string; imageUrl: string; buttonLabel: string; buttonUrl: string }
  | { type: "richtext"; heading: string; headingLevel: "h2" | "h3"; body: string; align: TextAlign }
  | { type: "columns"; count: number; columns: { heading: string; body: string }[] }
  | { type: "cards"; heading: string; intro: string; cards: { title: string; body: string }[] }
  | { type: "imageText"; imageUrl: string; imagePosition: "left" | "right"; heading: string; body: string; buttonLabel: string; buttonUrl: string }
  | { type: "image"; url: string; alt: string; width: string; align: TextAlign }
  | { type: "cta"; heading: string; body: string; buttonLabel: string; buttonUrl: string }
  | { type: "button"; label: string; url: string; newTab: boolean; align: TextAlign }
  | { type: "spacer"; size: "petit" | "moyen" | "grand" }
  | { type: "separator" }
  | { type: "html"; html: string };

export type BlockType = Block["type"];

// ---------------------------------------------------------------------------
// Métadonnées des blocs (utilisées par l'interface d'administration)
// ---------------------------------------------------------------------------

export type BlockDefinition = {
  type: BlockType;
  label: string;
  icon: string; // emoji
  group: "Texte" | "Média" | "Mise en page" | "Avancé";
  description: string;
  create: () => Block;
};

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    type: "hero",
    label: "Bannière",
    icon: "🖼️",
    group: "Texte",
    description: "Grand bandeau avec titre et image de fond",
    create: () => ({ type: "hero", title: "Votre titre accrocheur", subtitle: "", imageUrl: "", buttonLabel: "", buttonUrl: "" }),
  },
  {
    type: "richtext",
    label: "Titre + texte",
    icon: "✍️",
    group: "Texte",
    description: "Un titre et des paragraphes",
    create: () => ({ type: "richtext", heading: "Un titre", headingLevel: "h2", body: "Votre texte ici.", align: "left" }),
  },
  {
    type: "cta",
    label: "Appel à l'action",
    icon: "📣",
    group: "Texte",
    description: "Bande colorée avec un bouton",
    create: () => ({ type: "cta", heading: "Prêt à commencer ?", body: "Contactez-nous dès aujourd'hui.", buttonLabel: "Nous contacter", buttonUrl: "/contact-orientation-scolaire-professionnel-toulouse" }),
  },
  {
    type: "button",
    label: "Bouton",
    icon: "🔘",
    group: "Texte",
    description: "Un bouton cliquable",
    create: () => ({ type: "button", label: "En savoir plus", url: "", newTab: false, align: "left" }),
  },
  {
    type: "image",
    label: "Image",
    icon: "🖼️",
    group: "Média",
    description: "Une image seule",
    create: () => ({ type: "image", url: "", alt: "", width: "100", align: "center" }),
  },
  {
    type: "imageText",
    label: "Image + texte",
    icon: "🧩",
    group: "Média",
    description: "Une image à côté d'un texte",
    create: () => ({ type: "imageText", imageUrl: "", imagePosition: "left", heading: "Un titre", body: "Votre texte ici.", buttonLabel: "", buttonUrl: "" }),
  },
  {
    type: "columns",
    label: "Colonnes",
    icon: "🗂️",
    group: "Mise en page",
    description: "2, 3 ou 4 colonnes de texte",
    create: () => ({
      type: "columns",
      count: 2,
      columns: [
        { heading: "", body: "Première colonne." },
        { heading: "", body: "Deuxième colonne." },
      ],
    }),
  },
  {
    type: "cards",
    label: "Cartes",
    icon: "🎴",
    group: "Mise en page",
    description: "Rangée de cartes colorées (style « méthode 360° »)",
    create: () => ({
      type: "cards",
      heading: "Nos atouts",
      intro: "",
      cards: [
        { title: "Atout 1", body: "Description du premier atout." },
        { title: "Atout 2", body: "Description du deuxième atout." },
        { title: "Atout 3", body: "Description du troisième atout." },
      ],
    }),
  },
  {
    type: "spacer",
    label: "Espacement",
    icon: "↕️",
    group: "Mise en page",
    description: "Un espace vertical",
    create: () => ({ type: "spacer", size: "moyen" }),
  },
  {
    type: "separator",
    label: "Séparateur",
    icon: "➖",
    group: "Mise en page",
    description: "Une ligne horizontale",
    create: () => ({ type: "separator" }),
  },
  {
    type: "html",
    label: "HTML avancé",
    icon: "🧾",
    group: "Avancé",
    description: "Code HTML libre (utilisateurs avancés)",
    create: () => ({ type: "html", html: "<p>Votre HTML ici.</p>" }),
  },
];

export const BLOCK_DEFINITION_BY_TYPE: Record<BlockType, BlockDefinition> =
  Object.fromEntries(BLOCK_DEFINITIONS.map((d) => [d.type, d])) as Record<BlockType, BlockDefinition>;

export function createBlock(type: BlockType): Block {
  return BLOCK_DEFINITION_BY_TYPE[type].create();
}

// ---------------------------------------------------------------------------
// Conversion texte -> HTML (saisie conviviale)
// ---------------------------------------------------------------------------

/**
 * Texte saisi par l'utilisateur -> HTML.
 * Si la saisie contient déjà des balises, elle est utilisée telle quelle ;
 * sinon chaque ligne non vide devient un paragraphe (listes : lignes "- ").
 */
export function textToHtml(input: string): string {
  const trimmed = (input ?? "").trim();
  if (trimmed === "") return "";
  if (trimmed.includes("<")) return trimmed;

  const out: string[] = [];
  let listItems: string[] = [];
  const flushList = () => {
    if (listItems.length > 0) {
      out.push(`<ul>\n${listItems.map((li) => `<li>${li}</li>`).join("\n")}\n</ul>`);
      listItems = [];
    }
  };
  for (const rawLine of trimmed.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "") {
      flushList();
      continue;
    }
    if (line.startsWith("- ")) {
      listItems.push(escapeHtml(line.slice(2)));
    } else {
      flushList();
      out.push(`<p>${escapeHtml(line)}</p>`);
    }
  }
  flushList();
  return out.join("\n");
}

// ---------------------------------------------------------------------------
// Compilation des blocs -> HTML (mêmes classes que le site d'origine)
// ---------------------------------------------------------------------------

const SPACER_SIZES: Record<string, string> = { petit: "20px", moyen: "48px", grand: "96px" };

function button(label: string, url: string, newTab = false): string {
  if (!label.trim()) return "";
  const target = newTab ? ' target="_blank"' : "";
  const href = url.trim() || "#";
  return `<a href="${escapeHtml(href)}"${target} title="${escapeHtml(label)}"> <button>${escapeHtml(label)}</button> </a>`;
}

/** Bande de contenu standard, reprenant la structure des pages intérieures. */
function contentSection(inner: string, index: number, extra: { sectionStyle?: string; sectionClass?: string } = {}): string {
  const style = extra.sectionStyle ? ` style="${extra.sectionStyle}"` : "";
  const cls = extra.sectionClass ? ` ${extra.sectionClass}` : "";
  return `<section class="bd-section-17 bd-tagstyles${cls}" data-section-title="Section" id="bd-block-${index}"${style}>
<div class="bd-container-inner bd-margins clearfix">
<div class="bd-joomlaposition-22 clearfix">
<div class="bd-block-79 bd-own-margins">
<div class="bd-blockcontent bd-tagstyles bd-custom-bulletlist">
<div class="custom">
${inner}
</div>
</div>
</div>
</div>
</div>
</section>`;
}

function compileHero(block: Extract<Block, { type: "hero" }>, index: number): string {
  // background-attachment:scroll (et non "fixed", hérité de .bd-slide-3) :
  // le fond couvre alors toute la hauteur du bloc, sans artefact d'affichage.
  const bg = block.imageUrl.trim()
    ? `background-image:url('${block.imageUrl.replaceAll("'", "%27")}');background-repeat:no-repeat;background-position:center;background-size:cover;background-attachment:scroll;`
    : "background-image:linear-gradient(135deg,#223352,#33486d);background-attachment:scroll;";
  const titleHtml = (block.title || "")
    .split(/\r?\n/)
    .map((l) => escapeHtml(l.trim()))
    .filter(Boolean)
    .join("<br/>");
  const subtitle = block.subtitle.trim()
    ? `<p class="bd-content-element" style="color:#fff;font-size:20px;margin-top:16px;">${escapeHtml(block.subtitle)}</p>`
    : "";
  const btn = button(block.buttonLabel, block.buttonUrl);
  const btnHtml = btn ? `<p style="margin-top:20px;">${btn}</p>` : "";
  return `<section class="bd-section-18 bd-page-width bd-tagstyles" data-section-title="Section" id="bd-hero-${index}">
<div class="bd-container-inner bd-margins clearfix">
<div class="bd-slider-7 bd-page-width bd-slider bd-no-margins carousel slide bd-carousel-fade" id="bd-hero-carousel-${index}">
<div class="bd-container-inner">
<div class="bd-slides carousel-inner">
<div class="bd-slide-3 bd-textureoverlay bd-textureoverlay-2 bd-slide item active" style="${bg}">
<div class="bd-container-inner">
<div class="bd-container-inner-wrapper">
<div class="bd-layoutbox-6 bd-no-margins clearfix">
<div class="bd-container-inner">
<div class="bd-layoutbox-7 bd-no-margins clearfix">
<div class="bd-container-inner">
<h1 class="bd-textblock-20 bd-content-element">${titleHtml}</h1>
${subtitle}
${btnHtml}
</div>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
</section>`;
}

function compileBlock(block: Block, index: number): string {
  switch (block.type) {
    case "hero":
      return compileHero(block, index);

    case "richtext": {
      const tag = block.headingLevel === "h3" ? "h3" : "h2";
      const heading = block.heading.trim() ? `<${tag}>${escapeHtml(block.heading)}</${tag}>` : "";
      const align = block.align !== "left" ? ` style="text-align:${block.align};"` : "";
      return contentSection(`<div${align}>\n${heading}\n${textToHtml(block.body)}\n</div>`, index);
    }

    case "columns": {
      const count = Math.min(Math.max(block.count || 2, 2), 4);
      const span = { 2: 6, 3: 4, 4: 3 }[count] ?? 6;
      const cols = block.columns
        .slice(0, count)
        .map((col) => {
          const heading = col.heading.trim() ? `<h3>${escapeHtml(col.heading)}</h3>` : "";
          return `<div class="col-sm-${span}">\n${heading}\n${textToHtml(col.body)}\n</div>`;
        })
        .join("\n");
      return contentSection(`<div class="row">\n${cols}\n</div>`, index);
    }

    case "cards": {
      const heading = block.heading.trim() ? `<h2>${escapeHtml(block.heading)}</h2>` : "";
      const intro = textToHtml(block.intro);
      const count = block.cards.length || 1;
      const span = count >= 4 ? 3 : count === 3 ? 4 : count === 2 ? 6 : 12;
      const cards = block.cards
        .map((card, i) => {
          const cls = `bloc-${(i % 4) + 1}`;
          const title = card.title.trim() ? `<p class="titre-bloc">${escapeHtml(card.title)}</p>` : "";
          return `<div class="col-sm-${span}">
<div class="${cls}" style="height:auto;">
${title}
${textToHtml(card.body)}
</div>
</div>`;
        })
        .join("\n");
      return contentSection(`${heading}\n${intro}\n<div class="row">\n${cards}\n</div>`, index);
    }

    case "imageText": {
      const img = block.imageUrl.trim()
        ? `<img alt="${escapeHtml(block.heading)}" src="${escapeHtml(block.imageUrl)}" style="max-width:100%;height:auto;"/>`
        : '<div style="background:#eef0f5;border-radius:6px;height:220px;"></div>';
      const heading = block.heading.trim() ? `<h2>${escapeHtml(block.heading)}</h2>` : "";
      const btn = button(block.buttonLabel, block.buttonUrl);
      const textCol = `<div class="col-sm-6">\n${heading}\n${textToHtml(block.body)}\n${btn ? `<p>${btn}</p>` : ""}\n</div>`;
      const imgCol = `<div class="col-sm-6">\n<p>${img}</p>\n</div>`;
      const inner = block.imagePosition === "right" ? textCol + "\n" + imgCol : imgCol + "\n" + textCol;
      return contentSection(`<div class="row bd-row-flex bd-row-align-middle">\n${inner}\n</div>`, index);
    }

    case "image": {
      if (!block.url.trim()) {
        return contentSection('<p style="text-align:center;"><em>Aucune image sélectionnée.</em></p>', index);
      }
      const width = /^\d{1,3}$/.test(block.width) ? `${block.width}%` : "100%";
      return contentSection(
        `<p style="text-align:${block.align};"><img alt="${escapeHtml(block.alt)}" src="${escapeHtml(block.url)}" style="max-width:${width};height:auto;"/></p>`,
        index,
      );
    }

    case "cta": {
      const heading = block.heading.trim() ? `<h2 style="color:#dec076;">${escapeHtml(block.heading)}</h2>` : "";
      const body = block.body.trim() ? `<p style="color:#fff;">${escapeHtml(block.body)}</p>` : "";
      const btn = button(block.buttonLabel, block.buttonUrl);
      const inner = `<div style="text-align:center;padding:20px 0;">\n${heading}\n${body}\n${btn ? `<p style="margin-top:16px;">${btn}</p>` : ""}\n</div>`;
      return contentSection(inner, index, { sectionStyle: "background-color:#223352;" });
    }

    case "button": {
      const btn = button(block.label, block.url, block.newTab);
      return contentSection(`<p style="text-align:${block.align};">${btn}</p>`, index);
    }

    case "spacer":
      return `<div style="height:${SPACER_SIZES[block.size] ?? "48px"};" aria-hidden="true"></div>`;

    case "separator":
      return contentSection('<hr style="border:none;border-top:1px solid #d9dce3;"/>', index);

    case "html":
      // Émis verbatim : préserve à l'identique le contenu des pages d'origine.
      return block.html ?? "";

    default:
      return "";
  }
}

/** Compile la liste de blocs vers le contenu principal d'une page. */
export function compileBlocks(blocks: Block[]): string {
  return blocks
    .map((block, index) => compileBlock(block, index + 1))
    .filter((html) => html.trim() !== "")
    .join("\n");
}

export function parseBlocksJson(json: string): Block[] {
  try {
    const data = JSON.parse(json);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (b): b is Block => b && typeof b === "object" && typeof b.type === "string",
    );
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Modèles de pages prêts à l'emploi (« création ludique et rapide »)
// ---------------------------------------------------------------------------

export type PageTemplate = {
  id: string;
  label: string;
  description: string;
  icon: string;
  blocks: () => Block[];
};

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: "vierge",
    label: "Page vierge",
    description: "Un simple titre et du texte, à compléter librement.",
    icon: "📄",
    blocks: () => [
      { type: "richtext", heading: "Titre de la page", headingLevel: "h2", body: "Votre contenu ici.", align: "left" },
    ],
  },
  {
    id: "presentation",
    label: "Présentation",
    description: "Bannière, texte de présentation, atouts et appel à l'action.",
    icon: "🏳️",
    blocks: () => [
      { type: "hero", title: "Bienvenue chez BOS & BOP", subtitle: "", imageUrl: "", buttonLabel: "", buttonUrl: "" },
      { type: "richtext", heading: "Qui sommes-nous ?", headingLevel: "h2", body: "Présentez votre activité en quelques lignes.", align: "left" },
      {
        type: "cards",
        heading: "Nos atouts",
        intro: "",
        cards: [
          { title: "Écoute", body: "Un accompagnement personnalisé." },
          { title: "Expertise", body: "Des méthodes éprouvées." },
          { title: "Résultats", body: "Des objectifs concrets." },
        ],
      },
      { type: "cta", heading: "Envie d'en savoir plus ?", body: "Contactez-nous dès aujourd'hui.", buttonLabel: "Nous contacter", buttonUrl: "/contact-orientation-scolaire-professionnel-toulouse" },
    ],
  },
  {
    id: "service",
    label: "Prestation / service",
    description: "Présentation d'une prestation avec image, détails et contact.",
    icon: "🧭",
    blocks: () => [
      { type: "richtext", heading: "Notre prestation", headingLevel: "h2", body: "Décrivez la prestation en quelques phrases.", align: "left" },
      { type: "imageText", imageUrl: "", imagePosition: "left", heading: "Comment ça se passe", body: "Expliquez le déroulé étape par étape.", buttonLabel: "", buttonUrl: "" },
      {
        type: "columns",
        count: 3,
        columns: [
          { heading: "Étape 1", body: "Première étape." },
          { heading: "Étape 2", body: "Deuxième étape." },
          { heading: "Étape 3", body: "Troisième étape." },
        ],
      },
      { type: "cta", heading: "Intéressé(e) ?", body: "Prenons rendez-vous.", buttonLabel: "Prendre rendez-vous", buttonUrl: "/contact-orientation-scolaire-professionnel-toulouse" },
    ],
  },
  {
    id: "landing",
    label: "Page d'atterrissage",
    description: "Une page marketing complète, prête à convertir.",
    icon: "🚀",
    blocks: () => [
      { type: "hero", title: "Une accroche qui donne envie", subtitle: "Un sous-titre pour préciser votre promesse.", imageUrl: "", buttonLabel: "Je me lance", buttonUrl: "/contact-orientation-scolaire-professionnel-toulouse" },
      { type: "richtext", heading: "Le problème que nous résolvons", headingLevel: "h2", body: "Décrivez le besoin auquel vous répondez.", align: "center" },
      {
        type: "cards",
        heading: "Ce que vous obtenez",
        intro: "",
        cards: [
          { title: "Bénéfice 1", body: "Description." },
          { title: "Bénéfice 2", body: "Description." },
          { title: "Bénéfice 3", body: "Description." },
        ],
      },
      { type: "imageText", imageUrl: "", imagePosition: "right", heading: "Ils nous font confiance", body: "Ajoutez un témoignage ou une preuve sociale.", buttonLabel: "", buttonUrl: "" },
      { type: "cta", heading: "Prêt(e) à démarrer ?", body: "Ne perdez plus de temps.", buttonLabel: "Nous contacter", buttonUrl: "/contact-orientation-scolaire-professionnel-toulouse" },
    ],
  },
];

export const PAGE_TEMPLATE_BY_ID: Record<string, PageTemplate> = Object.fromEntries(
  PAGE_TEMPLATES.map((t) => [t.id, t]),
);
