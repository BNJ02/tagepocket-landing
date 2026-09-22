# tagepocket-landing

Site **tagepocket.fr** : vitrine, compte utilisateur et abonnement premium.

Projet **Astro** en `output: 'static'`, déployé sur **Cloudflare Pages** →
`https://www.tagepocket.fr` (apex `tagepocket.fr` en 301 vers `www`).
Zone DNS chez OVHcloud. Un `push` sur `main` redéploie automatiquement.

Chantier suivi dans l'epic Jira **SCRUM-192**.

## Développement

```bash
nvm use            # lit .nvmrc → Node 22
npm install
npm run dev        # http://localhost:4321 — serveur Astro
npm run build      # → dist/
npm run preview    # sert dist/ (Astro)
npx wrangler dev   # sert dist/ via le runtime Workers — routage réel
npm run check      # astro check (TypeScript strict)
npm run deploy     # build + wrangler deploy
```

`npm run preview` sert les fichiers ; `wrangler dev` reproduit en plus le
routage Cloudflare (URLs sans `.html`, page 404). Vérifier une modification de
routage avec `wrangler dev`, pas avec `preview`.

**Node ≥ 22.12 obligatoire** (Astro 7). Le dépôt de l'app mobile est figé en
Node 20 pour Expo : toujours `nvm use` en entrant ici.

## Hébergement — Workers Static Assets

Le site était sur **Cloudflare Pages**. Il passe sur **Workers + Static Assets**,
que Cloudflare recommande pour tout nouveau site ; Pages n'est plus maintenu que
pour l'existant. Bénéfice immédiat : toute la configuration de déploiement est
versionnée dans `wrangler.jsonc`, alors que les réglages Pages ne vivaient que
dans le dashboard.

Le routage est déclaré dans `wrangler.jsonc` :

| Réglage | Valeur | Effet |
|---|---|---|
| `assets.directory` | `./dist/` | remplace le « build output directory » de Pages |
| `assets.not_found_handling` | `404-page` | sert `dist/404.html` en statut 404 |
| `assets.html_handling` | `auto-trailing-slash` | `/support` sert `support.html`, et `/support.html` redirige vers `/support` |

`public/.assetsignore` empêche la publication de `_headers`, `_redirects` et des
`.gitkeep` : Cloudflare lit les deux premiers au déploiement, ils ne doivent pas
être téléchargeables.

> Les redirections automatiques `.html` → URL propre sont des **307**. Les URLs
> historiques du site sont en `.html` : SCRUM-197 doit poser des **301**
> explicites dans `public/_redirects` pour consolider le référencement.

### Bascule du domaine (à faire une seule fois)

1. `npx wrangler login`
2. `npm run deploy` → le Worker sort sur `*.workers.dev`, vérifier le site.
3. Dashboard → **Pages** → projet → **Custom domains** → détacher
   `www.tagepocket.fr`. Obligatoire **avant** l'étape 4 : un hostname ne peut pas
   être attaché à deux projets, `wrangler deploy` échouerait.
4. Décommenter le bloc `routes` de `wrangler.jsonc`, passer `workers_dev` à
   `false`, puis `npm run deploy`.
5. Vérifier `https://www.tagepocket.fr`, puis supprimer le projet Pages.

### Déploiement continu

Dashboard → **Workers** → `tagepocket-landing` → **Settings** → **Builds** →
connecter le dépôt GitHub `BNJ02/tagepocket-landing`, branche `main`,
commande `npm run build`, commande de déploiement `npx wrangler deploy`.
Variable d'environnement de build `NODE_VERSION` = `22` (le `.nvmrc` devrait
suffire, c'est une ceinture de sécurité).

## Arborescence

| Chemin | Rôle |
|---|---|
| `src/pages/` | routes (`404.astro` pour l'instant) |
| `src/layouts/` | mises en page communes — SCRUM-196 |
| `src/components/` | composants `.astro` — SCRUM-196 |
| `src/styles/` | design system « La Clairière » — SCRUM-195 |
| `src/lib/` | client Supabase, appels de facturation, garde de session — lots 2 et 4 |
| `public/` | servi verbatim ; contient encore les 4 pages HTML héritées |
| `public/.well-known/` | universal links (AASA + assetlinks) — SCRUM-217 |
| `public/.assetsignore` | fichiers de `dist/` à ne pas publier |
| `wrangler.jsonc` | configuration de déploiement Cloudflare Workers |

Les pages `index.html`, `confidentialite.html`, `support.html` et
`mentions-legales.html` restent des fichiers statiques dans `public/` : elles
sont portées en `.astro` par **SCRUM-196** (landing) et **SCRUM-197**
(pages légales, redirections, SEO). Le site reste donc servi à l'identique
pendant toute la refonte.

## Sécurité

Seules des variables `PUBLIC_*` ont le droit d'entrer dans le bundle
(`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`). **Aucune clé Stripe ni
`service_role` ici** : toute la logique de paiement vit dans les Edge Functions
Supabase de `~/memora_tage_mage/supabase/functions/`.

## À compléter

- Identité de l'éditeur dans `mentions-legales.html` et `confidentialite.html`
  (marqueurs `[À COMPLÉTER]`) — SCRUM-213 et SCRUM-214.
- Fichiers `.well-known/` une fois les identifiants de build disponibles.
