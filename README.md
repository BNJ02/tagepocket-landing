# tagepocket-landing

Site **tagepocket.fr** : vitrine, compte utilisateur et abonnement premium.

Projet **Astro** en `output: 'static'`, servi par **Cloudflare Workers + Static
Assets** → `https://www.tagepocket.fr` (apex `tagepocket.fr` en 301 vers `www`).
Zone DNS chez Cloudflare, domaine et mail chez OVHcloud. Un `push` sur `main`
redéploie automatiquement via Workers Builds.

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

Le projet **Pages** n'est pas supprimé : il garde son dernier artefact connu bon
et sert de retour arrière. Ses déploiements automatiques sont **coupés**
(`deployments_enabled: false`, previews `none`), sinon chaque push déclencherait
deux constructions. Retour arrière : retirer le custom domain du Worker, puis
réattacher `www.tagepocket.fr` au projet Pages — deux minutes. À supprimer une
fois le Worker éprouvé.

## Design system — « La Clairière »

`src/styles/tokens.css` est une **copie annotée et datée** du `:root` de
`~/memora_tage_mage/src/global.css`. L'app fait foi : à chaque divergence, c'est
le site qui est faux. L'ancien `style.css` avait dérivé (`--ink-2` à `#56655d`
contre `#5c7460`, fond à `#f3f6f4` contre `#eef1ea`), d'où la copie explicite
plutôt qu'un import inter-dépôts — qui coupleraient le build d'un projet Expo à
celui d'un projet Astro pour un bénéfice nul.

Quatre familles, un métier par famille. La question au moment de coder est
« qu'est-ce que cet élément fait ? », jamais « quelle couleur je mets ? ».

| Famille | Métier | Piège |
|---|---|---|
| **Menthe** `--accent*` | agit — le CTA, et rien d'autre | `--accent` est une **surface** à 2,2:1. Jamais de texte dessus. Seul `--accent-strong` (6,4:1) est lisible : liens et prix. |
| **Bois** `--bois-*` | porte et sépare | jamais un état, jamais une action. Base des boutons **neutres**. |
| **Eau** `--eau-*` | se remplit | jauges et barres. Jamais un bouton. |
| **Mousse** `--app-bg`, `--ink*` | se tait | aucun gris pur : un `#9e9e9e` a l'air tombé d'une autre application. |

Règle transverse : **500 remplit, 700 écrit**.

Pas de mode sombre, pas de `.theme-blue` : l'app est en
`userInterfaceStyle: light` et les thèmes de « mondes » n'existent que dans
l'app. Régression volontaire, au nom de la cohérence.

`/design` est une **page de contrôle temporaire** — palette, graisses, éléments,
Gaston — en `noindex` et hors sitemap. À supprimer en fin de lot 1.

### Polices

Hanken Grotesk 400/600/800 et JetBrains Mono 600, sous-ensemble latin,
auto-hébergées dans `public/fonts/`. 72 ko au total.

Elles sont **copiées** depuis `@fontsource/*`, dépendance de développement : le
paquet documente la provenance et permet de recopier, mais rien n'en dépend au
build. Pour changer de graisse :

```bash
cp node_modules/@fontsource/hanken-grotesk/files/hanken-grotesk-latin-<poids>-normal.woff2 public/fonts/
```

Pas de Google Fonts : une requête tierce en moins, `font-src 'self'` suffit dans
la CSP de SCRUM-198, et l'exemption cookies reste intacte.

L'app charge huit graisses pour une interface dense ; le site en prend quatre.
Chaque graisse coûte ~14 ko sur le chemin critique. Seule la 400 est préchargée :
c'est celle du premier paragraphe visible.

> `build.inlineStylesheets: 'never'` dans `astro.config.mjs` : sans cela Astro
> intègre les petites feuilles de style dans un `<style>`, ce qui imposerait
> `style-src 'unsafe-inline'` — précisément ce que SCRUM-198 doit éviter.

### Marque

La marque simplifiée « poche + dents » (`src/components/Logo.astro`, SVG inline
de 500 octets) et non le logo complet : sous 48 px, Gaston devient illisible.
Le néon `#2AFFA6` et les incisives blanches sont dessinés pour le fond d'encre
`#02110D` — **la pastille sombre n'est pas une décoration**, c'est ce qui rend
la marque lisible sur fond clair.

