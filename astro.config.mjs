// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Site 100 % statique déployé sur Cloudflare Pages (intégration Git, push sur
// `main`). Pas d'adaptateur : aucune route serveur ici. Toute la logique qui a
// besoin d'un secret (Stripe, service_role) vit dans les Edge Functions Supabase
// de ~/memora_tage_mage/supabase/functions/ — voir l'epic SCRUM-192.
export default defineConfig({
  // Obligatoire pour le sitemap et les URLs canoniques. L'apex redirige en 301
  // vers www : c'est bien `www` la forme canonique.
  site: 'https://www.tagepocket.fr',
  output: 'static',
  trailingSlash: 'never',
  integrations: [
    // Ne recense que les pages générées par Astro. Les .html encore présents
    // dans public/ en sortiront au fil de leur portage (SCRUM-197).
    sitemap({ filter: (page) => !page.includes('/compte') }),
  ],
  build: {
    // `/support` plutôt que `/support/index.html` : aligne les URLs produites
    // sur celles du site actuel, que les redirections de SCRUM-197 conservent.
    format: 'file',
  },
});
