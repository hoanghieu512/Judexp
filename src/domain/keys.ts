/**
 * Entity key normalization.
 *
 * A key is the thing that does not change; a label is the thing you see.
 * Keys are what lookups and merges compare, so they must be stable across
 * the many ways the same entity gets written down.
 */

/** Generic shop words that carry no identity, stripped only at the start. */
const GENERIC_PREFIXES = ['nha hang', 'cua hang', 'quan', 'tiem'];

/**
 * Plate key: keep letters and digits only, upper case.
 * `59H1-234.56`, `59-H1 23456` and ` 59h1 234 56 ` all collapse to `59H123456`.
 */
export function normalizePlate(raw: string): string {
  return raw.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
}

/**
 * Whether typed text reads as (part of) a plate rather than a name: plate
 * characters and separators only, at least two digits, and at most two
 * letters, since a Vietnamese plate carries one or two (`59H1`, `29LD`).
 * Only wording depends on this; search treats every query both ways.
 */
export function looksLikePlate(raw: string): boolean {
  if (!/^[0-9a-zA-Z\s.\-]+$/.test(raw.trim())) return false;
  const compact = normalizePlate(raw);
  const digits = compact.replace(/[^0-9]/g, '').length;
  const letters = compact.length - digits;
  return digits >= 2 && letters <= 2;
}

/**
 * Name key: drop diacritics, lower case, turn punctuation into word breaks,
 * collapse whitespace, then strip one leading generic prefix. `đ` needs its
 * own rule: it is not a composed character, so NFD leaves it untouched.
 *
 * Punctuation is how the same sign gets typed differently ("Ba Ghi - Q7",
 * "Ba Ghi Q7"), so it carries no identity. Apostrophes are dropped instead of
 * breaking the word, so "McDonald's" stays one word.
 */
export function normalizeName(raw: string): string {
  const flat = raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/['’‘]/g, '')
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  for (const prefix of GENERIC_PREFIXES) {
    if (flat.startsWith(prefix + ' ')) return flat.slice(prefix.length + 1);
  }
  return flat;
}

/**
 * Restaurant key is the normalized name alone. Coordinates stay out of the
 * key on purpose: GPS reads differently on every visit, so a key holding it
 * would turn one place into a new entity each time. Coordinates are used to
 * *suggest* a merge instead.
 */
export function restaurantKey(name: string): string {
  return normalizeName(name);
}

/** A dish does not exist apart from its restaurant, so its key carries it. */
export function dishKey(restaurant: string, dish: string): string {
  return `${normalizeName(restaurant)}::${normalizeName(dish)}`;
}