> ⚠️ **`public/logo.png` est porteur.** Les **six** templates d'e-mail
> transactionnel de Supabase le référencent en URL absolue
> `https://www.tagepocket.fr/logo.png` (`confirm-signup`, `magic-link`,
> `reset-password`, `password-changed`, `change-email`,
> `email-address-changed`, dans `~/memora_tage_mage/supabase/email-templates/`,
> commit `0e1cf57`). Le déplacer ou le renommer casse l'image de tous les mails
> du compte. Il n'est référencé par aucune page du site.
>
> `public/logo@2x.png` (300 ko) a été **supprimé en SCRUM-197** : il n'était
> référencé nulle part. La convention `@2x` est celle du bundler Metro, qui
> n'existe pas sur le web, et aucun client mail ne va chercher un `@2x` tout
> seul.

Les dérivés ne se retouchent jamais à la main : tout se régénère par
`python3 scripts/gen-brand-assets.py` dans le dépôt de l'app, depuis
`logo-source.png`.

### Navigation

`src/lib/nav.ts` porte les liens de l'en-tête et du pied de page, chacun avec un
drapeau `ready`. Une page pas encore écrite **n'est pas rendue** plutôt que liée
vers un 404 : le socle part en production avant les pages, et un lien mort en
ligne est indexé, cliqué, et donne l'impression d'un site cassé. Passer `ready` à
`true` dans le commit qui livre la page.

`TARIFS_TARGET` applique la même règle au bouton « Commencer l'essai » : il
renvoie à la section `#tarifs` de l'accueil tant que `/tarifs` (SCRUM-209)
n'existe pas, et bascule tout seul le jour où le drapeau passe à `true`.

### Captures d'écran de l'app

`public/screens/*.webp` sont des **captures réelles**, jamais des maquettes.
Procédure, avec l'appareil Android branché en USB (compétence `pixel-check` du
dépôt de l'app) :

```bash
adb exec-out screencap -p > shot.png     # 1080 × 2400
```

