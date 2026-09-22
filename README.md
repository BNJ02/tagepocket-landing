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
npm run dev        # http://localhost:4321
npm run build      # → dist/
npm run preview    # sert dist/
npm run check      # astro check (TypeScript strict)
```

**Node ≥ 22.12 obligatoire** (Astro 7). Le dépôt de l'app mobile est figé en
Node 20 pour Expo : toujours `nvm use` en entrant ici.

## Réglages de build Cloudflare Pages

| Réglage | Valeur |
|---|---|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Variable d'environnement | `NODE_VERSION` = `22` |

Le `.nvmrc` suffit en principe, `NODE_VERSION` est une ceinture de sécurité.

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
