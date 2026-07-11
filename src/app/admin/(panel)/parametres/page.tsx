import { getSetting, DEFAULT_SITE_URL } from "@/lib/settings";
import { saveSettingsAction, changePasswordAction } from "@/lib/admin-actions";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, { type: "ok" | "erreur"; text: string }> = {
  "1": { type: "ok", text: "Réglages enregistrés." },
  mdp: { type: "ok", text: "Mot de passe modifié." },
  "mdp-court": { type: "erreur", text: "Le nouveau mot de passe doit contenir au moins 8 caractères." },
  "mdp-differents": { type: "erreur", text: "La confirmation ne correspond pas au nouveau mot de passe." },
  "mdp-actuel": { type: "erreur", text: "Le mot de passe actuel est incorrect." },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const { ok, erreur } = await searchParams;
  const notice = MESSAGES[ok ?? ""] ?? MESSAGES[erreur ?? ""];
  const [siteUrl, shopEnabled] = await Promise.all([
    getSetting("siteUrl", DEFAULT_SITE_URL),
    getSetting("shopEnabled", "0"),
  ]);

  return (
    <>
      <h1>Réglages</h1>
      <p className="subtitle">Paramètres généraux du site et de la boutique.</p>
      {notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}

      <div className="panel">
        <h2>Site</h2>
        <form action={saveSettingsAction}>
          <label className="champ">
            Adresse publique du site{" "}
            <span className="aide">(utilisée pour les liens de partage des pages)</span>
            <input type="url" name="siteUrl" defaultValue={siteUrl} />
          </label>
          <label className="champ-inline">
            <input type="checkbox" name="shopEnabled" value="1" defaultChecked={shopEnabled === "1"} />
            Activer la boutique en ligne (catalogue <code className="slug">/livres</code>, panier et commandes)
          </label>
          <p className="subtitle">
            Tant que la boutique est désactivée, le site public reste strictement identique au
            site d&apos;origine. Après activation, pensez à ajouter une entrée «&nbsp;Les
            livres&nbsp;» pointant vers <code className="slug">/livres</code> dans le menu du
            site.
          </p>
          <button type="submit" className="btn principal">
            Enregistrer
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>Mot de passe</h2>
        <form action={changePasswordAction}>
          <div className="grille-2">
            <label className="champ">
              Mot de passe actuel
              <input type="password" name="current" required autoComplete="current-password" />
            </label>
            <span />
            <label className="champ">
              Nouveau mot de passe <span className="aide">(8 caractères minimum)</span>
              <input type="password" name="new" required minLength={8} autoComplete="new-password" />
            </label>
            <label className="champ">
              Confirmer le nouveau mot de passe
              <input type="password" name="confirm" required minLength={8} autoComplete="new-password" />
            </label>
          </div>
          <button type="submit" className="btn principal">
            Changer le mot de passe
          </button>
        </form>
      </div>
    </>
  );
}
