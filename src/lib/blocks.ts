// Générateur de pages : blocs de contenu compilés vers le balisage du
// gabarit d'origine (mêmes classes CSS que les pages Joomla existantes).

import { escapeHtml } from "./shell.mjs";

export type Block =
  | { type: "titre"; level: "h2" | "h3"; text: string }
  | { type: "texte"; html: string }
  | { type: "colonnes"; left: string; right: string }
  | { type: "image"; url: string; alt: string; width: string }
  | { type: "bouton"; label: string; url: string; newTab: boolean }
  | { type: "espace" };

export const BLOCK_LABELS: Record<Block["type"], string> = {
  titre: "Titre",
  texte: "Paragraphes",
  colonnes: "Deux colonnes",
  image: "Image",
  bouton: "Bouton",
  espace: "Espacement",
};

/**
 * Texte saisi par l'utilisateur -> HTML.
 * Si la saisie contient déjà des balises, elle est utilisée telle quelle ;
 * sinon chaque ligne non vide devient un paragraphe (listes : lignes "- ").
 */
export function textToHtml(input: string): string {
  const trimmed = input.trim();
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

function compileBlock(block: Block): string {
  switch (block.type) {
    case "titre": {
      const tag = block.level === "h3" ? "h3" : "h2";
      return `<${tag}>${escapeHtml(block.text)}</${tag}>`;
    }
    case "texte":
      return textToHtml(block.html);
    case "colonnes":
      return `<div class="row">
<div class="col-sm-6">
${textToHtml(block.left)}
</div>
<div class="col-sm-6">
${textToHtml(block.right)}
</div>
</div>`;
    case "image": {
      const width = /^\d{1,3}$/.test(block.width) ? `${block.width}%` : "100%";
      return `<p style="text-align: center;"><img alt="${escapeHtml(block.alt)}" src="${escapeHtml(block.url)}" style="max-width: ${width}; height: auto;"/></p>`;
    }
    case "bouton": {
      const target = block.newTab ? ' target="_blank"' : "";
      return `<p><a href="${escapeHtml(block.url)}"${target} title="${escapeHtml(block.label)}"> <button>${escapeHtml(block.label)}</button> </a></p>`;
    }
    case "espace":
      return "<p> </p>";
  }
}

/**
 * Compile les blocs vers le contenu principal d'une page, enveloppé dans la
 * même structure de section que les pages intérieures du site d'origine.
 */
export function compileBlocks(blocks: Block[]): string {
  const inner = blocks.map(compileBlock).filter(Boolean).join("\n");
  return `
<section class="bd-section-17 bd-tagstyles" data-section-title="Section" id="section17">
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
</section>
`;
}

export function parseBlocksJson(json: string): Block[] {
  try {
    const data = JSON.parse(json);
    return Array.isArray(data) ? (data as Block[]) : [];
  } catch {
    return [];
  }
}
