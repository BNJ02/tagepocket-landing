/**
 * Garde des pages /compte/* (SCRUM-203).
 *
 * ⚠️ CETTE GARDE EST DE L'UX, PAS DE LA SÉCURITÉ.
 *
 * Elle évite à un visiteur non connecté de regarder un squelette vide, et le
 * renvoie vers /connexion. Elle ne protège RIEN : le HTML de /compte est
 * public, identique pour tout le monde, et ne contient aucune donnée. N'importe
 * qui peut désactiver ce script, ou lire le fichier avec curl — il n'y
 * trouvera qu'une coquille.
 *
 * La confidentialité tient entièrement à la RLS de Supabase : les données
 * arrivent APRÈS, par des requêtes portant le JWT de l'utilisateur, et la base
 * ne renvoie que ses propres lignes (policy « subscriptions owner select »,
 * vérifiée avec de vrais jetons par `verify-billing-rls.sh`). C'est pour cela
 * que le site n'a pas besoin de rendu serveur.
 *
 * Conséquence pratique : ne JAMAIS écrire une donnée personnelle en dur dans
 * le HTML d'une page /compte, en comptant sur cette garde pour la cacher.
 */
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

/** Envoie vers /connexion, avec retour prévu sur la page courante. */
export function versConnexion(): void {
  const ici = window.location.pathname + window.location.search;
  window.location.replace(`/connexion?next=${encodeURIComponent(ici)}`);
}

/**
 * Session courante, ou redirection vers /connexion.
 *
 * `getSession` lit le localStorage et rafraîchit le jeton s'il a expiré ; il
 * ne demande PAS au serveur si la session a été révoquée entre-temps. Ce cas
 * se voit à la première requête (401) : l'appelant appelle alors
 * `sessionPerimee`.
 */
export async function requireSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    versConnexion();
    return null;
  }
  return data.session;
}

/**
 * Le serveur a refusé le jeton (compte supprimé, session révoquée depuis un
 * autre appareil) : on oublie la session locale et on repasse par /connexion.
 */
export async function sessionPerimee(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' });
  versConnexion();
}

/** Remplace le squelette par le contenu, une fois les données là. */
export function devoiler(): void {
  document.querySelector<HTMLElement>('[data-attente]')!.hidden = true;
  document.querySelector<HTMLElement>('[data-contenu]')!.hidden = false;
}
