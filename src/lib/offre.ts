/**
 * L'offre commerciale, écrite une seule fois.
 *
 * La landing, `/tarifs` (SCRUM-209) et les CGV (SCRUM-212) affichent tous les
 * mêmes montants. Un prix recopié à trois endroits finit par diverger, et un
 * prix affiché qui ne correspond pas au prix débité est un défaut de conformité
 * (art. L112-1 C. conso), pas une coquille.
 *
 * ⚠️ Ce fichier ne pilote RIEN côté paiement. Les montants réellement débités
 * vivent dans les prix Stripe, résolus côté serveur par
 * `create-checkout-session` à partir du seul champ `plan` (SCRUM-207) : le
 * client n'envoie jamais un montant ni un `priceId`. Toute modification ici doit
 * être faite dans le Dashboard Stripe au même moment.
 */

export type PlanId = 'monthly' | 'quarterly';

export interface Formule {
  id: PlanId;
  nom: string;
  /** Montant facturé à chaque échéance, en euros. Voir MENTION_TVA. */
  prix: number;
  /** Nombre de mois couverts par une échéance. */
  mois: number;
  periode: string;
  /** Argument de la formule, ou null si elle n'en a pas besoin. */
  avantage: string | null;
}

export const FORMULES: Formule[] = [
  {
    id: 'monthly',
    nom: 'Mensuel',
    prix: 8.99,
    mois: 1,
    periode: 'par mois',
    avantage: null,
  },
  {
    id: 'quarterly',
    nom: 'Trimestriel',
    prix: 24.99,
    mois: 3,
    periode: 'tous les 3 mois',
    avantage: 'Le temps d’une vraie préparation',
  },
];

/**
 * Ce que débloque le premium, dans les deux formules (plan, « Premium
 * débloque »). Affiché sur /tarifs : c'est la description du service exigée
 * avant la souscription (art. L111-1 C. conso). Toute ligne ajoutée ici doit
 * exister dans l'app au moment où le paiement ouvre (SCRUM-219, SCRUM-220).
 */
export const AVANTAGES_PREMIUM: string[] = [
  'Vies illimitées : tu t’entraînes autant que tu veux',
  'Les paliers Expert de chaque lieu',
  'Les statistiques détaillées, sous-épreuve par sous-épreuve',
  'La correction et la méthode après chaque question',
  'Les fiches de révision',
  'Les modules Sprint et 20 Questions',
];

/**
 * Régime de TVA de l'éditeur, TopPercentile SAS : FRANCHISE EN BASE
 * (art. 293 B du CGI), confirmé le 26/09/2026. Aucune TVA n'est facturée : le
 * prix affiché est le prix payé, et toute facture doit porter cette mention.
 *
 * Ne JAMAIS écrire « TTC » ni « TVA comprise » ailleurs : ce serait faux, et un
 * prix affiché inexact est un défaut de conformité (art. L112-1 C. conso).
 *
 * Le jour où la société dépasse le seuil de la franchise, TROIS choses changent
 * ensemble : cette ligne (« TTC, TVA à 20 % comprise »), un enregistrement FR
 * dans Stripe Tax + `automatic_tax` sur la Checkout Session, et le pied de
 * facture posé sur les clients Stripe par `create-checkout-session`. Prix
 * inchangés (tax_behavior: inclusive) : la TVA sera prise sur la marge.
 */
export const MENTION_TVA = 'TVA non applicable, art. 293 B du CGI';

/**
 * Délai de rétractation, en jours, courant à partir de la souscription.
 *
 * DÉCISION DU 26/09/2026 : PAS D'ESSAI GRATUIT. Le premier prélèvement a lieu
 * à la souscription. En contrepartie, toute rétractation dans ce délai est
 * REMBOURSÉE INTÉGRALEMENT, même si le premium a déjà servi.
 *
 * C'est plus favorable que la loi (art. L221-18 et L221-25 C. conso), qui
 * autoriserait, selon la qualification du premium, soit une renonciation
 * expresse au droit de rétractation, soit un remboursement au seul prorata non
 * consommé. On ne demande donc AUCUNE renonciation : pas de case à cocher avant
 * le paiement, et aucune contestation possible.
 *
 * Restent obligatoires : informer du droit avant le paiement (L221-5), fournir
 * le formulaire type en annexe des CGV, rembourser sous 14 jours par le même
 * moyen de paiement (L221-24).
 */
export const RETRACTATION_JOURS = 14;

/** Prix mensualisé d'une formule, pour la comparer aux autres. */
export const parMois = (f: Formule): number => f.prix / f.mois;

/**
 * « 8,99 » — virgule décimale, sans le symbole.
 *
 * Le symbole se pose à côté, HORS de la classe `.num` : JetBrains Mono est à
 * chasse fixe, et un « € » monospacé colle au nombre une cellule pleine de
 * blanc. Le mono sert à aligner des chiffres entre eux, pas à composer une
 * unité.
 */
export const nombre = (montant: number): string =>
  montant.toFixed(2).replace('.', ',');

/** « 8,99 € » d'un seul tenant — pour un `alt`, une meta, un e-mail. */
export const euros = (montant: number): string => `${nombre(montant)} €`;
