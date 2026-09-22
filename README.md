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

### Bascule du domaine — bloquée, et pourquoi

**Un custom domain de Worker exige que la zone DNS soit hébergée chez
Cloudflare.** L'API crée elle-même l'enregistrement et échoue sinon, avec
`Can't infer zone from route [code: 10082]`. Un custom domain de *Pages* se
contentait d'un CNAME depuis n'importe quel hébergeur DNS : c'est la différence
qui a été manquée lors de la première tentative de bascule, et elle a mis le
site hors ligne le 22/09/2026.

`tagepocket.fr` est délégué à OVHcloud (`ns106.ovh.net`) et le compte Cloudflare
ne contient aucune zone. Tant que ce n'est pas le cas, pas de bloc `routes` dans
`wrangler.jsonc`, et le Worker n'est joignable que sur `*.workers.dev`.

Le domaine reste acheté et géré chez OVH : déplacer le DNS ne transfère pas le
domaine et ne déplace pas les boîtes mail, qui restent sur le MX Plan OVH. Seuls
les enregistrements qui *désignent* ces serveurs changent de zone.

#### Ordre impératif du transfert

1. **Désactiver DNSSEC chez OVH d'abord.** Un DS est publié au registre `.fr`.
   Changer les nameservers sans retirer ce DS rend le domaine totalement
   irrésolvable pour les résolveurs validants. Le retrait prend quelques heures.
2. Exporter la zone OVH (format BIND) et créer la zone chez Cloudflare, en
   vérifiant le scan enregistrement par enregistrement contre cet export. Un
   sondage DNS depuis l'extérieur ne suffit pas : il ne peut pas deviner les
   sélecteurs DKIM d'OVH (`ovhmoXXXXX-selector1._domainkey`), dont l'oubli fait
   tomber les mails en spam.
3. Vérifier en particulier les 4 MX `mx0..mx3.mail.ovh.net` (priorités 1, 5, 50,
   100), le SPF `v=spf1 include:mx.ovh.com ~all` et le `_dmarc`. Ils portent
   `contact@` et `support@tagepocket.fr`.
4. Seulement ensuite, basculer les nameservers chez OVH.
5. Zone active → ajouter le bloc `routes` dans `wrangler.jsonc`, passer
   `workers_dev` à `false`, `npm run deploy`.

#### À recréer, sans équivalent automatique

| Ancien mécanisme OVH | Remplacement Cloudflare |
|---|---|
| `A @ → 213.186.33.5` + `TXT @ → 4\|https://www.tagepocket.fr` — redirection apex propriétaire | Redirect Rule 301 `tagepocket.fr/*` → `https://www.tagepocket.fr/$1` |
| `CNAME www → tagepocket-landing.pages.dev` | custom domain du Worker |
| DNSSEC géré par OVH | DNSSEC Cloudflare, avec un nouveau DS à déclarer côté registrar |

### Déploiement continu — aujourd'hui, par Pages

Tant que la zone DNS n'est pas chez Cloudflare, la production est servie par le
projet **Pages** `tagepocket-landing`, qui construit le site Astro à chaque push
sur `main` depuis `BNJ02/tagepocket-landing` :

| Réglage | Valeur |
|---|---|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | racine du dépôt |
| `NODE_VERSION` (production et preview) | `22` |
| Build caching | activé |

Ces réglages ont été posés le 22/09/2026. **Avant cela, la commande de build
était vide** : un push aurait déployé la racine du dépôt, où `index.html` n'est
plus depuis son passage dans `public/`, et cassé le site.

Le Worker reste déployé en parallèle sur son sous-domaine `workers.dev`, prêt à
reprendre la production dès que la zone sera transférée. `npm run deploy` le met
à jour sans toucher à Pages.

Note : Pages ignore `.assetsignore`, qui est un mécanisme propre aux Workers, et
sert donc `/.assetsignore`. Sans conséquence — le fichier ne contient que des
noms de fichiers — et le problème disparaît à la migration.

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
