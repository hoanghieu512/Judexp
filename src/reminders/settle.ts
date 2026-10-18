/**
 * Turn tapped reminder answers into events in the kho.
 *
 * The native receiver only records which button was pressed; the event is
 * built here, with the same newEncounter every other rating uses, so the
 * event schema lives in one place. The event id comes from the lookup, not
 * from the tap: every answer to one lookup, by whatever path, names the same
 * event, which the index already keeps once.
 */

import { newEncounter, type JudexpEvent } from '../domain/events';
import { eventIdForLookup } from '../domain/reminders';
import type { ReminderAnswer, ReminderStore } from './reminderStore';

export interface Identity {
  author: string;
  device: string;
}

/** null for "Không đi" and for an answer given after the reminder expired. */
export function eventFromAnswer(answer: ReminderAnswer, who: Identity): JudexpEvent | null {
  if (answer.answer === 'skip') return null;
  if (Date.parse(answer.answeredAt) >= Date.parse(answer.expiresAt)) return null;
  return newEncounter({
    author: who.author,
    device: who.device,
    entityRef: { kind: answer.kind, key: answer.key, label: answer.label },
    verdict: answer.answer,
    tags: [],
    // The lookup is the best guess of when the ride happened; the tap is when it was written down.
    context: { happenedAt: answer.lookedUpAt },
    source: { kind: 'reminder' },
    now: new Date(answer.answeredAt),
    eventId: eventIdForLookup(answer.reminderId, answer.lookedUpAt),
  });
}

/**
 * Writes each usable answer for the kho in use, then clears it and its
 * reminder. Keeps an answer whose write failed, and an answer from another
 * kho, which waits until that kho is open again.
 */
export async function settleAnswers(
  store: ReminderStore,
  write: (event: JudexpEvent) => Promise<void>,
  who: Identity,
  khoUri: string,
): Promise<{ written: number; kept: number }> {
  let written = 0;
  let kept = 0;
  // Oldest first, so the first tap for a lookup wins and later ones are only cleared.
  const answered = new Set<string>();
  for (const answer of await store.answers()) {
    if (answer.khoUri !== khoUri) {
      kept += 1;
      continue;
    }
    const lookup = `${answer.reminderId}|${answer.lookedUpAt}`;
    const event = answered.has(lookup) ? null : eventFromAnswer(answer, who);
    if (event) {
      try {
        await write(event);
        written += 1;
        answered.add(lookup);
      } catch {
        // The kho is not writable right now (hidden, not chosen, full): try next time.
        kept += 1;
        continue;
      }
    }
    await store.clearAnswer(answer.answerId);
    // Only the reminder this answer was for: a newer lookup of the same entity stays.
    const pending = await store.load();
    const rest = pending.filter(
      (r) => !(r.id === answer.reminderId && r.lookedUpAt === answer.lookedUpAt && r.khoUri === answer.khoUri),
    );
    if (rest.length !== pending.length) await store.save(rest);
  }
  return { written, kept };
}
