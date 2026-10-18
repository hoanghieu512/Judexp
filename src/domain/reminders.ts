/**
 * When to ask "how was it?" after a lookup (§9.3).
 *
 * A lookup is the signal that a ride or a meal is about to happen, so it
 * leaves a reminder 90 minutes later. A reminder nobody answered within 48
 * hours is dropped: by then the memory is too vague to rate fairly.
 */

import type { EntityKind } from './events';

/** Who a finished lookup was about. */
export interface LookupTarget {
  kind: EntityKind;
  key: string;
  label: string;
}

export interface Reminder {
  /** `${kind}:${key}`, so a second lookup of the same entity replaces it. */
  id: string;
  notificationId: number;
  kind: EntityKind;
  key: string;
  label: string;
  lookedUpAt: string;
  dueAt: string;
  expiresAt: string;
  /** The kho the lookup was made in: an answer must never land in another one. */
  khoUri: string;
}

export const REMIND_AFTER_MS = 90 * 60_000;
export const GIVE_UP_AFTER_MS = 48 * 60 * 60_000;

/** Stable for an id, in 1..2147483647: Android notification and alarm ids are ints. */
export function notificationIdFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return h & 0x7fffffff || 1;
}

export function reminderFor(target: LookupTarget, now: Date, khoUri: string): Reminder {
  const id = `${target.kind}:${target.key}`;
  const t = now.getTime();
  return {
    id,
    notificationId: notificationIdFor(id),
    kind: target.kind,
    key: target.key,
    label: target.label,
    lookedUpAt: new Date(t).toISOString(),
    dueAt: new Date(t + REMIND_AFTER_MS).toISOString(),
    expiresAt: new Date(t + GIVE_UP_AFTER_MS).toISOString(),
    khoUri,
  };
}

export function stillPending(list: Reminder[], now: Date): Reminder[] {
  return list.filter((r) => Date.parse(r.expiresAt) > now.getTime());
}

/** Drops expired ones, then replaces any reminder with the same id in the same kho. */
export function remember(list: Reminder[], target: LookupTarget, now: Date, khoUri: string): Reminder[] {
  const next = reminderFor(target, now, khoUri);
  return [...stillPending(list, now).filter((r) => !(r.id === next.id && r.khoUri === khoUri)), next];
}

/** cyrb128: a small, well-mixed 128-bit string hash. Not for secrets, only for stable ids. */
function hash128(text: string): number[] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < text.length; i += 1) {
    const k = text.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/**
 * The event id of the rating that answers one lookup. It is derived from the
 * lookup, not from the tap, so a double tap, a notification answer plus a
 * Chờ chấm answer, or a notification shown again all name the same event,
 * which the index keeps once: one lookup can never become two encounters.
 */
export function eventIdForLookup(reminderId: string, lookedUpAt: string): string {
  const hex = hash128(`${reminderId}|${lookedUpAt}`).map((n) => n.toString(16).padStart(8, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
