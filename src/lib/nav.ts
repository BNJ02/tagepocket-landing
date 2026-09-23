/**
 * Navigation du site — source unique pour l'en-tête et le pied de page.
 *
 * Chaque entrée porte un drapeau `ready`. Une page pas encore écrite n'est pas
 * rendue du tout, plutôt que d'être liée vers un 404 : le socle de SCRUM-195
 * part en production avant les pages de SCRUM-196 et SCRUM-197, et un lien mort
 * en ligne coûte plus cher qu'un lien manquant — il est indexé, il est cliqué,
 * et il donne l'impression d'un site cassé.
 *
 * Passer `ready` à `true` au moment où la page atterrit, dans le même commit.
 */
export type NavLink = {
  href: string;
  label: string;
  /** La page existe-t-elle en production ? */
  ready: boolean;
};

/** Barre de navigation principale. */
export const MAIN_NAV: NavLink[] = [
  { href: '/tarifs', label: 'Tarifs', ready: false }, // SCRUM-209
  { href: '/telecharger', label: "L'app", ready: false }, // SCRUM-196
  { href: '/support', label: 'Support', ready: true },
];

/** Appel à l'action de l'en-tête. */
export const HEADER_CTA: NavLink = {
  href: '/connexion',
  label: 'Se connecter',
  ready: false, // SCRUM-202
};

/** Liens légaux du pied de page. */
export const LEGAL_NAV: NavLink[] = [
  { href: '/mentions-legales', label: 'Mentions légales', ready: true },
  { href: '/confidentialite', label: 'Confidentialité', ready: true },
  { href: '/cgv', label: 'CGV', ready: false }, // SCRUM-212
  { href: '/suppression-compte', label: 'Supprimer mon compte', ready: false }, // SCRUM-215
];

export const CONTACT_EMAIL = 'contact@tagepocket.fr';

export const live = (links: NavLink[]): NavLink[] => links.filter((l) => l.ready);
