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
}

export const REMIND_AFTER_MS = 90 * 60_000;
export const GIVE_UP_AFTER_MS = 48 * 60 * 60_000;

/** Stable for an id, in 1..2147483647: Android notification and alarm ids are ints. */
export function notificationIdFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return h & 0x7fffffff || 1;
}

export function reminderFor(target: LookupTarget, now: Date): Reminder {
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
  };
}

export function stillPending(list: Reminder[], now: Date): Reminder[] {
  return list.filter((r) => Date.parse(r.expiresAt) > now.getTime());
}

/** Drops expired ones, then replaces any reminder with the same id. */
export function remember(list: Reminder[], target: LookupTarget, now: Date): Reminder[] {
  const next = reminderFor(target, now);
  return [...stillPending(list, now).filter((r) => r.id !== next.id), next];
}
