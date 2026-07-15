import { getSetting } from "@/lib/settings";
import { DEFAULT_SITE_URL } from "@/lib/constants";
import { saveSettingsAction, changePasswordAction } from "@/lib/admin-actions";
import { isStripeConfigured, isStripeWebhookConfigured } from "@/lib/stripe";

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
  const stripeKeyOk = isStripeConfigured();
  const stripeWebhookOk = isStripeWebhookConfigured();
  const webhookUrl = `${siteUrl.replace(/\/+$/, "")}/api/stripe/webhook`;

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
        <h2>Paiement en ligne (Stripe)</h2>
        <p>
          Clé secrète Stripe :{" "}
          <span className={`badge ${stripeKeyOk ? "vert" : "gris"}`}>
            {stripeKeyOk ? "Configurée" : "Non configurée"}
          </span>
        </p>
        <p>
          Webhook de confirmation :{" "}
          <span className={`badge ${stripeWebhookOk ? "vert" : "gris"}`}>
            {stripeWebhookOk ? "Configuré" : "Non configuré"}
          </span>
        </p>
        {stripeKeyOk ? (
          <p className="subtitle">
            Le paiement par carte est actif : à la validation d&apos;une commande, le client est
            redirigé vers une page de paiement Stripe sécurisée.
          </p>
        ) : (
          <p className="subtitle">
            Tant qu&apos;aucune clé n&apos;est configurée, la boutique fonctionne normalement :
            après validation, une commande est enregistrée et vous convenez du règlement
            directement avec le client (comme aujourd&apos;hui).
          </p>
        )}
        <p className="subtitle">
          Adresse de webhook à renseigner dans le tableau de bord Stripe :{" "}
          <code className="slug">{webhookUrl}</code>
        </p>
        <p className="subtitle">
          Ces clés sont des identifiants sensibles : elles se configurent dans le fichier{" "}
          <code className="slug">.env</code> du serveur (variables{" "}
          <code className="slug">STRIPE_SECRET_KEY</code> et{" "}
          <code className="slug">STRIPE_WEBHOOK_SECRET</code>), pas depuis cette page. Marche à
          suivre détaillée dans le README du projet, section « Connecter Stripe ».
        </p>
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
