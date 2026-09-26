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
  // Rien à télécharger tant que l'app n'est pas publiée sur les stores : la
  // landing porte un badge « Bientôt sur iOS & Android » à la place.
  { href: '/telecharger', label: "L'app", ready: false },
  { href: '/support', label: 'Support', ready: true },
];

/**
 * Cible du bouton « Passer au premium ».
 *
 * `/tarifs` n'existe pas encore (SCRUM-209) et la même discipline que ci-dessus
 * s'applique : on ne lie pas vers une page absente. En attendant, le bouton
 * renvoie à la section tarifs de la page d'accueil, qui porte déjà les deux
 * formules. `/#tarifs` et non `#tarifs` : le lien sert aussi depuis /compte.
 * Basculer sur `/tarifs` dans le commit qui livre la page.
 */
export const TARIFS_TARGET = MAIN_NAV[0].ready ? '/tarifs' : '/#tarifs';

/** Appel à l'action de l'en-tête. */
export const HEADER_CTA: NavLink = {
  href: '/connexion',
  label: 'Se connecter',
  ready: true,
};

/**
 * Ce que devient l'appel à l'action une fois connecté. L'échange se fait côté
 * navigateur, dans Header.astro : le HTML est le même pour tout le monde.
 */
export const HEADER_CTA_CONNECTE: NavLink = {
  href: '/compte',
  label: 'Mon compte',
  ready: true,
};

/** Suppression du compte depuis /compte. */
export const SUPPRESSION_COMPTE: NavLink = {
  href: '/compte/supprimer',
  label: 'Supprimer mon compte',
  ready: true,
};

/**
 * Le bouton « Gérer mon abonnement » ouvre le portail client Stripe, par
 * l'Edge Function `create-portal-session` (SCRUM-208). Tant qu'elle n'existe
 * pas, le bouton n'est pas rendu — même discipline que les liens ci-dessus.
 */
export const PORTAIL_PRET = false;

/** Liens légaux du pied de page. */
export const LEGAL_NAV: NavLink[] = [
  { href: '/mentions-legales', label: 'Mentions légales', ready: true },
  { href: '/confidentialite', label: 'Confidentialité', ready: true },
  { href: '/cgv', label: 'CGV', ready: false }, // SCRUM-212
  { href: '/suppression-compte', label: 'Supprimer mon compte', ready: false }, // SCRUM-215
];

export const CONTACT_EMAIL = 'contact@tagepocket.fr';

/**
 * Adresse d'assistance, distincte de `CONTACT_EMAIL`.
 *
 * Les deux existent déjà et sont annoncées sur l'ancien site : `contact@` pour
 * le juridique et les données personnelles, `support@` pour les pannes. Les
 * fusionner obligerait à republier les mentions légales et la politique de
 * confidentialité, que les stores référencent.
 */
export const SUPPORT_EMAIL = 'support@tagepocket.fr';

export const live = (links: NavLink[]): NavLink[] => links.filter((l) => l.ready);
