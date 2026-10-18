/**
 * One search box for everything.
 *
 * The person using this is standing on the street with a driver already
 * assigned, so the box has to forgive what both the OCR and their thumbs do
 * to a plate: a dropped separator, one wrong character, an `I` that was
 * really a `1`. Names have to forgive missing diacritics the same way.
 *
 * Search folds text its own way, on top of `foldName`. Keys never go through
 * this file: they live in the kho for good, so search may change freely while
 * a change to `normalizeName` would split entities already written.
 */

import { foldName, normalizePlate, stripGenericPrefix } from '../domain/keys';
import { instant, type Entity, type State } from '../domain/reduce';

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
/** "234" of "59H1-234.56" is a whole group of the number as people read it. */
const MIN_PLATE_INSIDE = 3;
const MIN_FUZZY_QUERY = 4;
/** A piece from inside a word only counts from here: "an" sits inside half the names in a kho. */
const MIN_INNER_QUERY = 4;
const MIN_TRIGRAM_SIMILARITY = 0.34;

/**
 * Scores, best first. A whole word beats the start of a longer one ("pho"
 * finds "Phở 24" and "Sài Gòn Phở" before "Phòng trà"), and a match at the
 * start of the name beats one further in. `lookupTarget` reads them through
 * `HitMatch`: EXACT, a match at the start, or looser.
 */
const EXACT = 100;
const WHOLE_AT_START = 90;
const WHOLE_INSIDE = 85;
const PREFIX_AT_START = 80;
const PREFIX_INSIDE = 70;
const PLATE_SUFFIX = 70;
const PLATE_ONE_EDIT = 60;
const INSIDE_WORD = 50;
const PLATE_INSIDE = 50;
const TRIGRAM_MAX = 40;

function fold(plate: string): string {
  return [...plate].map((c) => LOOKALIKES[c] ?? c).join('');
}

/**
 * Text as search compares it. OCR writes `Ð` (U+00D0, eth) for `Đ`; it lower
 * cases to `ð`, which `foldName` keeps, so a sign read as "Ðức Phở" would
 * never be found by "duc pho". Folded here and not in the key, see above.
 */
