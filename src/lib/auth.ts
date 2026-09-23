/**
 * Outils communs aux pages d'authentification (SCRUM-202).
 *
 * Les messages reprennent mot pour mot ceux de l'app
 * (`~/memora_tage_mage/src/lib/auth.ts`, `frMessage`) : un même compte ne doit
 * pas parler deux langues selon l'endroit où l'on se connecte.
 */
import { isAuthError } from '@supabase/supabase-js';

/** Où va l'utilisateur une fois connecté, faute de `?next=`. */
export const DESTINATION_PAR_DEFAUT = '/compte';

/**
 * Cible de redirection après connexion, lue dans `?next=`.
 *
 * Tout ce qui ne reste pas sur notre origine est refusé : sans ce contrôle,
 * `/connexion?next=https://tagepocket-connexion.example` ferait de notre page de
 * connexion un tremplin de hameçonnage — l'utilisateur voit notre domaine, tape
 * son mot de passe, et atterrit chez l'attaquant, déjà en confiance.
 * `//example.com` et `/\example.com` sont des URLs d'un AUTRE domaine pour un
 * navigateur : d'où la comparaison d'origine plutôt qu'un simple `startsWith('/')`.
 */
export function destinationSure(brut: string | null): string {
  if (!brut) return DESTINATION_PAR_DEFAUT;
  try {
    const cible = new URL(brut, window.location.origin);
    if (cible.origin !== window.location.origin) return DESTINATION_PAR_DEFAUT;
    // Ne jamais renvoyer vers les pages d'authentification elles-mêmes.
    if (cible.pathname.startsWith('/connexion') || cible.pathname.startsWith('/auth/')) {
      return DESTINATION_PAR_DEFAUT;
    }
    return cible.pathname + cible.search + cible.hash;
  } catch {
    return DESTINATION_PAR_DEFAUT;
  }
}

/** Adresse de retour du lien de confirmation d'inscription. */
export const urlDeRetour = (): string => `${window.location.origin}/auth/callback`;

/**
 * Message lisible pour une erreur de Supabase Auth.
 *
 * On aiguille sur `code`, stable, et pas sur le texte anglais, qui change d'une
 * version de GoTrue à l'autre. L'app, elle, lit le texte : elle a été écrite
 * avant que GoTrue expose ces codes.
 */
export function messageErreur(e: unknown): string {
  if (!isAuthError(e)) return 'Une erreur est survenue. Réessaie.';
  // Réseau coupé, DNS, CSP : l'erreur n'est pas venue du serveur.
  if (e.name === 'AuthRetryableFetchError' || e.status === 0) {
    return 'Pas de connexion. Vérifie ton réseau.';
  }
  switch (e.code) {
    case 'invalid_credentials':
      return 'Email ou mot de passe incorrect.';
    case 'email_not_confirmed':
      return "Ton adresse n'est pas encore confirmée. Clique sur le lien reçu par e-mail.";
    case 'user_already_exists':
    case 'email_exists':
      return 'Un compte existe déjà avec cet email.';
    case 'weak_password':
      return 'Mot de passe trop court (6 caractères minimum).';
    case 'same_password':
      return "Choisis un mot de passe différent de l'ancien.";
    case 'email_address_invalid':
    case 'validation_failed':
      return 'Adresse email invalide.';
    case 'otp_expired':
      return 'Code invalide ou expiré.';
    case 'over_email_send_rate_limit':
      return "Trop d'e-mails envoyés. Attends une minute avant de redemander.";
    case 'over_request_rate_limit':
      return 'Trop de tentatives, réessaie dans un instant.';
    case 'signup_disabled':
      return 'Les inscriptions sont fermées pour le moment.';
  }
  if (e.status === 429) return 'Trop de tentatives, réessaie dans un instant.';
  return 'Une erreur est survenue. Réessaie.';
}
