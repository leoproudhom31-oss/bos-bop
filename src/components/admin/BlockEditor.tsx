"use client";

import { useState } from "react";
import type { Block } from "@/lib/blocks";

// Éditeur de blocs : construit le contenu d'une page sans écrire de HTML.
// Le JSON des blocs est envoyé au serveur qui le compile vers le balisage
// du gabarit d'origine.

type BlockWithKey = { key: number; block: Block };

const NEW_BLOCKS: Record<string, () => Block> = {
  titre: () => ({ type: "titre", level: "h2", text: "" }),
  texte: () => ({ type: "texte", html: "" }),
  colonnes: () => ({ type: "colonnes", left: "", right: "" }),
  image: () => ({ type: "image", url: "", alt: "", width: "100" }),
  bouton: () => ({ type: "bouton", label: "", url: "", newTab: false }),
  espace: () => ({ type: "espace" }),
};

const TYPE_LABELS: Record<string, string> = {
  titre: "Titre",
  texte: "Paragraphes",
  colonnes: "Deux colonnes",
  image: "Image",
  bouton: "Bouton",
  espace: "Espacement",
};

const TEXT_HELP =
  "Une ligne = un paragraphe. Commencez une ligne par « - » pour une liste à puces. Le HTML est accepté.";

let nextKey = 1;

export function BlockEditor({ initialBlocks }: { initialBlocks: Block[] }) {
  const [items, setItems] = useState<BlockWithKey[]>(() =>
    initialBlocks.map((block) => ({ key: nextKey++, block })),
  );

  const update = (key: number, patch: Partial<Block>) => {
    setItems((current) =>
      current.map((item) =>
        item.key === key ? { key, block: { ...item.block, ...patch } as Block } : item,
      ),
    );
  };

  const move = (index: number, delta: number) => {
    setItems((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  };

  const remove = (key: number) => {
    setItems((current) => current.filter((item) => item.key !== key));
  };

  const add = (type: string) => {
    setItems((current) => [...current, { key: nextKey++, block: NEW_BLOCKS[type]() }]);
  };

  return (
    <div className="bloc-editeur">
      <input
        type="hidden"
        name="blocksJson"
        value={JSON.stringify(items.map((item) => item.block))}
      />

      {items.length === 0 && (
        <p className="vide">Aucun bloc : ajoutez un premier bloc ci-dessous.</p>
      )}

      {items.map((item, index) => (
        <div className="bloc" key={item.key}>
          <div className="bloc-entete">
            <span className="type">{TYPE_LABELS[item.block.type]}</span>
            <button type="button" className="btn secondaire petit" onClick={() => move(index, -1)} disabled={index === 0}>
              ↑
            </button>
            <button type="button" className="btn secondaire petit" onClick={() => move(index, 1)} disabled={index === items.length - 1}>
              ↓
            </button>
            <button type="button" className="btn danger petit" onClick={() => remove(item.key)}>
              Retirer
            </button>
          </div>

          {item.block.type === "titre" && (
            <div className="grille-2">
              <label className="champ">
                Texte du titre
                <input
                  type="text"
                  value={item.block.text}
                  onChange={(e) => update(item.key, { text: e.target.value })}
                />
              </label>
              <label className="champ">
                Niveau
                <select
                  value={item.block.level}
                  onChange={(e) => update(item.key, { level: e.target.value as "h2" | "h3" })}
                >
                  <option value="h2">Titre principal (h2)</option>
                  <option value="h3">Sous-titre (h3)</option>
                </select>
              </label>
            </div>
          )}

          {item.block.type === "texte" && (
            <label className="champ">
              Texte <span className="aide">— {TEXT_HELP}</span>
              <textarea
                rows={6}
                value={item.block.html}
                onChange={(e) => update(item.key, { html: e.target.value })}
              />
            </label>
          )}

          {item.block.type === "colonnes" && (
            <div className="grille-2">
              <label className="champ">
                Colonne de gauche <span className="aide">— {TEXT_HELP}</span>
                <textarea
                  rows={6}
                  value={item.block.left}
                  onChange={(e) => update(item.key, { left: e.target.value })}
                />
              </label>
              <label className="champ">
                Colonne de droite
                <textarea
                  rows={6}
                  value={item.block.right}
                  onChange={(e) => update(item.key, { right: e.target.value })}
                />
              </label>
            </div>
          )}

          {item.block.type === "image" && (
            <ImageFields
              url={item.block.url}
              alt={item.block.alt}
              width={item.block.width}
              onChange={(patch) => update(item.key, patch)}
            />
          )}

          {item.block.type === "bouton" && (
            <div className="grille-2">
              <label className="champ">
                Texte du bouton
                <input
                  type="text"
                  value={item.block.label}
                  onChange={(e) => update(item.key, { label: e.target.value })}
                />
              </label>
              <label className="champ">
                Lien <span className="aide">(ex : /contact-orientation-scolaire-professionnel-toulouse)</span>
                <input
                  type="text"
                  value={item.block.url}
                  onChange={(e) => update(item.key, { url: e.target.value })}
                />
              </label>
              <label className="champ-inline">
                <input
                  type="checkbox"
                  checked={item.block.newTab}
                  onChange={(e) => update(item.key, { newTab: e.target.checked })}
                />
                Ouvrir dans un nouvel onglet
              </label>
            </div>
          )}

          {item.block.type === "espace" && (
            <p className="aide" style={{ margin: 0, color: "var(--texte-2)" }}>
              Insère un espacement vertical entre deux blocs.
            </p>
          )}
        </div>
      ))}

      <div className="ajout">
        {Object.entries(TYPE_LABELS).map(([type, label]) => (
          <button key={type} type="button" className="btn secondaire petit" onClick={() => add(type)}>
            + {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ImageFields({
  url,
  alt,
  width,
  onChange,
}: {
  url: string;
  alt: string;
  width: string;
  onChange: (patch: { url?: string; alt?: string; width?: string }) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body });
      if (!response.ok) throw new Error(await response.text());
      const data = (await response.json()) as { url: string };
      onChange({ url: data.url });
    } catch {
      setError("Échec de l'envoi du fichier.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="grille-2">
        <label className="champ">
          Fichier image
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        </label>
        <label className="champ">
          Largeur (en % de la page)
          <input
            type="number"
            min={10}
            max={100}
            value={width}
            onChange={(e) => onChange({ width: e.target.value })}
          />
        </label>
      </div>
      <label className="champ">
        Texte alternatif <span className="aide">(description de l&apos;image)</span>
        <input type="text" value={alt} onChange={(e) => onChange({ alt: e.target.value })} />
      </label>
      {uploading && <p>Envoi en cours…</p>}
      {error && <div className="notice erreur">{error}</div>}
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="apercu-image" />
      )}
    </div>
  );
}
