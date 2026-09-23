// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Site 100 % statique servi par Workers Static Assets, construit par Workers
// Builds à chaque push sur `main`. Pas d'adaptateur : aucune route serveur ici.
// Toute la logique qui a besoin d'un secret (Stripe, service_role) vit dans les
// Edge Functions Supabase de ~/memora_tage_mage/supabase/functions/ — voir
// l'epic SCRUM-192.
export default defineConfig({
  // Obligatoire pour le sitemap et les URLs canoniques. L'apex redirige en 301
  // vers www : c'est bien `www` la forme canonique.
  site: 'https://www.tagepocket.fr',
  output: 'static',
  trailingSlash: 'never',
  integrations: [
    // Ne recense que les pages générées par Astro. Les .html encore présents
    // dans public/ en sortiront au fil de leur portage (SCRUM-197).
    sitemap({
      filter: (page) => !['/compte', '/design'].some((p) => page.includes(p)),
    }),
  ],
  build: {
    // `/support` plutôt que `/support/index.html` : aligne les URLs produites
    // sur celles du site actuel, que les redirections de SCRUM-197 conservent.
    format: 'file',

    // Astro intègre par défaut les petites feuilles de style directement dans
    // un <style> du HTML. C'est plus rapide d'une requête, mais ça impose
    // `style-src 'unsafe-inline'` dans la CSP — exactement ce que SCRUM-198
    // doit éviter. On force le fichier externe, mis en cache par Cloudflare et
    // partagé entre les pages.
    inlineStylesheets: 'never',
  },
});
