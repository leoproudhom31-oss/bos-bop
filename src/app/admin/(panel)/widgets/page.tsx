import { getSetting } from "@/lib/settings";
import { saveWidgetsAction } from "@/lib/admin-actions";
import WidgetsForm from "./WidgetsForm";

export const dynamic = "force-dynamic";

export default async function WidgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  const [phone, facebookUrl, linkedinUrl, shareBarEnabled] = await Promise.all([
    getSetting("widgetPhone", ""),
    getSetting("widgetFacebookUrl", ""),
    getSetting("widgetLinkedinUrl", ""),
    getSetting("widgetShareBarEnabled", "1"),
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
        Téléphone, panier et réseaux sociaux affichés dans l&apos;en-tête et le pied de page du
        site. L&apos;aperçu se met à jour au fur et à mesure de la saisie.
      </p>
      {ok && <div className="notice ok">Widgets enregistrés.</div>}

      <WidgetsForm
        action={saveWidgetsAction}
        initial={{ phone, facebookUrl, linkedinUrl, shareBarEnabled: shareBarEnabled !== "0" }}
      />
    </>
  );
}