function foldForSearch(raw: string): string {
  return foldName(raw).replace(/ð/g, 'd');
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

function trigramSimilarity(ta: Set<string>, tb: Set<string>): number {
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared += 1;
  return shared / (ta.size + tb.size - shared);
}

function plateScore(query: string, key: string): number {
  if (query.length < MIN_PLATE_QUERY) return 0;
  const q = fold(query);
  if (q === key) return EXACT;
  if (key.startsWith(q)) return PREFIX_AT_START;
  if (key.endsWith(q)) return PLATE_SUFFIX;
  if (query.length >= MIN_FUZZY_QUERY && withinOneEdit(q, key)) return PLATE_ONE_EDIT;
  if (query.length >= MIN_PLATE_INSIDE && key.includes(q)) return PLATE_INSIDE;
  return 0;
}

/** Whether a match ending at `end` ends on a word boundary of `value`. */
function wordEndsAt(value: string, end: number): boolean {
  return end === value.length || value[end] === ' ';
}

/**
 * How `query` sits in `value`, both folded into space-separated words. The
 * last word of a query may still be being typed, so it also matches as the
 * start of a word. Every occurrence is looked at: "phong pho" holds a partial
 * "pho" first and a whole one after it.
 */
function wordScore(query: string, value: string): number {
  if (query.length < MIN_PLATE_QUERY || value === '') return 0;
  if (query === value) return EXACT;

  let best = 0;
  if (value.startsWith(query)) {
    if (wordEndsAt(value, query.length)) return WHOLE_AT_START;
    best = PREFIX_AT_START;
  }
  const needle = ` ${query}`;
  for (let at = value.indexOf(needle); at >= 0; at = value.indexOf(needle, at + 1)) {
    if (wordEndsAt(value, at + needle.length)) return Math.max(best, WHOLE_INSIDE);
    best = Math.max(best, PREFIX_INSIDE);
  }
  if (best === 0 && query.length >= MIN_INNER_QUERY && value.includes(query)) best = INSIDE_WORD;
  return best;
}

/** A name in both forms: as written, and without its generic prefix. */
interface NameForms {
  full: string;
  bare: string;
  /** Built on first need: most names never get that far down. */
  trigrams?: Set<string>;
}

interface Prepared {
  entity: Entity;
  /** The plate folded for lookalikes; drivers only. */
  plate?: string;
  names: NameForms[];
}

function nameForms(raw: string): NameForms {
  const full = foldForSearch(raw);
  return { full, bare: stripGenericPrefix(full) };
}

/**
 * Folding every label on every keystroke cost most of the time a keystroke
 * took (3,000 places at three labels each: 11 to 34 ms on a Mac, before a
 * single match). A state never changes once folded, so its search forms are
 * built once per state and dropped with it.
 */
const preparedByState = new WeakMap<State, Prepared[]>();

/**
 * The strings an entity is found by as a name. A driver's plate goes through
 * the plate rules only, whether as its key or as a label written like it:
 * read as words, "59H1-000.01" outranked plates of the same score, and
 * trigrams made a never-met 51H12345 look like 59H123456. A place's key is
 * generated, so pieces of it would match at random.
 */
function namesOf(entity: Entity): string[] {
  if (entity.kind === 'driver') return entity.labels.filter((label) => normalizePlate(label) !== entity.key);
  if (entity.kind === 'place') return entity.labels;
  return [entity.key, ...entity.labels];
}

function prepared(state: State): Prepared[] {
  let list = preparedByState.get(state);
  if (!list) {
    list = [...state.entities.values()].map((entity) => ({
      entity,
      plate: entity.kind === 'driver' ? fold(entity.key) : undefined,
      names: namesOf(entity).map(nameForms),
    }));
    preparedByState.set(state, list);
  }
  return list;
}

interface Query {
  plate: string;
  full: string;
  bare: string;
  trigrams: Set<string>;
}

/**
 * A name scores its best way: bare against bare ("ba ghi" is the key of
 * "Quán Ba Ghi"), or as written against as written, so a generic prefix
 * still being typed ("quán b") does not wipe out every place it starts.
 */
function nameScore(q: Query, name: NameForms): number {
  const score = Math.max(wordScore(q.bare, name.bare), wordScore(q.full, name.full));
  if (score > 0 || q.bare.length < MIN_PLATE_QUERY || name.bare === '') return score;
  name.trigrams ??= trigrams(name.bare);
  const similarity = trigramSimilarity(q.trigrams, name.trigrams);
  return similarity >= MIN_TRIGRAM_SIMILARITY ? Math.round(TRIGRAM_MAX * similarity) : 0;
}

function scoreEntity(p: Prepared, q: Query): number {
  let best = p.plate === undefined ? 0 : plateScore(q.plate, p.plate);
  for (const name of p.names) {
    if (best === EXACT) break;
    best = Math.max(best, nameScore(q, name));
  }
  return best;
}

/**
 * How a hit matched, for `lookupTarget`: the whole plate or name (`exact`),
 * a plate or name that starts with the whole query (`prefix`, so the query
 * may still be on its way to it), or anything looser.
 */
export type HitMatch = 'exact' | 'prefix' | 'loose';

export interface SearchHit {
  entity: Entity;
  match: HitMatch;
}

function matchOf(score: number): HitMatch {
  if (score === EXACT) return 'exact';
  return score === WHOLE_AT_START || score === PREFIX_AT_START ? 'prefix' : 'loose';
}

/**
 * Search every entity, resolving a merged-away key to the entity that
 * survived the merge so an old name still finds the place. Equal scores go
 * to the one met most recently: the order things were first written down
 * says nothing about which one is meant.
 */
export function searchHits(state: State, query: string): SearchHit[] {
  const trimmed = query.trim();
  if (trimmed === '') return [];

  const full = foldForSearch(trimmed);
  const bare = stripGenericPrefix(full);
  const q: Query = { plate: normalizePlate(trimmed), full, bare, trigrams: trigrams(bare) };

  const best = new Map<string, { entity: Entity; score: number }>();
  for (const p of prepared(state)) {
    const score = scoreEntity(p, q);
    if (score === 0) continue;

    const entity = p.entity;
    const target = entity.mergedInto ? state.entities.get(entity.mergedInto) ?? entity : entity;
    const current = best.get(target.key);
    if (!current || score > current.score) best.set(target.key, { entity: target, score });
  }

  return [...best.values()]
    .sort(
      (a, b) =>
        b.score - a.score ||
        instant(b.entity.lastSeen) - instant(a.entity.lastSeen) ||
        a.entity.key.localeCompare(b.entity.key),
    )
    .map(({ entity, score }) => ({ entity, match: matchOf(score) }));
}

export function searchEntities(state: State, query: string): Entity[] {
  return searchHits(state, query).map((hit) => hit.entity);
}
