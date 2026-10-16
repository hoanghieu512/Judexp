/**
 * One search box for everything.
 *
 * The person using this is standing on the street with a driver already
 * assigned, so the box has to forgive what both the OCR and their thumbs do
 * to a plate: a dropped separator, one wrong character, an `I` that was
 * really a `1`. Names have to forgive missing diacritics the same way.
 */

import { normalizeName, normalizePlate } from '../domain/keys';
import type { Entity, State } from '../domain/reduce';

/** Characters that get confused for each other, folded to one canonical form. */
const LOOKALIKES: Record<string, string> = {
  O: '0',
  I: '1',
  L: '1',
  Z: '2',
  S: '5',
  B: '8',
  G: '6',
};

const MIN_PLATE_QUERY = 2;
const MIN_FUZZY_QUERY = 4;
const MIN_TRIGRAM_SIMILARITY = 0.34;

function fold(plate: string): string {
  return [...plate].map((c) => LOOKALIKES[c] ?? c).join('');
}

/** Levenshtein, capped: we only ever ask "is this within one edit?". */
function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;

  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < short.length && j < long.length) {
    if (short[i] === long[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (short.length === long.length) i += 1;
    j += 1;
  }
  return edits + (long.length - j) + (short.length - i) <= 1;
}

function trigrams(value: string): Set<string> {
  const padded = `  ${value} `;
  const out = new Set<string>();
  for (let i = 0; i < padded.length - 2; i += 1) out.add(padded.slice(i, i + 3));
  return out;
}

function trigramSimilarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared += 1;
  return shared / (ta.size + tb.size - shared);
}

function plateScore(query: string, key: string): number {
  if (query.length < MIN_PLATE_QUERY) return 0;
  const q = fold(query);
  const k = fold(key);
  if (q === k) return 100;
  if (k.startsWith(q)) return 80;
  if (k.endsWith(q)) return 70;
  if (query.length >= MIN_FUZZY_QUERY && withinOneEdit(q, k)) return 60;
  return 0;
}

function nameScore(query: string, value: string): number {
  if (query.length < MIN_PLATE_QUERY || value === '') return 0;
  if (query === value) return 100;
  if (value.startsWith(query)) return 80;
  if (value.includes(query)) return 70;
  const similarity = trigramSimilarity(query, value);
  return similarity >= MIN_TRIGRAM_SIMILARITY ? Math.round(40 * similarity) : 0;
}

function scoreEntity(entity: Entity, plateQuery: string, nameQuery: string): number {
  let best = plateScore(plateQuery, entity.key);
  best = Math.max(best, nameScore(nameQuery, entity.key));
  for (const label of entity.labels) best = Math.max(best, nameScore(nameQuery, normalizeName(label)));
  return best;
}

/**
 * Search every entity, resolving a merged-away key to the entity that
 * survived the merge so an old name still finds the place.
 */
export function searchEntities(state: State, query: string): Entity[] {
  const trimmed = query.trim();
  if (trimmed === '') return [];

  const plateQuery = normalizePlate(trimmed);
  const nameQuery = normalizeName(trimmed);

  const best = new Map<string, { entity: Entity; score: number }>();
  for (const entity of state.entities.values()) {
    const score = scoreEntity(entity, plateQuery, nameQuery);
    if (score === 0) continue;

    const target = entity.mergedInto ? state.entities.get(entity.mergedInto) ?? entity : entity;
    const current = best.get(target.key);
    if (!current || score > current.score) best.set(target.key, { entity: target, score });
  }

  return [...best.values()].sort((a, b) => b.score - a.score).map((hit) => hit.entity);
}
