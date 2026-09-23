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
    // Ne recense que les pages générées par Astro. Les pages `noindex` en sont
    // exclues : un sitemap qui liste une page tout en lui interdisant l'index
    // est une contradiction que la Search Console remonte en erreur.
    // Tenir cette liste alignée sur les pages qui passent `noindex` à Base.astro
    // (gabarit Auth.astro, /compte/*, 404).
    sitemap({
      filter: (page) => {
        const { pathname } = new URL(page);
        return !['/compte', '/connexion', '/auth/'].some((p) => pathname.startsWith(p));
      },
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
  vite: {
    build: {
      // Même raison, côté scripts : en dessous de 4 ko, Astro écrit le module
      // directement dans un <script> du HTML, ce qui imposerait
      // `script-src 'unsafe-inline'`. À 0, tout part en fichier externe.
      assetsInlineLimit: 0,
    },
  },
});
