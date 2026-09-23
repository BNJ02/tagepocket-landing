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

### Zone DNS — transférée chez Cloudflare le 23/09/2026

`tagepocket.fr` est servi par `nia.ns.cloudflare.com` / `thaddeus.ns.cloudflare.com`.
Zone `be86ff537a1169334bbf8d6753c5949d`, active depuis le 23/09/2026 00:06:59 UTC,
délégation publiée au registre AFNIC à 02:06.

Le domaine reste **acheté et géré chez OVH**, et les deux boîtes mail restent sur
le MX Plan OVH : déplacer le DNS ne transfère pas le domaine et ne déplace pas les
mailboxes. Seuls les enregistrements qui *désignent* ces serveurs ont changé de
zone. Registrar, DNS autoritatif et hébergeur de mail sont trois choses distinctes
— une seule a bougé.

#### La leçon qui a coûté une coupure

**Un custom domain de Worker exige que la zone DNS soit hébergée chez Cloudflare.**
L'API crée elle-même l'enregistrement et échoue sinon, avec
`Can't infer zone from route [code: 10082]` ; `wrangler deploy` affiche
« Trigger configuration was only partially updated » et **ne fait aucun rollback**.
Un custom domain de *Pages* se contente d'un CNAME depuis n'importe quel hébergeur
DNS — c'est cette asymétrie qui a été manquée le 22/09/2026, et elle a mis le site
hors ligne deux heures. Ne jamais détacher un domaine de Pages avant que sa
destination soit prouvée.

#### Ordre suivi pour le transfert

1. **Désactiver DNSSEC chez OVH d'abord.** Un DS était publié au registre `.fr`
   (`33709 8 2 8CB801C8…`). Changer les nameservers sans l'avoir retiré rend le
   domaine totalement irrésolvable pour les résolveurs validants. Attendre sa
   disparition effective chez 1.1.1.1, 8.8.8.8 et 9.9.9.9 avant la suite.
2. Partir de l'**export BIND** de la zone OVH, jamais d'un sondage `dig` : les
   sélecteurs DKIM d'OVH (`ovhmo-selector-1/2._domainkey` → `…jp.dkim.mail.ovh.net`,
   identifiants propres au compte) et le SRV `_autodiscover._tcp` sont indevinables
   de l'extérieur, et leur oubli fait tomber les mails en spam.
3. Vérifier le scan Cloudflare ligne à ligne contre l'export — 14 enregistrements.
4. Seulement ensuite, basculer les nameservers chez OVH.

Contrôle du registre `.fr` : la délégation parente arrive en section **AUTHORITY**,
que `+short` n'affiche pas. Utiliser
`dig +noall +authority tagepocket.fr NS @d.nic.fr`.

#### Corrections passées au même moment

| Enregistrement | Avant (OVH) | Après (Cloudflare) |
|---|---|---|
| SPF et MX du domaine d'envoi Resend | posés sur `send.send.tagepocket.fr` — un niveau de trop, donc **aucun SPF** et bounces SES non routés | posés sur `send` |
| Apex | `A @ → 213.186.33.5` + `TXT @ → 4\|https://www.tagepocket.fr`, mécanisme propriétaire OVH sans certificat — `https://tagepocket.fr` renvoyait `Connection reset` | `AAAA @ → 100::` proxié (prefix discard) + Redirect Rule |
| DNSSEC | géré par OVH | désactivé ; à réactiver depuis Cloudflare, avec un nouveau DS à déclarer chez OVH |

#### Reste à faire

- [ ] **Redirect Rule apex** — phase `http_request_dynamic_redirect`, 301
      `tagepocket.fr` → `https://www.tagepocket.fr` + chemin et query. Sans elle,
      l'`AAAA 100::` renvoie **522** : l'apex est cassé.
- [ ] **Email Obfuscation et Server Side Exclude à `off`** — Scrape Shield réécrit
      les `mailto:` en `/cdn-cgi/l/email-protection` et injecte un script. Le lien
      devient mort sans JavaScript et le HTML servi ne correspond plus au build.
- [ ] **Bascule du Worker** — bloc `routes` dans `wrangler.jsonc`, `workers_dev` à
      `false`, `npm run deploy`. Puis supprimer le projet Pages.
- [ ] **DNSSEC** — réactiver côté Cloudflare, déclarer le nouveau DS chez OVH.

### Déploiement continu — aujourd'hui, par Pages

En attendant la bascule du Worker, la production est servie par le projet **Pages**
`tagepocket-landing`, qui construit le site Astro à chaque push sur `main` depuis
`BNJ02/tagepocket-landing` :

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
reprendre la production. `npm run deploy` le met à jour sans toucher à Pages.

Note : Pages ignore `.assetsignore`, qui est un mécanisme propre aux Workers, et
sert donc `/.assetsignore`. Sans conséquence — le fichier ne contient que des
noms de fichiers — et le problème disparaît à la bascule.
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
