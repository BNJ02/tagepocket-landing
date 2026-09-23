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
 * `create-checkout-session` à partir du seul champ `plan` (SCRUM-215) : le
 * client n'envoie jamais un montant ni un `priceId`. Toute modification ici doit
 * être faite dans le Dashboard Stripe au même moment.
 */

export type PlanId = 'monthly' | 'quarterly';

export interface Formule {
  id: PlanId;
  nom: string;
  /** Montant TTC facturé à chaque échéance, en euros. */
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

/** Durée de l'essai, en jours. Voir la note sur la rétractation ci-dessous. */
export const ESSAI_JOURS = 14;

/**
 * Les 14 jours ne sont pas un chiffre marketing : ils font coïncider la fin de
 * l'essai avec la fin du délai légal de rétractation (art. L221-18 C. conso).
 * Aucun prélèvement n'intervient avant, donc la question « puis-je me faire
 * rembourser ? » ne se pose jamais. Ne pas raccourcir sans relire le lot 5.
 */

/** Prix mensualisé d'une formule, pour la comparer aux autres. */
export const parMois = (f: Formule): number => f.prix / f.mois;

/** « 8,99 € » — virgule décimale, espace insécable avant l'euro. */
export const euros = (montant: number): string =>
  `${montant.toFixed(2).replace('.', ',')} €`;
