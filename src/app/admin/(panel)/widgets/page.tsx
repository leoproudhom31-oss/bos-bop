import { getSetting } from "@/lib/settings";
import { saveWidgetsAction } from "@/lib/admin-actions";

export const dynamic = "force-dynamic";

export default async function WidgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  const [phone, facebookUrl, linkedinUrl] = await Promise.all([
    getSetting("widgetPhone", ""),
    getSetting("widgetFacebookUrl", ""),
    getSetting("widgetLinkedinUrl", ""),
  ]);

  return (
    <>
      <div className="entete-page">
        <h1>Widgets</h1>
        <a href="/" target="_blank" rel="noreferrer" className="btn secondaire">
          Voir le site ↗
        </a>
      </div>
      <p className="subtitle">
        Téléphone et réseaux sociaux affichés dans l&apos;en-tête et le pied de page du site.
      </p>
      {ok && <div className="notice ok">Widgets enregistrés.</div>}

      <div className="panel">
        <form action={saveWidgetsAction}>
          <label className="champ">
            Numéro de téléphone
            <input
              name="widgetPhone"
              defaultValue={phone}
              placeholder="06.48.69.20.36"
              maxLength={30}
            />
          </label>
          <p className="subtitle">
            Laisser vide restaure le numéro d&apos;origine du site. Affiché dans l&apos;en-tête et
            le pied de page ; le lien d&apos;appel (<code className="slug">tel:</code>) est calculé
            automatiquement.
          </p>

          <label className="champ">
            Page Facebook <span className="aide">(adresse complète)</span>
            <input
              type="url"
              name="widgetFacebookUrl"
              defaultValue={facebookUrl}
              placeholder="https://www.facebook.com/…"
              maxLength={300}
            />
          </label>
          <p className="subtitle">
            Le widget Facebook d&apos;origine dépend d&apos;un script tiers souvent en échec
            (bloqueurs de contenu, réseau…) : laisser un réglage ici affiche à la place un simple
            bouton « Suivre sur Facebook », toujours fonctionnel. Laisser vide conserve le widget
            d&apos;origine tel quel.
          </p>

          <label className="champ">
            Profil LinkedIn <span className="aide">(adresse complète)</span>
            <input
              type="url"
              name="widgetLinkedinUrl"
              defaultValue={linkedinUrl}
              placeholder="https://www.linkedin.com/…"
              maxLength={300}
            />
          </label>
          <p className="subtitle">Laisser vide conserve le lien LinkedIn d&apos;origine.</p>

          <button type="submit" className="btn principal">
            Enregistrer
          </button>
        </form>
      </div>
    </>
  );
}
