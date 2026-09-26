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
  { href: '/tarifs', label: 'Tarifs', ready: true }, // SCRUM-209
  // Rien à télécharger tant que l'app n'est pas publiée sur les stores : la
  // landing porte un badge « Bientôt sur iOS & Android » à la place.
  { href: '/telecharger', label: "L'app", ready: false },
  { href: '/support', label: 'Support', ready: true },
];

/**
 * Cible du bouton « Passer au premium ».
 *
 * Suit le drapeau de /tarifs : si la page devait être retirée, le bouton
 * retomberait sur la section tarifs de l'accueil plutôt que sur un 404.
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
 * Les boutons « Gérer mon abonnement » et « Résilier » ouvrent le portail
 * client Stripe, par l'Edge Function `create-portal-session` (SCRUM-208,
 * déployée le 26/09/2026). À repasser à `false` si la fonction est retirée.
 */
export const PORTAIL_PRET = true;

/**
 * Le paiement est-il ouvert à tous ? (SCRUM-209)
 *
 * NON tant que Stripe est en mode test : le site de production parle au Stripe
 * de TEST, et un paiement avec la carte publique 4242… y rendrait premium pour
 * de vrai. /tarifs montre alors les formules et « Bientôt disponible ».
 *
 * `/tarifs?apercu` affiche quand même les boutons, pour les comptes de test. Ce
 * n'est PAS la protection : `create-checkout-session` refuse (403
 * `checkout_closed`) tout compte absent de CHECKOUT_TESTEURS tant que sa clé
 * Stripe est une clé de test.
 *
 * À passer à `true` au lot 6 (SCRUM-216), dans le même geste que la clé live.
 */
export const PAIEMENT_OUVERT = false;

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