Puis rognage et conversion, en Python (ImageMagick n'est pas installé) :

```python
from PIL import Image
# 96 px en haut, 114 px en bas : la barre d'état et la barre de navigation
# appartiennent au système, pas à l'app.
im = Image.open('shot.png').convert('RGB').crop((0, 96, 1080, 2286))
im.resize((560, 1136), Image.LANCZOS).save('public/screens/x.webp', 'WEBP',
                                           quality=82, method=6)
```

560 px de large pour un affichage à 280 px, soit le rendu 2×. `Phone.astro`
calcule `height` à partir de ce ratio : les attributs `width`/`height` du `<img>`
réservent la place avant le chargement, sinon la page saute.

> ⚠️ **Le compte de test est presque vide** (0 jour de série, score estimé à
> 26/600, 21 % de précision). Les écrans Stats et Profil ne sont donc pas
> publiables tels quels sur une page qui vend l'app. Les quatre captures
> retenues n'affichent aucun chiffre qui dessert : Parcours, question,
> correction, révisions. Pour montrer les Stats, il faut d'abord un compte de
> démonstration crédible.

### Référencement et partage

`Base.astro` pose sur chaque page l'URL canonique, les balises Open Graph et
`twitter:card`. Quatre points valent d'être retenus :

- **L'URL canonique retire l'extension.** `build.format: 'file'` fait que
  `Astro.url.pathname` vaut `/support.html`, alors que Workers sert la page à
  `/support` et que le sitemap liste `/support`. Sans le nettoyage, la balise
  canonique et le sitemap se contrediraient, et le moteur choisirait seul.
- **`og:image` doit être absolue.** Les robots de LinkedIn, WhatsApp ou Slack
  lisent le HTML hors de tout contexte de navigation et ne résolvent aucun
  chemin relatif.
- **`public/og.png` se régénère**, jamais à la main :

  ```bash
  python3 scripts/gen-og.py     # 1200 × 630, ~134 ko
  ```

  Le script lit deux fichiers **hors de ce dépôt**, dans `~/memora_tage_mage` :
  le Gaston détouré `assets/brand/logo-cutout.png` et les `.ttf` Hanken Grotesk
  de `node_modules/@expo-google-fonts/`. Les `.woff2` de `public/fonts/` ne
  conviennent pas : Pillow ne sait pas les lire, et il n'y a ici ni fontTools ni
  moteur de rendu SVG. L'image produite **est versionnée**, parce que Workers
  Builds construit le site sans accès au dépôt de l'app. Elle est ramenée à 256
  couleurs : WhatsApp ignore une vignette de plus de 300 ko.
- **Le JSON-LD de l'accueil est en ligne, et c'est inévitable** : Google ne lit
  pas une donnée structurée chargée par `<link rel="alternate">`. La CSP de
  SCRUM-198 devra donc porter son empreinte, que
  `node scripts/csp-hashes.mjs` calcule sur le `dist/` construit. La fiche ne
  porte **aucune note** : sans application publiée, un `aggregateRating`
  inventé est un faux, sanctionné par une action manuelle.

### Redirections

`public/_redirects` traduit les quatre URL de l'ancien site en **301**.
`html_handling: "auto-trailing-slash"` fait déjà la normalisation, mais en
**307**, c'est-à-dire temporaire : les moteurs garderaient l'ancienne URL dans
leur index sans lui transférer d'autorité. `/confidentialite.html` est en outre
déclarée dans les fiches App Store et Google Play, donc la redirection est une
obligation, pas une propreté.

Cloudflare applique ces règles « regardless of whether or not an asset matches
the incoming request » : elles priment donc sur le 307 automatique, bien que
`dist/support.html` existe réellement.

## Arborescence

| Chemin | Rôle |
|---|---|
| `src/pages/` | routes (`index`, `support`, `confidentialite`, `mentions-legales`, `404`, `connexion`, `auth/callback`, `compte`) |
| `src/layouts/` | `Base.astro` (head, polices, en-tête, pied de page), `Legal.astro` (pages de texte long), `Auth.astro` (connexion, `noindex`), `Account.astro` (squelette de /compte) |
| `src/components/` | `Logo`, `Header`, `Footer`, `Phone`, `Faq` |
| `src/styles/` | design system « La Clairière » |
| `src/lib/` | `nav.ts` (liens), `offre.ts` (prix), `supabase.ts` (client), `auth.ts` (messages, `?next=`), `guard.ts`, `abonnement.ts`, `session-cle.ts` |
| `public/fonts/` | Hanken Grotesk et JetBrains Mono, `.woff2` latin |
| `public/brand/` | favicon, icônes, les quatre Gaston |
| `public/screens/` | captures réelles de l'app, rognées et converties en WebP |
| `public/` | servi verbatim : `robots.txt`, `_redirects`, `_headers`, `og.png`, `favicon.svg`, `logo.png` |
| `scripts/` | `gen-og.py` (vignette de partage), `csp-hashes.mjs` (empreintes pour la CSP) |
| `public/.well-known/` | universal links (AASA + assetlinks) — SCRUM-217 |
| `public/.assetsignore` | fichiers de `dist/` à ne pas publier |
| `wrangler.jsonc` | configuration de déploiement Cloudflare Workers |

Il ne reste plus un seul `.html` dans `public/` : l'accueil est parti en
**SCRUM-196**, les trois dernières pages en **SCRUM-197**, toutes au tutoiement.
`public/style.css` est parti avec elles, ainsi que `public/logo@2x.png`.

## Sécurité

Une seule clé entre dans le bundle : la clé **publishable** de Supabase
(`sb_publishable_…`), écrite en dur dans `src/lib/supabase.ts`. Elle est
publique par conception et n'ouvre que ce que la RLS accorde au rôle `anon`.
**Aucune clé Stripe ni `service_role` ici** : toute la logique de paiement vit
dans les Edge Functions Supabase de `~/memora_tage_mage/supabase/functions/`.
Contrôle avant chaque mise en production :

```bash
grep -rlE "service_role|sk_live_|sk_test_|whsec_" dist/ && echo "FUITE" || echo ok
```

### Authentification (SCRUM-202)

Même projet Supabase que l'app : un compte créé ici ouvre l'app, et
inversement. Les flux sont ceux de l'app (`src/app/auth.tsx`) : connexion,
inscription, code de connexion, mot de passe oublié par code à 6 chiffres.

- **Flux implicite, pas PKCE** : le lien de confirmation doit marcher sur un
  autre appareil que celui de l'inscription.
- **Le site n'écrit jamais dans `user_state`.** Le pseudo s'y trouve, mais
  c'est un blob que l'app réécrit en Last-Write-Wins : l'app le demande au
  premier lancement.
- **Aucune réponse ne dit si une adresse a un compte** (inscription, code,
  réinitialisation) : GoTrue s'en garde, le site ne défait pas cette protection.
- **Redirect URLs Supabase** : `https://www.tagepocket.fr/auth/callback` et
  `http://localhost:8788/auth/callback` doivent y figurer, à côté de
  `memora://auth-callback`. Sans elles, GoTrue ignore l'adresse de retour du site
  et renvoie vers la Site URL.
- **Déconnexion locale** (`signOut({ scope: 'local' })`) : sans argument,
  Supabase révoque TOUTES les sessions du compte, et l'app serait déconnectée
  à son prochain rafraîchissement de jeton.
- **`/compte` (SCRUM-203)** : coquille publique, données chargées après la
  garde par des requêtes RLS. La garde (`src/lib/guard.ts`) est de l'UX, pas de
  la sécurité. L'état affiché (`src/lib/abonnement.ts`, testé par `npm test`)
  s'incline devant `is_premium()` en cas de désaccord.
- Tester en local avec `npx wrangler dev --port 8788` plutôt que
  `astro preview` : seul Wrangler applique `_headers`, donc la CSP.

### Où vit la facturation

Rien de tout cela n'est dans ce dépôt, et ce n'est pas un oubli : le site ne
fait que **lire** un booléen. Les sources sont dans `~/memora_tage_mage` et ne
sont pas dupliquées ici.

| Fichier (dépôt de l'app) | Rôle |
|---|---|
| `supabase/schema-billing.sql` | tables `subscriptions`, `billing_customers`, `stripe_events`, RLS, `is_premium()` |
| `supabase/schema-billing-rollback.sql` | retour arrière de la migration |
| `supabase/verify-billing-rls.sh` | tests négatifs de la RLS, avec de vrais jetons |
| `supabase/functions/` | Edge Functions Stripe (lot 4) |

Ce que le site appelle : `POST /rest/v1/rpc/is_premium` avec le JWT de
l'utilisateur. La fonction ne renvoie qu'un booléen, et seulement sur le compte
appelant. La variante `is_premium(uuid)` existe mais n'est accordée qu'au
`service_role` : accordée au client, elle laisserait sonder l'abonnement d'un
tiers à partir d'un simple identifiant.

### En-têtes — `public/_headers`

HSTS, `nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` et
une CSP **sans `'unsafe-inline'`**, ni pour les scripts ni pour les styles.

Trois réglages du projet n'existent que pour rendre cette CSP tenable, et les
défaire la casse :

| Réglage | Sans lui |
|---|---|
| `build.inlineStylesheets: 'never'` | Astro écrit un `<style>` dans le HTML |
| `vite.build.assetsInlineLimit: 0` | Astro écrit un `<script type="module">` dans le HTML |
| Aucun attribut `style=` dans le HTML | bloqué par `style-src`, via `style-src-attr` |

Ce dernier point est la raison d'être d'une bizarrerie de `Logo.astro` : sa
prop `size` n'accepte qu'un jeu **fermé** de valeurs, chacune doublée d'une
règle dans sa feuille de style, là où un `style="--mark-size: 30px"` aurait
suffi. `Phone.astro` a perdu son `--w` de la même façon, en laissant l'attribut
`width` de l'image dimensionner le cadre.

> ⚠️ **La panne silencieuse à surveiller.** La CSP autorise nommément le seul
> script en ligne du site, le JSON-LD de l'accueil, par son empreinte sha256.
> Modifier ce bloc d'un seul octet invalide l'empreinte, et la donnée
> structurée disparaît **sans que rien ne casse à l'écran**. Après toute
> modification de `FICHE` dans `index.astro` :
>
> ```bash
> npm run build && node scripts/csp-hashes.mjs
> ```
>
> puis reporter la valeur dans `public/_headers`.

Le jeton `preload` de HSTS ne fait rien par lui-même : il déclare seulement que
le site est candidat à la liste de préchargement des navigateurs.
**L'inscription sur hstspreload.org n'a pas été faite**, et elle ne doit pas
l'être à la légère : en sortir prend des mois.

### Cache

Workers sert tout en `public, max-age=0, must-revalidate` par défaut. Les pages
HTML gardent ce réglage, qui leur convient. Les fichiers dont le nom porte une
empreinte de contenu (`/_astro/*`) passent à un an en `immutable`. Les polices
aussi, ce qui impose une discipline : **ne jamais remplacer le contenu d'un
`.woff2` sans changer son nom**, sous peine de le laisser figé un an dans les
navigateurs.

## À compléter

- Identité de l'éditeur dans `mentions-legales.astro` et
  `confidentialite.astro` (marqueurs `[À COMPLÉTER]`, rendus en rouge par
  `Legal.astro` pour qu'ils sautent aux yeux) — SCRUM-213 et SCRUM-214.
- `_headers` devra servir `apple-app-site-association` en `application/json`
  sans extension ni redirection, au moment de la soumission aux stores
  (SCRUM-219).
- Fichiers `.well-known/` une fois les identifiants de build disponibles.
