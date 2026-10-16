/**
 * Merge suggestions.
 *
 * The app never merges on its own. Merging two places wrongly tangles two
 * histories and untangling them is painful, so the most this module does is
 * hand the screen a question to ask.
 */

import type { Geo } from './events';
import type { Entity, State } from './reduce';
import { normalizeName } from './keys';

/** Above this, a position is too vague to argue about 150m. */
const MAX_USEFUL_ACCURACY_M = 100;
const SAME_PLACE_M = 150;
const SIMILAR_NAME = 0.45;

export interface MergeCandidate {
  entity: Entity;
  /** 'nearby' means names and positions agree; 'name-only' means no usable position. */
  basis: 'nearby' | 'name-only';
}

function trigrams(value: string): Set<string> {
  const padded = `  ${value} `;
  const out = new Set<string>();
  for (let i = 0; i < padded.length - 2; i += 1) out.add(padded.slice(i, i + 3));
  return out;
}

function nameSimilarity(a: string, b: string): number {
  if (a === '' || b === '') return 0;
  if (a.includes(b) || b.includes(a)) return 1;
  const ta = trigrams(a);
  const tb = trigrams(b);
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared += 1;
  return shared / (ta.size + tb.size - shared);
}

/** Metres between two points, flat-earth is plenty at this scale. */
export function distanceMeters(a: Geo, b: Geo): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng) * Math.cos(toRad((a.lat + b.lat) / 2));
  return Math.sqrt(dLat * dLat + dLng * dLng) * R;
}

/**
 * The most recent position recorded for an entity that is accurate enough.
 * A vague reading is skipped rather than trusted or allowed to hide an older
 * accurate one: a place does not move, so an old good fix still holds.
 */
function usablePosition(entity: Entity): Geo | null {
  for (let i = entity.encounters.length - 1; i >= 0; i -= 1) {
    const geo = entity.encounters[i].context?.geo;
    if (!geo) continue;
    if (geo.accuracy !== undefined && geo.accuracy > MAX_USEFUL_ACCURACY_M) continue;
    return geo;
  }
  return null;
}

export function mergeCandidates(state: State, entity: Entity): MergeCandidate[] {
  if (entity.mergedInto) return [];
  // Only places get suggestions. A plate is an identity, not a name: two
  // plates one character apart are two vehicles, and §6 asks this question
  // for restaurants, whose names genuinely drift and duplicate.
  if (entity.kind !== 'restaurant') return [];

  const myName = normalizeName(entity.labels[entity.labels.length - 1] ?? entity.key);
  const myPosition = usablePosition(entity);
  const found: MergeCandidate[] = [];

  for (const other of state.entities.values()) {
    if (other.key === entity.key) continue;
    if (other.kind !== entity.kind) continue;
    if (other.mergedInto) continue;

    const otherName = normalizeName(other.labels[other.labels.length - 1] ?? other.key);
    if (nameSimilarity(myName, otherName) < SIMILAR_NAME) continue;

    const otherPosition = usablePosition(other);
    if (myPosition && otherPosition) {
      if (distanceMeters(myPosition, otherPosition) <= SAME_PLACE_M) {
        found.push({ entity: other, basis: 'nearby' });
      }
      continue;
    }
    // No usable position on at least one side: the spec says compare names
    // alone, and the prompt must say the position is unknown.
    found.push({ entity: other, basis: 'name-only' });
  }

  return found;
}
