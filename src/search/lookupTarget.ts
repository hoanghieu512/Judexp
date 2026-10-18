/**
 * Who a finished lookup was about, for the reminder it leaves (§9.3).
 *
 * Only an unambiguous answer counts: exactly one entity found, or nothing
 * found for a whole plate, which then names a driver met for the first time.
 * A half-typed plate or several matches leave no reminder, because a
 * reminder that guesses would ask about the wrong ride.
 */

import { looksLikeFullPlate, normalizePlate } from '../domain/keys';
import type { Entity } from '../domain/reduce';
import type { LookupTarget } from '../domain/reminders';

export function lookupTarget(query: string, results: Entity[]): LookupTarget | null {
  const typed = query.trim();
  if (typed === '') return null;

  if (results.length === 1) {
    const [entity] = results;
    return { kind: entity.kind, key: entity.key, label: entity.labels[entity.labels.length - 1] ?? entity.key };
  }

  if (results.length === 0 && looksLikeFullPlate(typed)) {
    return { kind: 'driver', key: normalizePlate(typed), label: typed };
  }

  return null;
}
