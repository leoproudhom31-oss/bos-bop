import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  updatePageAction,
  convertPageToBuilderAction,
  convertPageToHtmlAction,
} from "@/lib/admin-actions";
import { parseBlocksJson } from "@/lib/blocks";
import { PageBuilder } from "@/components/admin/PageBuilder";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  slug: "Cette adresse n'est pas disponible.",
};

export default async function EditPagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erreur?: string; converti?: string }>;
}) {
  const { id } = await params;
  const { ok, erreur, converti } = await searchParams;
  const page = await prisma.page.findUnique({ where: { id: Number(id) } });
  if (!page) notFound();

  const path = page.slug === "" ? "/" : `/${page.slug}`;
  const isBuilder = page.editorMode === "blocks";
  const isHome = page.slug === "";

  return (
    <>
      <div className="entete-page">
        <h1>Modifier : {page.breadcrumbLabel}</h1>
        <a href={path} target="_blank" rel="noreferrer" className="btn secondaire">
          Voir la page ↗
        </a>
      </div>

      {ok && <div className="notice ok">Page enregistrée.</div>}
      {converti && (
        <div className="notice ok">
          Page ouverte dans le constructeur visuel. Votre contenu d&apos;origine est préservé dans le
          bloc « HTML avancé » : ajoutez des blocs autour et enregistrez quand vous êtes prêt.
        </div>
      )}
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

        <div className="panel panel-large">
          <div className="panel-entete">
            <h2>Contenu de la page</h2>
            {isBuilder && (
              <span className="aide">Constructeur visuel — glissez, modifiez, l&apos;aperçu se met à jour en direct.</span>
            )}
          </div>

          {isBuilder ? (
            <PageBuilder initialBlocks={parseBlocksJson(page.blocksJson)} isHome={isHome} />
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

      {/* Bascule entre constructeur visuel et HTML brut, en dehors du formulaire principal */}
      <div className="panel" style={{ marginTop: 22 }}>
        <h2>Mode d&apos;édition</h2>
        {isBuilder ? (
          <>
            <p className="subtitle">
              Vous éditez cette page avec le <strong>constructeur visuel</strong>. Pour un contrôle
              fin du code, vous pouvez repasser en HTML brut.
            </p>
            <form action={convertPageToHtmlAction}>
              <input type="hidden" name="id" value={page.id} />
              <button type="submit" className="btn secondaire">
                Repasser en HTML brut
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="subtitle">
              Cette page est éditée en <strong>HTML brut</strong>. Ouvrez-la dans le constructeur
              visuel pour la modifier plus facilement : votre contenu actuel sera préservé et vous
              pourrez ajouter des blocs par-dessus, avec aperçu en direct.
            </p>
            <form action={convertPageToBuilderAction}>
              <input type="hidden" name="id" value={page.id} />
              <button type="submit" className="btn principal">
                ✨ Ouvrir dans le constructeur visuel
              </button>
            </form>
          </>
        )}
      </div>
    </>
  );
}
