import { describe, it, expect } from 'vitest';
import { eventFromAnswer, settleAnswers } from './settle';
import type { ReminderAnswer, ReminderStore } from './reminderStore';
import { reminderFor, type Reminder } from '../domain/reminders';
import type { JudexpEvent } from '../domain/events';

const who = { author: 'hieu', device: 'dgen1' };
const pendingReminder = reminderFor({ kind: 'driver', key: '59H123456', label: '59H1-234.56' }, new Date('2026-10-18T11:40:00Z'));

function answer(over: Partial<ReminderAnswer> = {}): ReminderAnswer {
  return {
    answerId: 'a3f9c21d-7b44-4c2e-9f10-2c7a51d9e001',
    reminderId: 'driver:59H123456',
    kind: 'driver',
    key: '59H123456',
    label: '59H1-234.56',
    lookedUpAt: '2026-10-18T11:40:00.000Z',
    expiresAt: '2026-10-20T11:40:00.000Z',
    answer: 'bad',
    answeredAt: '2026-10-18T13:15:00.000Z',
    ...over,
  };
}

function memoryStore(pending: Reminder[], answers: ReminderAnswer[]) {
  const state = { pending: [...pending], answers: [...answers], cleared: [] as string[] };
  const store: ReminderStore = {
    async load() {
      return state.pending;
    },
    async save(list) {
      state.pending = list;
    },
    async answers() {
      return state.answers;
    },
    async clearAnswer(id) {
      state.cleared.push(id);
      state.answers = state.answers.filter((a) => a.answerId !== id);
    },
  };
  return { store, state };
}

describe('eventFromAnswer', () => {
  it('turns a tapped verdict into an encounter dated when it was tapped', () => {
    const e = eventFromAnswer(answer(), who)!;
    expect(e.type).toBe('encounter');
    expect(e.schemaVersion).toBe(1);
    expect(e.eventId).toBe('a3f9c21d-7b44-4c2e-9f10-2c7a51d9e001');
    expect(e.createdAt).toBe('2026-10-18T13:15:00.000Z');
    expect(e.context?.happenedAt).toBe('2026-10-18T11:40:00.000Z');
    expect(e.entityRef).toEqual({ kind: 'driver', key: '59H123456', label: '59H1-234.56' });
    expect(e.verdict).toBe('bad');
    expect(e.tags).toEqual([]);
    expect(e.source).toEqual({ kind: 'reminder' });
    expect(e.author).toBe('hieu');
    expect(e.device).toBe('dgen1');
  });

  it('makes no event for Không đi or for an answer given after 48 hours', () => {
    expect(eventFromAnswer(answer({ answer: 'skip' }), who)).toBeNull();
    expect(eventFromAnswer(answer({ answeredAt: '2026-10-20T11:40:00.000Z' }), who)).toBeNull();
  });
});

describe('settleAnswers', () => {
  it('writes a tapped verdict, then clears it and its reminder', async () => {
    const { store, state } = memoryStore([pendingReminder], [answer()]);
    const written: JudexpEvent[] = [];
    const result = await settleAnswers(store, async (e) => void written.push(e), who);
    expect(result).toEqual({ written: 1, kept: 0 });
    expect(written.map((e) => e.verdict)).toEqual(['bad']);
    expect(state.cleared).toEqual(['a3f9c21d-7b44-4c2e-9f10-2c7a51d9e001']);
    expect(state.pending).toEqual([]);
  });

  it('writes nothing for Không đi but still clears it and its reminder', async () => {
    const { store, state } = memoryStore([pendingReminder], [answer({ answer: 'skip' })]);
    const written: JudexpEvent[] = [];
    expect(await settleAnswers(store, async (e) => void written.push(e), who)).toEqual({ written: 0, kept: 0 });
    expect(written).toEqual([]);
    expect(state.cleared).toHaveLength(1);
    expect(state.pending).toEqual([]);
  });

  it('writes nothing for an answer given after 48 hours, and clears it', async () => {
    const { store, state } = memoryStore([], [answer({ answeredAt: '2026-10-21T08:00:00.000Z' })]);
    const written: JudexpEvent[] = [];
    await settleAnswers(store, async (e) => void written.push(e), who);
    expect(written).toEqual([]);
    expect(state.cleared).toHaveLength(1);
  });

  it('keeps the answer for next time when the kho cannot be written', async () => {
    const { store, state } = memoryStore([pendingReminder], [answer()]);
    const result = await settleAnswers(store, async () => {
      throw new Error('kho cannot be listed');
    }, who);
    expect(result).toEqual({ written: 0, kept: 1 });
    expect(state.cleared).toEqual([]);
    expect(state.pending).toEqual([pendingReminder]);
  });

  it('does not clear a newer reminder for the same entity', async () => {
    const newer = reminderFor({ kind: 'driver', key: '59H123456', label: '59H1-234.56' }, new Date('2026-10-18T14:00:00Z'));
    const { store, state } = memoryStore([newer], [answer()]);
    await settleAnswers(store, async () => {}, who);
    expect(state.pending).toEqual([newer]);
  });

  it('gives the same event id when an answer is settled twice', async () => {
    const ids: string[] = [];
    // The phone dies after the write and before the clear: the answer comes back.
    const first = memoryStore([], [answer()]);
    first.store.clearAnswer = async () => {
      throw new Error('killed');
    };
    await settleAnswers(first.store, async (e) => void ids.push(e.eventId), who).catch(() => {});
    const second = memoryStore([], [answer()]);
    await settleAnswers(second.store, async (e) => void ids.push(e.eventId), who);
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe(ids[1]);
  });
});
