/**
 * Empreintes sha256 des scripts EN LIGNE du site construit (SCRUM-198).
 *
 *     npm run build && node scripts/csp-hashes.mjs
 *
 * La CSP visée n'accorde pas `script-src 'unsafe-inline'` : toute la
 * configuration du projet y tend (`build.inlineStylesheets: 'never'`,
 * `vite.build.assetsInlineLimit: 0`). Il reste pourtant un bloc qu'on ne peut
 * pas sortir du HTML : le JSON-LD de la page d'accueil, que Google ne lit que
 * s'il est en ligne. La seule façon de l'autoriser sans rouvrir la porte à tous
 * les scripts en ligne est de nommer son empreinte.
 *
 * L'empreinte change à chaque modification du bloc, fût-ce d'un espace. Sans ce
 * script il faudrait la recopier à la main depuis un message d'erreur de la
 * console, ce qui se fait une fois et s'oublie la suivante : la donnée
 * structurée disparaît alors en silence, sans que rien ne casse à l'écran.
 *
 * Ce script ne modifie rien. Il imprime ce qu'il faut coller dans `_headers`.
 */

import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;

/** Tous les .html de dist/, récursivement. */
async function pages(dossier) {
  const entrees = await readdir(dossier, { withFileTypes: true });
  const out = [];
  for (const e of entrees) {
    const chemin = join(dossier, e.name);
    if (e.isDirectory()) out.push(...(await pages(chemin)));
    else if (e.name.endsWith('.html')) out.push(chemin);
  }
  return out;
}

/* Le contenu haché est celui qui se trouve ENTRE les balises, octet pour
   octet : ni la balise ouvrante, ni ses attributs, ni un espace ajouté. Un
   script avec un attribut `src` est externe et ne se hache pas. */
const EN_LIGNE = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g;

const trouvees = new Map();

for (const page of await pages(DIST)) {
  const html = await readFile(page, 'utf8');
  for (const [, corps] of html.matchAll(EN_LIGNE)) {
    if (corps.trim() === '') continue;
    const empreinte = `'sha256-${createHash('sha256').update(corps, 'utf8').digest('base64')}'`;
    const ou = trouvees.get(empreinte) ?? [];
    ou.push(relative(DIST, page));
    trouvees.set(empreinte, ou);
  }
}

if (trouvees.size === 0) {
  console.log('Aucun script en ligne. `script-src \'self\'` suffit.');
} else {
  for (const [empreinte, ou] of trouvees) console.log(`${empreinte}  ← ${ou.join(', ')}`);
  console.log(`\nscript-src 'self' ${[...trouvees.keys()].join(' ')}`);
}
