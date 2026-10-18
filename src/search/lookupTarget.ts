/**
 * Who a finished lookup was about, for the reminder it leaves (§9.3).
 *
 * Only an unambiguous answer counts: exactly one entity found, exactly one
 * entity matching the whole plate or name typed, or nothing found for a
 * whole plate, which then names a driver met for the first time. A whole
 * plate typed with a neighbour one character off in the kho is still that
 * plate: one character off is another vehicle (huynh's call, 2026-10-18).
 * A half-typed plate or several loose matches leave no reminder, because a
 * reminder that guesses would ask about the wrong ride.
 */

import { looksLikeFullPlate, normalizePlate } from '../domain/keys';
import type { Entity } from '../domain/reduce';
import type { LookupTarget } from '../domain/reminders';
import type { SearchHit } from './fuzzy';

function targetOf(entity: Entity): LookupTarget {
  return { kind: entity.kind, key: entity.key, label: entity.labels[entity.labels.length - 1] ?? entity.key };
}

export function lookupTarget(query: string, hits: SearchHit[]): LookupTarget | null {
  const typed = query.trim();
  if (typed === '') return null;

  if (hits.length === 1) return targetOf(hits[0].entity);

  const exact = hits.filter((hit) => hit.exact);
  if (exact.length === 1) return targetOf(exact[0].entity);

  if (hits.length === 0 && looksLikeFullPlate(typed)) {
    return { kind: 'driver', key: normalizePlate(typed), label: typed };
  }

  return null;
}
