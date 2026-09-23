/**
 * Ce que /compte affiche, déduit de la table `subscriptions` (SCRUM-203).
 *
 * Fonction pure, sans DOM ni réseau : testable en une ligne de Node
 * (`scripts/test-abonnement.ts`).
 *
 * Ce module DÉCRIT l'abonnement, il ne DÉCIDE pas de l'accès premium. L'accès
 * est tranché côté serveur par `is_premium()`, avec sa période de grâce et son
 * garde-fou anti-webhook-manqué (`schema-billing.sql`). La page appelle les
 * deux ; en cas de désaccord, c'est `is_premium()` qui a raison.
 */
import { ESSAI_JOURS, FORMULES, type Formule, type PlanId } from './offre.ts';

/** Une ligne de `public.subscriptions`, telle que PostgREST la renvoie. */
export interface LigneAbonnement {
  status: string;
  plan: PlanId;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_end: string | null;
  canceled_at: string | null;
  created_at: string;
}

export type Etat =
  | { type: 'gratuit' }
  | { type: 'essai'; formule: Formule; jour: number; total: number; fin: Date; resilie: boolean }
  | { type: 'actif'; formule: Formule; echeance: Date | null; resilie: boolean }
  | { type: 'impaye'; formule: Formule; echeance: Date | null }
  | { type: 'termine'; formule: Formule; fin: Date | null };

/** Statuts Stripe qui donnent (encore) accès. Même liste que `is_premium()`. */
const VIVANTS = new Set(['trialing', 'active', 'past_due']);

const JOUR_MS = 86_400_000;

const date = (iso: string | null): Date | null => (iso ? new Date(iso) : null);

const formule = (plan: PlanId): Formule => FORMULES.find((f) => f.id === plan) ?? FORMULES[0];

/**
 * Choisit la ligne à montrer. Un utilisateur qui s'est désabonné puis
 * réabonné a plusieurs lignes : la vivante l'emporte, sinon la plus récente.
 */
export function ligneCourante(lignes: LigneAbonnement[]): LigneAbonnement | null {
  const recentes = [...lignes].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return recentes.find((l) => VIVANTS.has(l.status)) ?? recentes[0] ?? null;
}

export function etatAbonnement(lignes: LigneAbonnement[], maintenant = new Date()): Etat {
  const l = ligneCourante(lignes);
  if (!l) return { type: 'gratuit' };

  const f = formule(l.plan);
  const echeance = date(l.current_period_end);

  switch (l.status) {
    case 'trialing': {
      const fin = date(l.trial_end) ?? echeance ?? maintenant;
      const debut = fin.getTime() - ESSAI_JOURS * JOUR_MS;
      // Jour 1 le jour de l'inscription, jamais au-delà du dernier jour.
      const jour = Math.min(
        ESSAI_JOURS,
        Math.max(1, Math.floor((maintenant.getTime() - debut) / JOUR_MS) + 1),
      );
      return { type: 'essai', formule: f, jour, total: ESSAI_JOURS, fin, resilie: l.cancel_at_period_end };
    }
    case 'active':
      return { type: 'actif', formule: f, echeance, resilie: l.cancel_at_period_end };
    case 'past_due':
      return { type: 'impaye', formule: f, echeance };
    default:
      // canceled, unpaid, incomplete_expired, paused… : plus d'accès.
      return { type: 'termine', formule: f, fin: date(l.canceled_at) ?? echeance };
  }
}
