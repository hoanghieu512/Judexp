/**
 * Who a finished lookup was about, for the reminder it leaves (§9.3).
 *
 * Only an unambiguous answer counts, because a reminder that guesses would
 * ask about the wrong ride (huynh's calls, 2026-10-18):
 *
 * - Exactly one entity matching the whole plate or name typed, with nothing
 *   else starting with it: "59H123456" with 59H123457 in the kho is that
 *   plate, but "pho" with "Phở 24" in the kho may be "phở 24" half typed.
 * - A whole plate that matches no plate in full and starts none: a driver
 *   met for the first time, even if a plate one character off is known.
 *   One character off is another vehicle, and rating the known one would
 *   write the rating to the wrong vehicle for good.
 * - Otherwise, exactly one entity found.
 */

import { looksLikeFullPlate, normalizePlate } from '../domain/keys';
import type { Entity } from '../domain/reduce';
import type { LookupTarget } from '../domain/reminders';
import type { SearchHit } from './fuzzy';

/** The entity as a reminder names it: its newest label, or its key. */
export function targetOf(entity: Entity): LookupTarget {
  return { kind: entity.kind, key: entity.key, label: entity.labels[entity.labels.length - 1] ?? entity.key };
}

export function lookupTarget(query: string, hits: SearchHit[]): LookupTarget | null {
  const typed = query.trim();
  if (typed === '') return null;

  const exact = hits.filter((hit) => hit.match === 'exact');
  const extended = hits.some((hit) => hit.match === 'prefix');

  if (exact.length === 1 && !extended) return targetOf(exact[0].entity);

  if (exact.length === 0 && !extended && looksLikeFullPlate(typed)) {
    return { kind: 'driver', key: normalizePlate(typed), label: typed };
  }

  if (hits.length === 1) return targetOf(hits[0].entity);

  return null;
}
