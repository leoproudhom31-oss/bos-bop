import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { updatePageAction } from "@/lib/admin-actions";
import { parseBlocksJson } from "@/lib/blocks";
import { BlockEditor } from "@/components/admin/BlockEditor";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  slug: "Cette adresse n'est pas disponible.",
};

export default async function EditPagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const { id } = await params;
  const { ok, erreur } = await searchParams;
  const page = await prisma.page.findUnique({ where: { id: Number(id) } });
  if (!page) notFound();

  const path = page.slug === "" ? "/" : `/${page.slug}`;

  return (
    <>
      <div className="entete-page">
        <h1>Modifier : {page.breadcrumbLabel}</h1>
        <a href={path} target="_blank" rel="noreferrer" className="btn secondaire">
          Voir la page ↗
        </a>
      </div>

      {ok && <div className="notice ok">Page enregistrée.</div>}
      {erreur && <div className="notice erreur">{ERRORS[erreur] ?? "Erreur inconnue."}</div>}
      {!page.published && (
        <div className="notice info">
          Cette page est en brouillon : elle n&apos;est visible que par les administrateurs
          connectés.
        </div>
      )}

      <form action={updatePageAction}>
        <input type="hidden" name="id" value={page.id} />

        <div className="panel">
          <h2>Informations générales</h2>
          <div className="grille-2">
            <label className="champ">
              Nom de la page
              <input type="text" name="name" defaultValue={page.breadcrumbLabel} required maxLength={150} />
            </label>
            <label className="champ">
              Adresse
              {page.isLegacy ? (
                <input type="text" value={path} disabled title="Adresse conservée pour le référencement" />
              ) : (
                <input type="text" name="slug" defaultValue={page.slug} maxLength={100} />
              )}
            </label>
          </div>
          <label className="champ">
            Titre de l&apos;onglet du navigateur <span className="aide">(balise &lt;title&gt;)</span>
            <input type="text" name="title" defaultValue={page.title} maxLength={300} />
          </label>
          <div className="grille-2">
            <label className="champ">
              Description pour les moteurs de recherche
              <textarea name="metaDescription" rows={3} defaultValue={page.metaDescription} maxLength={500} />
            </label>
            <label className="champ">
              Mots-clés <span className="aide">(séparés par des virgules)</span>
              <textarea name="metaKeywords" rows={3} defaultValue={page.metaKeywords} maxLength={300} />
            </label>
          </div>
          <label className="champ-inline">
            <input type="checkbox" name="published" value="1" defaultChecked={page.published} disabled={page.slug === ""} />
            Page publiée {page.slug === "" && <span className="aide">(la page d&apos;accueil est toujours publiée)</span>}
          </label>
          {page.slug === "" && <input type="hidden" name="published" value="1" />}
        </div>

        <div className="panel">
          <h2>Contenu</h2>
          {page.editorMode === "blocks" ? (
            <BlockEditor initialBlocks={parseBlocksJson(page.blocksJson)} />
          ) : (
            <label className="champ">
              HTML de la page{" "}
              <span className="aide">
                — contenu compris entre le bandeau et le pied de page. Modifiez avec prudence :
                ce balisage provient du site d&apos;origine.
              </span>
              <textarea name="contentHtml" rows={26} className="code" defaultValue={page.contentHtml} />
            </label>
          )}
        </div>

        <button type="submit" className="btn principal">
          Enregistrer
        </button>
      </form>
    </>
  );
}
