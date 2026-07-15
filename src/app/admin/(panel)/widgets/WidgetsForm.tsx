"use client";

import { useState } from "react";

// Formulaire des widgets avec aperçu en direct : on voit immédiatement, sur un
// fond marine reproduisant l'en-tête/pied de page du site, l'effet de chaque
// champ (numéro, bouton Facebook, lien LinkedIn). Un champ laissé vide restaure
// le comportement d'origine — l'aperçu l'indique explicitement.

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  initial: { phone: string; facebookUrl: string; linkedinUrl: string };
};

const ORIGINAL_PHONE = "06.48.69.20.36";
const GOLD = "#ddc076";
const NAVY = "#102f40";

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke={GOLD} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 3.5h3l1.2 4-2 1.3c1 2.2 2.8 4 5 5l1.3-2 4 1.2v3c0 1.1-.9 2-2 2-8 0-14.5-6.5-14.5-14.5 0-1.1.9-2 2-2z" />
  </svg>
);

const CartIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke={GOLD} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 4h2.2l2.4 11.2a1.6 1.6 0 0 0 1.57 1.3h7.9a1.6 1.6 0 0 0 1.56-1.22L20.5 8H6.1" />
    <circle cx="10" cy="20" r="1.4" />
    <circle cx="17.5" cy="20" r="1.4" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="currentColor">
    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.9h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94z" />
  </svg>
);

function PreviewFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".4px", color: "#8a8778", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ background: NAVY, borderRadius: 10, padding: 20, display: "flex", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}

export default function WidgetsForm({ action, initial }: Props) {
  const [phone, setPhone] = useState(initial.phone);
  const [facebookUrl, setFacebookUrl] = useState(initial.facebookUrl);
  const [linkedinUrl, setLinkedinUrl] = useState(initial.linkedinUrl);

  const phoneDisplay = phone.trim() || ORIGINAL_PHONE;

  return (
    <form action={action}>
      {/* --- Téléphone + panier (en-tête) --- */}
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Téléphone &amp; panier</h2>
        <label className="champ">
          Numéro de téléphone
          <input
            name="widgetPhone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={ORIGINAL_PHONE}
            maxLength={30}
          />
        </label>
        <p className="subtitle">
          Affiché dans l&apos;en-tête et le pied de page. Le lien d&apos;appel (<code className="slug">tel:</code>)
          est calculé automatiquement. Laisser vide restaure le numéro d&apos;origine.
        </p>

        <PreviewFrame label="Aperçu de l'encadré en-tête">
          <div
            style={{
              display: "inline-flex",
              flexDirection: "column",
              color: "#fff",
              lineHeight: 1.25,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 9, whiteSpace: "nowrap", fontSize: 16, fontWeight: 600 }}>
              <PhoneIcon />
              <span>{phoneDisplay}</span>
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                marginTop: 6,
                paddingTop: 6,
                borderTop: `1px solid rgba(221,192,118,.35)`,
                fontWeight: 600,
              }}
            >
              <span style={{ display: "inline-flex" }}>
                <CartIcon />
              </span>
              <span>Mon panier</span>
              <span
                style={{
                  minWidth: 20,
                  height: 20,
                  borderRadius: 10,
                  background: GOLD,
                  color: NAVY,
                  fontSize: 12,
                  lineHeight: "20px",
                  textAlign: "center",
                  padding: "0 6px",
                  fontWeight: 700,
                }}
              >
                2
              </span>
            </div>
          </div>
        </PreviewFrame>
        <p className="subtitle">
          La ligne « Mon panier » (avec compteur) n&apos;apparaît sur le site que lorsque la
          boutique est activée dans les Réglages.
        </p>
      </div>

      {/* --- Facebook --- */}
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Facebook</h2>
        <label className="champ">
          Page Facebook <span className="aide">(adresse complète)</span>
          <input
            type="url"
            name="widgetFacebookUrl"
            value={facebookUrl}
            onChange={(e) => setFacebookUrl(e.target.value)}
            placeholder="https://www.facebook.com/…"
            maxLength={300}
          />
        </label>
        <p className="subtitle">
          Le widget Facebook d&apos;origine dépend d&apos;un script tiers souvent en échec
          (bloqueurs, réseau…) et affiche alors une image cassée. Renseigner l&apos;adresse ici
          affiche à la place un bouton « Suivre sur Facebook » toujours fonctionnel. Laisser vide
          conserve le widget d&apos;origine.
        </p>
        <PreviewFrame label="Aperçu du pied de page">
          {facebookUrl.trim() ? (
            <a
              href={facebookUrl.trim()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.preventDefault()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                color: GOLD,
                textDecoration: "none",
                fontWeight: 600,
                border: `1px solid ${GOLD}`,
                borderRadius: 8,
                padding: "11px 20px",
              }}
            >
              <FacebookIcon />
              <span>Suivre sur Facebook</span>
            </a>
          ) : (
            <span style={{ color: "#b9c2c9", fontStyle: "italic", fontSize: 14 }}>
              Widget Facebook d&apos;origine conservé
            </span>
          )}
        </PreviewFrame>
      </div>

      {/* --- LinkedIn --- */}
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>LinkedIn</h2>
        <label className="champ">
          Profil LinkedIn <span className="aide">(adresse complète)</span>
          <input
            type="url"
            name="widgetLinkedinUrl"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://www.linkedin.com/…"
            maxLength={300}
          />
        </label>
        <p className="subtitle">Laisser vide conserve le lien LinkedIn d&apos;origine.</p>
        <PreviewFrame label="Aperçu du lien">
          <a
            href={linkedinUrl.trim() || undefined}
            onClick={(e) => e.preventDefault()}
            style={{ color: GOLD, textDecoration: "none", fontWeight: 600, wordBreak: "break-all" }}
          >
            {linkedinUrl.trim() || "Lien LinkedIn d'origine conservé"}
          </a>
        </PreviewFrame>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
        <button type="submit" className="btn principal">
          Enregistrer tous les widgets
        </button>
      </div>
    </form>
  );
}
