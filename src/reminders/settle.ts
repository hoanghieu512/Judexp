/**
 * Turn tapped reminder answers into events in the kho.
 *
 * The native receiver only records which button was pressed; the event is
 * built here, with the same newEncounter every other rating uses, so the
 * event schema lives in one place. The event id is the answer id: if the
 * phone dies between writing the event and clearing the answer, settling it
 * again writes the same event id, which the index already deduplicates.
 */

import { newEncounter, type JudexpEvent } from '../domain/events';
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
    eventId: answer.answerId,
  });
}

/** Writes each usable answer, then clears it and its reminder. Keeps an answer whose write failed. */
export async function settleAnswers(
  store: ReminderStore,
  write: (event: JudexpEvent) => Promise<void>,
  who: Identity,
): Promise<{ written: number; kept: number }> {
  let written = 0;
  let kept = 0;
  for (const answer of await store.answers()) {
    const event = eventFromAnswer(answer, who);
    if (event) {
      try {
        await write(event);
        written += 1;
      } catch {
        // The kho is not writable right now (hidden, not chosen, full): try next time.
        kept += 1;
        continue;
      }
    }
    await store.clearAnswer(answer.answerId);
    // Only the reminder this answer was for: a newer lookup of the same entity stays.
    const pending = await store.load();
    const rest = pending.filter((r) => !(r.id === answer.reminderId && r.lookedUpAt === answer.lookedUpAt));
    if (rest.length !== pending.length) await store.save(rest);
  }
  return { written, kept };
}
