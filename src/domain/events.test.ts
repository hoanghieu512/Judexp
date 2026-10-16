import { describe, it, expect } from 'vitest';
import { eventFileName, newEncounter, parseEvent, type JudexpEvent } from './events';

function makeEvent(over: Partial<JudexpEvent> = {}): JudexpEvent {
  return {
    schemaVersion: 1,
    eventId: 'a3f9c21d-7b44-4c2e-9f10-2c7a51d9e001',
    type: 'encounter',
    author: 'huynh',
    device: 'zflip4',
    createdAt: '2026-10-16T19:03:22+07:00',
    visibility: 'private',
    entityRef: { kind: 'driver', key: '59H123456', label: 'Nguyễn Văn A' },
    verdict: 'bad',
    tags: ['chạy ẩu'],
    ...over,
  };
}

describe('eventFileName', () => {
  it('encodes time, device and a short id', () => {
    expect(eventFileName(makeEvent())).toBe('20261016T120322Z_zflip4_a3f9c21.json');
  });

  it('converts the timestamp to UTC rather than keeping local time', () => {
    const name = eventFileName(makeEvent({ createdAt: '2026-10-16T00:30:00+07:00' }));
    expect(name.startsWith('20261015T173000Z_')).toBe(true);
  });
});

describe('parseEvent', () => {
  it('returns null for malformed json', () => {
    expect(parseEvent('{oops')).toBeNull();
  });

  it('returns null when schemaVersion is missing', () => {
    expect(parseEvent('{"type":"encounter"}')).toBeNull();
  });

  it('returns null for a schemaVersion it does not know', () => {
    expect(parseEvent(JSON.stringify({ ...makeEvent(), schemaVersion: 2 }))).toBeNull();
  });

  it('returns null when eventId is missing', () => {
    const { eventId: _dropped, ...rest } = makeEvent();
    expect(parseEvent(JSON.stringify(rest))).toBeNull();
  });

  it('accepts a null verdict as seen-but-unrated', () => {
    const e = parseEvent(JSON.stringify(makeEvent({ verdict: null })));
    expect(e?.verdict).toBeNull();
  });

  it('round-trips a complete event', () => {
    const e = makeEvent();
    expect(parseEvent(JSON.stringify(e))).toEqual(e);
  });
});

describe('newEncounter', () => {
  it('stamps schema version, type, visibility and an id', () => {
    const e = newEncounter({
      author: 'huynh',
      device: 'zflip4',
      verdict: 'good',
      entityRef: { kind: 'driver', key: '59H123456' },
    });
    expect(e.schemaVersion).toBe(1);
    expect(e.type).toBe('encounter');
    expect(e.visibility).toBe('private');
    expect(e.eventId).toMatch(/^[0-9a-f-]{36}$/);
    expect(Number.isNaN(Date.parse(e.createdAt))).toBe(false);
  });

  it('keeps a null verdict for a meeting that was not rated', () => {
    const e = newEncounter({ author: 'huynh', device: 'zflip4', verdict: null });
    expect(e.verdict).toBeNull();
  });
});
