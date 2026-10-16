import { describe, it, expect } from 'vitest';
import { applyEvents, emptyState } from './reduce';
import type { JudexpEvent } from './events';

let seq = 0;
function ev(over: Partial<JudexpEvent> = {}): JudexpEvent {
  seq += 1;
  return {
    schemaVersion: 1,
    eventId: `e${seq}`,
    type: 'encounter',
    author: 'huynh',
    device: 'zflip4',
    createdAt: '2026-10-16T12:00:00Z',
    visibility: 'private',
    entityRef: { kind: 'driver', key: '59H123456', label: 'Anh A' },
    verdict: 'good',
    tags: [],
    ...over,
  };
}

describe('applyEvents', () => {
  it('records an encounter under its entity', () => {
    const e = ev({ verdict: 'bad', tags: ['chạy ẩu'] });
    const s = applyEvents(emptyState(), [e]);
    const entity = s.entities.get('59H123456')!;
    expect(entity.kind).toBe('driver');
    expect(entity.labels).toEqual(['Anh A']);
    expect(entity.encounters).toHaveLength(1);
    expect(entity.encounters[0].verdict).toBe('bad');
    expect(entity.encounters[0].tags).toEqual(['chạy ẩu']);
  });

  it('uses when it happened, when that is before it was written down', () => {
    const e = ev({ context: { happenedAt: '2026-10-15T08:00:00Z' } });
    const s = applyEvents(emptyState(), [e]);
    expect(s.entities.get('59H123456')!.encounters[0].happenedAt).toBe('2026-10-15T08:00:00Z');
  });

  // A ride cannot happen after it was written down. A date like that is a
  // misread (the worker reading a year wrong), and trusted it would make this
  // rating the "latest" one deciding the colour for years.
  it('does not trust a happenedAt later than the moment it was written down', () => {
    const e = ev({ context: { happenedAt: '2036-10-16T08:00:00Z' } });
    const s = applyEvents(emptyState(), [e]);
    expect(s.entities.get('59H123456')!.encounters[0].happenedAt).toBe('2026-10-16T12:00:00Z');
  });

  it('falls back to when it was written down when happenedAt is not a date', () => {
    const e = ev({ context: { happenedAt: 'hôm qua' } });
    const s = applyEvents(emptyState(), [e]);
    expect(s.entities.get('59H123456')!.encounters[0].happenedAt).toBe('2026-10-16T12:00:00Z');
  });

  it('keeps a later rating last even when an earlier one carries a future date', () => {
    const misdated = ev({ verdict: 'bad', createdAt: '2026-10-16T10:00:00Z', context: { happenedAt: '2036-01-01T00:00:00Z' } });
    const later = ev({ verdict: 'good', createdAt: '2026-10-16T12:00:00Z' });
    const s = applyEvents(emptyState(), [misdated, later]);
    expect(s.entities.get('59H123456')!.encounters.map((x) => x.verdict)).toEqual(['bad', 'good']);
  });

  it('keeps an encounter with no entity out of the entity map until it is attached', () => {
    const e = ev({ entityRef: null, verdict: 'ok' });
    const s = applyEvents(emptyState(), [e]);
    expect(s.entities.size).toBe(0);
    expect(s.pending.get(e.eventId)!.verdict).toBe('ok');
  });

  it('attaches an entity to an encounter that had none', () => {
    const e = ev({ entityRef: null, verdict: 'bad' });
    const a = ev({
      type: 'attach',
      targetEventId: e.eventId,
      entityRef: { kind: 'driver', key: '59H123456', label: 'Anh A' },
      createdAt: '2026-10-16T12:05:00Z',
    });
    const s = applyEvents(emptyState(), [e, a]);
    expect(s.pending.size).toBe(0);
    expect(s.entities.get('59H123456')!.encounters[0].verdict).toBe('bad');
  });

  it('amend replaces fields of the target event', () => {
    const e = ev({ verdict: 'good', tags: ['xe sạch'] });
    const am = ev({
      type: 'amend',
      targetEventId: e.eventId,
      verdict: 'bad',
      tags: ['chạy ẩu'],
      createdAt: '2026-10-16T13:00:00Z',
    });
    const s = applyEvents(emptyState(), [e, am]);
    const enc = s.entities.get('59H123456')!.encounters;
    expect(enc).toHaveLength(1);
    expect(enc[0].verdict).toBe('bad');
    expect(enc[0].tags).toEqual(['chạy ẩu']);
  });

  it('merge folds one entity into another and keeps both keys reachable', () => {
    const a = ev({ entityRef: { kind: 'restaurant', key: 'bun bo hue 14', label: 'Bún Bò Huế 14' } });
    const b = ev({ entityRef: { kind: 'restaurant', key: 'bun bo 14', label: 'Bún Bò 14' } });
    const m = ev({
      type: 'merge',
      fromKey: 'bun bo 14',
      intoKey: 'bun bo hue 14',
      createdAt: '2026-10-16T14:00:00Z',
    });
    const s = applyEvents(emptyState(), [a, b, m]);
    expect(s.entities.get('bun bo hue 14')!.encounters).toHaveLength(2);
    expect(s.entities.get('bun bo 14')!.mergedInto).toBe('bun bo hue 14');
  });

  it('tombstone hides the target event', () => {
    const e = ev();
    const t = ev({ type: 'tombstone', targetEventId: e.eventId, createdAt: '2026-10-16T15:00:00Z' });
    const s = applyEvents(emptyState(), [e, t]);
    expect(s.entities.has('59H123456')).toBe(false);
  });

  it('tombstone on a merge event undoes the merge', () => {
    const a = ev({ entityRef: { kind: 'restaurant', key: 'bun bo hue 14' } });
    const b = ev({ entityRef: { kind: 'restaurant', key: 'bun bo 14' } });
    const m = ev({ type: 'merge', fromKey: 'bun bo 14', intoKey: 'bun bo hue 14' });
    const t = ev({ type: 'tombstone', targetEventId: m.eventId, createdAt: '2026-10-16T16:00:00Z' });
    const s = applyEvents(emptyState(), [a, b, m, t]);
    expect(s.entities.get('bun bo 14')!.mergedInto).toBeUndefined();
    expect(s.entities.get('bun bo 14')!.encounters).toHaveLength(1);
    expect(s.entities.get('bun bo hue 14')!.encounters).toHaveLength(1);
  });

  it('is idempotent: the same eventId applied twice counts once', () => {
    const e = ev();
    const s = applyEvents(emptyState(), [e, e]);
    expect(s.entities.get('59H123456')!.encounters).toHaveLength(1);
  });

  it('is idempotent across two calls, as an incremental index replays files', () => {
    const e = ev();
    const s = applyEvents(applyEvents(emptyState(), [e]), [e]);
    expect(s.entities.get('59H123456')!.encounters).toHaveLength(1);
  });

  it('orders by createdAt, not by array order', () => {
    const first = ev({ verdict: 'good', createdAt: '2026-10-16T10:00:00Z' });
    const amendLater = ev({
      type: 'amend',
      targetEventId: first.eventId,
      verdict: 'bad',
      createdAt: '2026-10-16T11:00:00Z',
    });
    const s = applyEvents(emptyState(), [amendLater, first]);
    expect(s.entities.get('59H123456')!.encounters[0].verdict).toBe('bad');
  });

  it('keeps a future-dated event from corrupting the entity', () => {
    const past = ev({ createdAt: '2026-10-16T10:00:00Z' });
    const future = ev({ createdAt: '2030-01-01T00:00:00Z' });
    const s = applyEvents(emptyState(), [future, past]);
    const entity = s.entities.get('59H123456')!;
    expect(entity.encounters).toHaveLength(2);
    expect(entity.firstSeen).toBe('2026-10-16T10:00:00Z');
    expect(entity.lastSeen).toBe('2030-01-01T00:00:00Z');
  });
});

