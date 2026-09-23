/**
 * Tests de `src/lib/abonnement.ts`, sans dépendance :
 *   node --experimental-strip-types scripts/test-abonnement.ts
 */
import assert from 'node:assert/strict';
import { etatAbonnement, type LigneAbonnement } from '../src/lib/abonnement.ts';

const J = 86_400_000;
const maintenant = new Date('2026-10-10T12:00:00Z');
const iso = (decalageJours: number) => new Date(maintenant.getTime() + decalageJours * J).toISOString();

const ligne = (p: Partial<LigneAbonnement>): LigneAbonnement => ({
  status: 'active',
  plan: 'monthly',
  current_period_end: iso(20),
  cancel_at_period_end: false,
  trial_end: null,
  canceled_at: null,
  created_at: iso(-30),
  ...p,
});

let n = 0;
const cas = (nom: string, f: () => void) => { f(); n++; console.log(`  ✅ ${nom}`); };

cas('aucune ligne → gratuit', () => {
  assert.deepEqual(etatAbonnement([], maintenant), { type: 'gratuit' });
});

cas('essai commencé il y a 2 jours → jour 3 sur 14', () => {
  const e = etatAbonnement([ligne({ status: 'trialing', trial_end: iso(12) })], maintenant);
  assert.equal(e.type, 'essai');
  if (e.type === 'essai') { assert.equal(e.jour, 3); assert.equal(e.total, 14); }
});

cas("essai le jour même de l'inscription → jour 1", () => {
  const e = etatAbonnement([ligne({ status: 'trialing', trial_end: iso(14) })], maintenant);
  if (e.type !== 'essai') assert.fail(e.type);
  assert.equal(e.jour, 1);
});

cas('essai dont la fin est dépassée (webhook en retard) → borné à 14', () => {
  const e = etatAbonnement([ligne({ status: 'trialing', trial_end: iso(-1) })], maintenant);
  if (e.type !== 'essai') assert.fail(e.type);
  assert.equal(e.jour, 14);
});

cas('actif trimestriel résilié en fin de période', () => {
  const e = etatAbonnement([ligne({ plan: 'quarterly', cancel_at_period_end: true })], maintenant);
  if (e.type !== 'actif') assert.fail(e.type);
  assert.equal(e.resilie, true);
  assert.equal(e.formule.id, 'quarterly');
});

cas('past_due → impayé', () => {
  assert.equal(etatAbonnement([ligne({ status: 'past_due' })], maintenant).type, 'impaye');
});

cas('canceled → terminé, date = canceled_at', () => {
  const e = etatAbonnement([ligne({ status: 'canceled', canceled_at: iso(-3) })], maintenant);
  if (e.type !== 'termine') assert.fail(e.type);
  assert.equal(e.fin?.toISOString(), iso(-3));
});

cas('réabonné : la ligne vivante gagne sur une résiliée plus récente', () => {
  const e = etatAbonnement(
    [
      ligne({ status: 'active', created_at: iso(-10) }),
      ligne({ status: 'canceled', created_at: iso(-1) }),
    ],
    maintenant,
  );
  assert.equal(e.type, 'actif');
});

cas('deux lignes mortes : la plus récente', () => {
  const e = etatAbonnement(
    [
      ligne({ status: 'canceled', plan: 'monthly', created_at: iso(-100) }),
      ligne({ status: 'incomplete_expired', plan: 'quarterly', created_at: iso(-5) }),
    ],
    maintenant,
  );
  if (e.type !== 'termine') assert.fail(e.type);
  assert.equal(e.formule.id, 'quarterly');
});

console.log(`${n} cas réussis`);
