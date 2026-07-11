import { createPageAction } from "@/lib/admin-actions";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  nom: "Merci d'indiquer un nom de page.",
  slug: "Cette adresse n'est pas utilisable (réservée ou vide).",
  "slug-existe": "Une page existe déjà à cette adresse.",
};

export default async function NewPagePage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;

  return (
    <>
      <h1>Créer une page</h1>
      <p className="subtitle">
        La nouvelle page reprend automatiquement l&apos;habillage du site (bandeau, menu, pied de
        page). Elle est créée en brouillon : publiez-la quand elle est prête.
      </p>
      {erreur && <div className="notice erreur">{ERRORS[erreur] ?? "Erreur inconnue."}</div>}

      <div className="panel">
        <form action={createPageAction}>
          <div className="grille-2">
            <label className="champ">
              Nom de la page <span className="aide">(titre affiché, ex : « Nos ateliers »)</span>
              <input type="text" name="name" required maxLength={150} />
            </label>
            <label className="champ">
              Adresse <span className="aide">(laisser vide pour la générer depuis le nom)</span>
              <input type="text" name="slug" placeholder="ex : nos-ateliers" maxLength={100} />
            </label>
          </div>
          <label className="champ">
            Description pour les moteurs de recherche <span className="aide">(facultatif)</span>
            <textarea name="metaDescription" rows={2} maxLength={300} />
          </label>
          <label className="champ">
            Mode d&apos;édition
            <select name="editorMode" defaultValue="blocks">
              <option value="blocks">Générateur de blocs (recommandé)</option>
              <option value="html">HTML libre (utilisateurs avancés)</option>
            </select>
          </label>
          <label className="champ-inline">
            <input type="checkbox" name="addToMenu" value="1" />
            Ajouter la page au menu du site
          </label>
          <button type="submit" className="btn principal">
            Créer la page
          </button>
        </form>
      </div>
    </>
  );
}