describe('applyEvents, findings from the branch review', () => {
  // C2: a rating written under a key that was merged away must not vanish.
  it('lands an encounter written under a merged-away key on the surviving entity', () => {
    const a = ev({ entityRef: { kind: 'restaurant', key: 'bun bo hue 14' }, createdAt: '2026-10-16T10:00:00Z' });
    const b = ev({ entityRef: { kind: 'restaurant', key: 'bun bo 14' }, createdAt: '2026-10-16T11:00:00Z' });
    const m = ev({ type: 'merge', fromKey: 'bun bo 14', intoKey: 'bun bo hue 14', createdAt: '2026-10-16T12:00:00Z' });
    const late = ev({
      entityRef: { kind: 'restaurant', key: 'bun bo 14' },
      verdict: 'bad',
      createdAt: '2026-10-23T10:00:00Z',
    });
    const s = applyEvents(emptyState(), [a, b, m, late]);
    expect(s.entities.get('bun bo hue 14')!.encounters).toHaveLength(3);
    expect(s.entities.get('bun bo 14')!.encounters).toHaveLength(0);
    expect(s.entities.get('bun bo 14')!.mergedInto).toBe('bun bo hue 14');
  });

  // I5: a correction that carries an earlier timestamp than the thing it corrects.
  it('applies an amend that arrives dated before its target', () => {
    const e = ev({ verdict: 'good', createdAt: '2026-10-16T12:00:00Z' });
    const am = ev({
      type: 'amend',
      targetEventId: e.eventId,
      verdict: 'bad',
      createdAt: '2026-10-16T11:55:00Z',
    });
    const s = applyEvents(emptyState(), [e, am]);
    expect(s.entities.get('59H123456')!.encounters[0].verdict).toBe('bad');
  });

  it('applies an attach that arrives dated before its encounter', () => {
    const e = ev({ entityRef: null, verdict: 'ok', createdAt: '2026-10-16T12:00:00Z' });
    const at = ev({
      type: 'attach',
      targetEventId: e.eventId,
      entityRef: { kind: 'driver', key: '59H123456' },
      createdAt: '2026-10-16T11:50:00Z',
    });
    const s = applyEvents(emptyState(), [e, at]);
    expect(s.pending.size).toBe(0);
    expect(s.entities.get('59H123456')!.encounters).toHaveLength(1);
  });

  // I4: two devices writing different UTC offsets must still order by real time.
  it('orders by the instant, not by the text of createdAt', () => {
    const earlier = ev({ verdict: 'bad', createdAt: '2026-10-16T19:03:22+07:00' }); // 12:03Z
    const later = ev({ verdict: 'good', createdAt: '2026-10-16T13:00:00Z' });
    const s = applyEvents(emptyState(), [earlier, later]);
    const entity = s.entities.get('59H123456')!;
    expect(entity.lastSeen).toBe('2026-10-16T13:00:00Z');
    expect(entity.encounters.map((e) => e.verdict)).toEqual(['bad', 'good']);
  });
});
