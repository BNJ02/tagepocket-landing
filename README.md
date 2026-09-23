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

Le site était sur **Cloudflare Pages**. Il est servi depuis le 23/09/2026 par
**Workers + Static Assets**, que Cloudflare recommande pour tout nouveau site ;
Pages n'est plus maintenu que pour l'existant. Bénéfice immédiat : toute la
configuration de déploiement est versionnée dans `wrangler.jsonc`, alors que les
réglages Pages ne vivaient que dans le dashboard.

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
| DNSSEC | géré par OVH | signé par Cloudflare, DS `2371 13 2 5D694526…` déclaré chez OVH (onglet **DS Records**, pas le bouton « Délégation sécurisée » qui ne pilote que les zones OVH) |

Réglages de zone durcis : `ssl=strict`, `always_use_https=on`, `min_tls_version=1.2`,
et **`email_obfuscation=off`** — voir plus bas.

#### Scrape Shield réécrit le HTML servi

Cloudflare active **Email Obfuscation** par défaut sur toute zone. Il remplace
`<a href="mailto:…">` par `/cdn-cgi/l/email-protection` et injecte un script de
décodage : l'adresse devient **inaccessible sans JavaScript**, ce qui est un
problème de conformité sur des mentions légales, et le HTML servi ne correspond
plus au build. Désactivé le 23/09/2026.

Le contrôle qui le détecte est un `cmp` entre la page servie et `dist/index.html` :
il doit être vrai à l'octet près. Une simple lecture de la page ne le montre pas.

`server_side_exclude` reste `on` — Cloudflare l'a retiré du dashboard — mais il
n'agit que sur du contenu encadré par `<!--sse-->…<!--/sse-->`, que le site ne
produit pas. Effet nul.

### Déploiement continu

`www.tagepocket.fr` est un **custom domain du Worker** depuis le 23/09/2026. Le
projet Pages n'a plus de domaine.

La bascule a demandé de retirer le domaine du projet Pages **avant** de l'ajouter
au Worker : l'API refuse d'écraser un enregistrement DNS qu'elle n'a pas créé
(`already has externally managed DNS records`, code 100117), et le dashboard ne
propose aucun remplacement. Il y a donc une coupure d'une à deux minutes,
incompressible, à faire en enchaînant les deux gestes.

Attention au piège du formulaire *Connect to tagepocket.fr* : laisser le champ
*Subdomain* vide vise l'**apex**, dont l'`AAAA 100::` porte la redirection. Saisir
`www`.

| Réglage Workers Builds | Valeur |
|---|---|
| Dépôt | `BNJ02/tagepocket-landing`, branche `main` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | racine du dépôt |
| Version de Node | lue dans `.nvmrc` (`22`) |

`npm run deploy` fait la même chose depuis le poste local.
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
