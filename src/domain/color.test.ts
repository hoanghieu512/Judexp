import { describe, it, expect } from 'vitest';
import { entityColor, meetingCount } from './color';
import type { Encounter, Entity } from './reduce';
import type { Verdict } from './events';

let n = 0;
function enc(verdict: Verdict | null, day = ++n): Encounter {
  return { eventId: `e${day}`, verdict, tags: [], happenedAt: `2026-10-${String(day).padStart(2, '0')}T10:00:00Z` };
}

/** Encounters are given oldest first, the order the fold produces. */
function entityWith(encounters: Encounter[]): Entity {
  return {
    key: '59H123456',
    kind: 'driver',
    labels: [],
    firstSeen: '2026-10-01T10:00:00Z',
    lastSeen: '2026-10-20T10:00:00Z',
    encounters,
  };
}

describe('entityColor', () => {
  it('is grey when no encounter has been rated', () => {
    expect(entityColor(entityWith([enc(null), enc(null)]))).toBe('grey');
  });

  it('is grey for an entity with no encounters at all', () => {
    expect(entityColor(entityWith([]))).toBe('grey');
  });

  it('is red when the latest rated encounter is bad', () => {
    expect(entityColor(entityWith([enc('good'), enc('good'), enc('bad')]))).toBe('red');
  });

  it('orders ratings by instant, not by the text of timestamps written with different offsets', () => {
    // 10:00+07:00 is 03:00Z, two hours BEFORE the good ride, though it sorts after it as text.
    const earlierBad: Encounter = { eventId: 'x1', verdict: 'bad', tags: [], happenedAt: '2026-10-16T10:00:00+07:00' };
    const laterGood: Encounter = { eventId: 'x2', verdict: 'good', tags: [], happenedAt: '2026-10-16T05:00:00Z' };
    // The latest ride was good and only one of the window was bad, so not red.
    expect(entityColor(entityWith([earlierBad, laterGood]))).toBe('yellow');
  });

  it('is red when two of the last five rated encounters are bad', () => {
    expect(entityColor(entityWith([enc('bad'), enc('bad'), enc('ok'), enc('ok'), enc('good')]))).toBe('red');
  });

  it('is green when the latest rated is good and no bad in the last five rated', () => {
    expect(entityColor(entityWith([enc('ok'), enc('ok'), enc('good')]))).toBe('green');
  });

  it('is yellow when the latest rated is ok and nothing is bad', () => {
    expect(entityColor(entityWith([enc('good'), enc('ok')]))).toBe('yellow');
  });

  it('is yellow when a single old bad has scrolled out of the last five rated', () => {
    expect(entityColor(entityWith([enc('bad'), enc('ok'), enc('ok'), enc('ok'), enc('ok'), enc('ok')]))).toBe('yellow');
  });

  it('ignores unrated encounters when computing colour but counts them as meetings', () => {
    const e = entityWith([enc('good'), enc(null), enc(null)]);
    expect(entityColor(e)).toBe('green');
    expect(meetingCount(e)).toBe(3);
  });

  it('reads recency from happenedAt, not from array position', () => {
    // Laid out newest-first on purpose: reading the last array slot as "latest"
    // would call this red, while the real latest is the good one.
    const older: Encounter = { eventId: 'x', verdict: 'bad', tags: [], happenedAt: '2026-01-01T10:00:00Z' };
    const newer: Encounter = { eventId: 'y', verdict: 'good', tags: [], happenedAt: '2026-09-01T10:00:00Z' };
    expect(entityColor(entityWith([newer, older]))).toBe('yellow');
  });
});
