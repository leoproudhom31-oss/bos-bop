# BOS & BOP — www.bos-bop.fr

Migration du site Joomla 3 vers une application web moderne, **visuellement
identique à l'original**, avec panneau d'administration, générateur de pages
et prémisses e-commerce pour la vente des livres.

## En bref

| | |
|---|---|
| Framework | [Next.js 15](https://nextjs.org/) (App Router) + React 19 + TypeScript |
| Base de données | SQLite via [Prisma](https://www.prisma.io/) (fichier unique, sauvegarde = copie) |
| Authentification | Session JWT (cookie httpOnly), mots de passe hachés bcrypt |
| Rendu public | HTML historique reproduit **à l'octet près** à partir de gabarits extraits du dump Joomla |
| Administration | `/admin` — pages, menu, messages, livres, commandes, réglages |

## Fidélité visuelle : comment c'est garanti

Le site public n'est **pas** une réécriture du design : chaque page est
assemblée à partir des gabarits HTML/CSS/JS d'origine (dossier `templates/`
et `content/`), extraits mécaniquement du dump Joomla (`legacy/`) par
`scripts/extract-legacy.mjs`. Ce script **vérifie octet par octet** que le
ré-assemblage reproduit les pages d'origine :

```
npm run extract:legacy
# ✔ index.html : identique (46090 octets)
# ✔ bilan-…    : identique (44848 octets)
# … (6 pages sur 6)
```

Seuls sont neutralisés des artefacts injectés par JavaScript au moment de la
capture du dump (widget Facebook, badge reCAPTCHA, menu déroulant select2 —
ils sont régénérés au chargement, comme sur le site d'origine). Une
comparaison de captures d'écran ancien/nouveau donne **0,00 % de pixels
différents** sur toutes les pages.

Les feuilles de style, scripts et images du template Joomla `juillet2019`
sont servis tels quels depuis `public/assets/`.

## Démarrage

```bash
cp .env.example .env      # puis éditer SESSION_SECRET, ADMIN_PASSWORD…
npm install
npx prisma db push        # crée la base SQLite
npm run db:seed           # importe les pages du site + compte admin
npm run dev               # http://localhost:3000
```

Compte administrateur par défaut (défini dans `.env` **avant** le seed) :
`admin@bos-bop.fr` / `admin` — **à changer immédiatement** (Réglages → Mot de
passe).

### Production

```bash
npm run build
npm start                 # ou pm2 start npm -- start
```

À prévoir sur le serveur :

- `SESSION_SECRET` : longue chaîne aléatoire (`openssl rand -hex 32`) ;
- persistance de `prisma/*.db` (la base) et `public/uploads/` (images
  téléversées) — sur un VPS classique c'est automatique, sur un hébergeur
  « serverless » il faudrait déplacer ces deux éléments ;
- reprise du favicon : la balise d'origine pointe vers
  `https://www.bos-bop.fr/templates/juillet2019/images/designer/…Fichier1.png` ;
  copier ce fichier du site actuel avant la bascule DNS (même chemin) ou
  adapter la balise dans `content/heads/*.html` puis relancer le seed.

### Reprise du référencement

Les URL historiques sont conservées (`/bilan-orientation-scolaire-professionnel-toulouse`,
etc.) et les anciennes variantes Joomla (`….html`, `index.php`, `page.html`)
sont redirigées en 301 — voir `next.config.ts`.

## Administration (`/admin`)

- **Pages** : modification des pages existantes (SEO + contenu), création de
  nouvelles pages avec l'habillage complet du site — voir le *constructeur
  visuel* ci-dessous.
- **Bannière d'accueil** : titre et image de fond du grand bandeau.
- **Menu du site** : ordre, libellés, ajout d'entrées (pages ou URL libres).
- **Messages** : le formulaire de contact d'origine enregistre désormais les
  demandes en base (plus de dépendance au composant Joomla) ; consultation,
  lu/non-lu, réponse par email en un clic.
- **Livres** : catalogue (titre, auteur, prix, stock, couverture, description).
- **Commandes** : suivi (Nouvelle → Confirmée → Expédiée / Annulée).
- **Réglages** : URL publique, activation de la boutique, mot de passe.

## Constructeur de pages visuel (« à la Wix »)

Les pages sont éditées dans un **constructeur visuel** avec **aperçu en direct** :
l'écran est scindé en deux, l'éditeur de blocs à gauche et le rendu réel du
site à droite (dans une iframe), mis à jour à chaque modification. L'aperçu
utilise exactement le même moteur de rendu que la publication : ce que vous
voyez est ce qui sera publié.

- **Blocs disponibles** : bannière (hero), titre + texte, appel à l'action,
  bouton, image, image + texte, colonnes (2/3/4), cartes colorées (style
  « méthode 360° »), espacement, séparateur, et HTML avancé. Chaque bloc est
  compilé vers le balisage du template d'origine (mêmes polices, couleurs,
  cartes, boutons) : le résultat reste cohérent avec le reste du site.
- **Manipulation** : ajout via une palette, réorganisation par glisser-déposer
  (ou flèches ↑/↓), duplication, suppression — sans écrire de HTML.
- **Modèles de démarrage** : à la création, choisissez un modèle (Page vierge,
  Présentation, Prestation, Page d'atterrissage) pré-rempli de blocs.
- **Images** : téléversées directement depuis les blocs (dans `public/uploads/`).
- **Édition des pages existantes** : chaque page du site d'origine peut être
  ouverte dans le constructeur (bouton « Ouvrir dans le constructeur visuel »).
  Son contenu historique est **préservé à l'identique** dans un bloc « HTML
  avancé » — le rendu publié ne change pas tant que rien n'est modifié — et
  l'on peut ajouter des blocs visuels autour. Un retour au « HTML brut » reste
  possible pour un contrôle fin du code.

Techniquement : les blocs sont stockés en JSON (`Page.blocksJson`) et compilés
côté serveur (`src/lib/blocks.ts`) ; l'aperçu passe par `POST /api/admin/preview`
qui réutilise le pipeline de rendu réel (`renderPreview`).

## Boutique (prémisses e-commerce)

Désactivée par défaut : le site reste alors strictement identique à
l'original. Une fois activée (Réglages) :

- `/livres` : catalogue des ouvrages publiés, `/livres/{slug}` : fiche ;
- `/panier` puis `/commande` : panier (cookie) et prise de commande sans
  paiement en ligne — la commande est enregistrée et le client est recontacté ;
- pensez à ajouter une entrée « Les livres » → `/livres` dans le menu.

Le paiement en ligne (Stripe…) pourra se brancher dans
`src/app/api/checkout/route.ts` (point d'entrée commenté).

## Structure du dépôt

```
legacy/            dump du site Joomla d'origine (référence, non servi)
templates/         gabarits communs extraits (header, footer, <head>…)
content/           contenu par page extrait (utilisé par le seed)
scripts/           extract-legacy.mjs : extraction + vérification octet à octet
prisma/            schéma, seed, base SQLite
public/assets/     CSS/JS/images du template Joomla, servis à l'identique
public/uploads/    fichiers téléversés depuis l'administration
src/app/           routes : pages publiques (route handlers), /admin, /api
src/lib/           rendu, blocs, panier, auth, actions d'administration
src/components/    composants React de l'administration
```

## Notes techniques

- Les pages publiques sont servies par des *route handlers* qui renvoient le
  HTML assemblé tel quel : aucune hydratation React côté public, donc aucun
  risque de divergence visuelle.
- Deux scripts Google Analytics du dump n'étaient pas archivés ; des stubs
  vides les remplacent (`public/assets/js/44da…_js.js`, `9673…_js.js`).
  L'identifiant `UA-143935594-1` (Universal Analytics) est de toute façon
  obsolète — prévoir une migration GA4 si le suivi est souhaité.
- Le reCAPTCHA du formulaire de contact garde la clé du site d'origine
  (domaine bos-bop.fr). Le serveur enregistre les messages sans vérification
  côté serveur pour l'instant ; brancher la vérification dans
  `src/app/api/contact/route.ts` si du spam apparaît.
