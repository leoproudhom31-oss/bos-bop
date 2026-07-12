"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BLOCK_DEFINITIONS,
  BLOCK_DEFINITION_BY_TYPE,
  createBlock,
  type Block,
  type BlockType,
} from "@/lib/blocks";
import { BlockEditorFields } from "./block-editors";

type Keyed = { key: number; block: Block };
let keyCounter = 1;

const GROUP_ORDER = ["Texte", "Média", "Mise en page", "Avancé"] as const;

export function PageBuilder({
  initialBlocks,
  isHome,
}: {
  initialBlocks: Block[];
  isHome: boolean;
}) {
  const [items, setItems] = useState<Keyed[]>(() =>
    initialBlocks.map((block) => ({ key: keyCounter++, block })),
  );
  const [openKey, setOpenKey] = useState<number | null>(
    initialBlocks.length > 0 ? null : null,
  );
  const [paletteAt, setPaletteAt] = useState<number | null>(null);
  const [mobileView, setMobileView] = useState<"editeur" | "apercu">("editeur");

  const blocks = useMemo(() => items.map((i) => i.block), [items]);

  // ---- mutations ----------------------------------------------------------
  const update = useCallback((key: number, patch: Partial<Block>) => {
    setItems((cur) =>
      cur.map((it) => (it.key === key ? { key, block: { ...it.block, ...patch } as Block } : it)),
    );
  }, []);

  const remove = useCallback((key: number) => {
    setItems((cur) => cur.filter((it) => it.key !== key));
  }, []);

  const move = useCallback((index: number, delta: number) => {
    setItems((cur) => {
      const target = index + delta;
      if (target < 0 || target >= cur.length) return cur;
      const copy = [...cur];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }, []);

  const duplicate = useCallback((index: number) => {
    setItems((cur) => {
      const copy = [...cur];
      const clone = { key: keyCounter++, block: JSON.parse(JSON.stringify(cur[index].block)) };
      copy.splice(index + 1, 0, clone);
      return copy;
    });
  }, []);

  const addBlock = useCallback((type: BlockType, at: number | null) => {
    setItems((cur) => {
      const entry = { key: keyCounter++, block: createBlock(type) };
      if (at === null || at >= cur.length) return [...cur, entry];
      const copy = [...cur];
      copy.splice(at, 0, entry);
      return copy;
    });
    setPaletteAt(null);
  }, []);

  // ---- glisser-déposer ----------------------------------------------------
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const onDrop = (target: number) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    setDragOver(null);
    if (from === null || from === target) return;
    setItems((cur) => {
      const copy = [...cur];
      const [moved] = copy.splice(from, 1);
      copy.splice(from < target ? target - 1 : target, 0, moved);
      return copy;
    });
  };

  // ---- aperçu en direct ---------------------------------------------------
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewing, setPreviewing] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setPreviewing(true);
      try {
        const response = await fetch("/api/admin/preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ blocks, isHome }),
        });
        if (response.ok) setPreviewHtml(await response.text());
      } catch {
        // aperçu indisponible : on laisse l'ancien rendu
      } finally {
        setPreviewing(false);
      }
    }, 500);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [blocks, isHome]);

  // ---- rendu --------------------------------------------------------------
  return (
    <div className="builder">
      <input type="hidden" name="blocksJson" value={JSON.stringify(blocks)} />

      <div className="builder-toolbar">
        <div className="builder-tabs">
          <button
            type="button"
            className={mobileView === "editeur" ? "active" : ""}
            onClick={() => setMobileView("editeur")}
          >
            ✏️ Éditeur
          </button>
          <button
            type="button"
            className={mobileView === "apercu" ? "active" : ""}
            onClick={() => setMobileView("apercu")}
          >
            👁️ Aperçu
          </button>
        </div>
        <span className="builder-preview-state">
          {previewing ? "Mise à jour de l'aperçu…" : "Aperçu à jour"}
        </span>
      </div>

      <div className="builder-split">
        <div className={`builder-editor ${mobileView === "editeur" ? "visible" : "masque-mobile"}`}>
          {items.length === 0 && (
            <p className="vide">Aucun bloc. Ajoutez votre premier bloc ci-dessous.</p>
          )}

          {items.map((item, index) => {
            const def = BLOCK_DEFINITION_BY_TYPE[item.block.type];
            const open = openKey === item.key;
            return (
              <div key={item.key}>
                <InsertZone onClick={() => setPaletteAt(index)} active={dragOver === index}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(index); }}
                  onDrop={() => onDrop(index)}
                />
                <div
                  className={`builder-block ${open ? "ouvert" : ""}`}
                  draggable
                  onDragStart={() => { dragIndex.current = index; }}
                  onDragEnd={() => { dragIndex.current = null; setDragOver(null); }}
                >
                  <div className="builder-block-entete" onClick={() => setOpenKey(open ? null : item.key)}>
                    <span className="poignee" title="Glisser pour déplacer">⠿</span>
                    <span className="type-icone">{def?.icon ?? "▫️"}</span>
                    <span className="type-nom">{def?.label ?? item.block.type}</span>
                    <div className="builder-block-actions" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="ico" title="Monter" onClick={() => move(index, -1)} disabled={index === 0}>↑</button>
                      <button type="button" className="ico" title="Descendre" onClick={() => move(index, 1)} disabled={index === items.length - 1}>↓</button>
                      <button type="button" className="ico" title="Dupliquer" onClick={() => duplicate(index)}>⧉</button>
                      <button type="button" className="ico danger" title="Supprimer" onClick={() => remove(item.key)}>🗑</button>
                      <button type="button" className="ico" title={open ? "Replier" : "Modifier"} onClick={() => setOpenKey(open ? null : item.key)}>{open ? "▲" : "▼"}</button>
                    </div>
                  </div>
                  {open && (
                    <div className="builder-block-corps">
                      <BlockEditorFields block={item.block} update={(patch) => update(item.key, patch)} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <InsertZone onClick={() => setPaletteAt(items.length)} active={dragOver === items.length}
            onDragOver={(e) => { e.preventDefault(); setDragOver(items.length); }}
            onDrop={() => onDrop(items.length)}
          />

          <button type="button" className="btn principal builder-ajout" onClick={() => setPaletteAt(items.length)}>
            + Ajouter un bloc
          </button>
        </div>

        <div className={`builder-preview ${mobileView === "apercu" ? "visible" : "masque-mobile"}`}>
          <div className="builder-preview-cadre">
            <iframe title="Aperçu de la page" srcDoc={previewHtml} />
          </div>
        </div>
      </div>

      {paletteAt !== null && (
        <BlockPalette onPick={(type) => addBlock(type, paletteAt)} onClose={() => setPaletteAt(null)} />
      )}
    </div>
  );
}

function InsertZone({
  onClick,
  active,
  onDragOver,
  onDrop,
}: {
  onClick: () => void;
  active: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}) {
  return (
    <div
      className={`builder-insert ${active ? "survol" : ""}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <button type="button" onClick={onClick} title="Insérer un bloc ici">
        +
      </button>
    </div>
  );
}

function BlockPalette({
  onPick,
  onClose,
}: {
  onPick: (type: BlockType) => void;
  onClose: () => void;
}) {
  return (
    <div className="palette-overlay" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <div className="palette-entete">
          <h2>Ajouter un bloc</h2>
          <button type="button" className="btn secondaire petit" onClick={onClose}>
            Fermer
          </button>
        </div>
        {GROUP_ORDER.map((group) => {
          const defs = BLOCK_DEFINITIONS.filter((d) => d.group === group);
          if (defs.length === 0) return null;
          return (
            <div className="palette-groupe" key={group}>
              <div className="palette-groupe-titre">{group}</div>
              <div className="palette-grille">
                {defs.map((def) => (
                  <button key={def.type} type="button" className="palette-item" onClick={() => onPick(def.type)}>
                    <span className="palette-item-icone">{def.icon}</span>
                    <span className="palette-item-nom">{def.label}</span>
                    <span className="palette-item-desc">{def.description}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
