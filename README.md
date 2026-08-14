# tagepocket-landing

Site vitrine statique de **TagePocket** (application de préparation au TAGE MAGE).

Déployé sur **Cloudflare Pages** → `https://www.tagepocket.fr` (apex `tagepocket.fr`
en redirection 301 vers `www`). Zone DNS chez OVHcloud.

## Contenu

| Page | Rôle |
|---|---|
| `index.html` | accueil / présentation |
| `confidentialite.html` | politique de confidentialité (RGPD) — **exigée par Google Play & App Store** |
| `support.html` | contact support + FAQ |
| `mentions-legales.html` | éditeur, hébergeur, contact |
| `style.css` | feuille de style commune (couleurs reprises de l'app) |
| `.well-known/` | universal links (AASA + assetlinks) — **à compléter au build** (Team ID Apple, package Android, SHA-256) |

Site 100 % statique, aucune dépendance ni build. Un `push` sur `main` redéploie
automatiquement via l'intégration Git de Cloudflare Pages.

## À compléter

- Identité de l'éditeur dans `mentions-legales.html` et `confidentialite.html`
  (marqueurs `[À COMPLÉTER]`) — voir le ticket RGPD.
- Fichiers `.well-known/` une fois les identifiants de build disponibles.
