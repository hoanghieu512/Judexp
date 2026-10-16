import { describe, it, expect } from 'vitest';
import { searchEntities } from './fuzzy';
import { applyEvents, emptyState, type State } from '../domain/reduce';
import type { EntityKind, JudexpEvent } from '../domain/events';

let seq = 0;
function met(kind: EntityKind, key: string, label?: string, over: Partial<JudexpEvent> = {}): JudexpEvent {
  seq += 1;
  return {
    schemaVersion: 1,
    eventId: `s${seq}`,
    type: 'encounter',
    author: 'huynh',
    device: 'zflip4',
    createdAt: '2026-10-16T12:00:00Z',
    visibility: 'private',
    entityRef: { kind, key, label },
    verdict: 'good',
    tags: [],
    ...over,
  };
}

function stateWith(...events: JudexpEvent[]): State {
  return applyEvents(emptyState(), events);
}

const keys = (st: State, q: string) => searchEntities(st, q).map((e) => e.key);

describe('searchEntities, plates', () => {
  const st = stateWith(met('driver', '59H123456', 'Anh A'), met('driver', '51B99999', 'Anh B'));

  it('matches an exact plate however it was typed', () => {
    expect(keys(st, '59H1-234.56')).toEqual(['59H123456']);
  });

  it('matches a plate prefix', () => {
    expect(keys(st, '59h1')).toEqual(['59H123456']);
  });

  it('matches a plate suffix', () => {
    expect(keys(st, '23456')).toEqual(['59H123456']);
  });

  it('tolerates one wrong character', () => {
    expect(keys(st, '59H723456')).toContain('59H123456');
  });

  it('tolerates OCR lookalikes in either direction', () => {
    expect(keys(st, '59HI234S6')).toContain('59H123456');
    expect(keys(st, '59H1Z3456')).toContain('59H123456');
  });

  it('does not dump the whole kho for a one-character query', () => {
    expect(searchEntities(st, '5')).toEqual([]);
  });

  it('returns nothing for an empty query', () => {
    expect(searchEntities(st, '   ')).toEqual([]);
  });
});

describe('searchEntities, names', () => {
  const st = stateWith(
    met('restaurant', 'bun bo hue 14', 'Bún Bò Huế 14'),
    met('restaurant', 'com tam ba ghien', 'Cơm Tấm Bà Ghiền'),
  );

  it('matches a name typed without diacritics', () => {
    expect(keys(st, 'bun bo')).toEqual(['bun bo hue 14']);
  });

  it('matches a name typed with diacritics', () => {
    expect(keys(st, 'Cơm Tấm')).toEqual(['com tam ba ghien']);
  });

  it('still finds an entity by a label it used to have', () => {
    const renamed = stateWith(
      met('restaurant', 'bun bo hue 14', 'Bún Bò Cô Ba'),
      met('restaurant', 'bun bo hue 14', 'Bún Bò Huế 14'),
    );
    expect(keys(renamed, 'co ba')).toEqual(['bun bo hue 14']);
  });
});

describe('searchEntities, merged entities', () => {
  it('resolves a merged-away key to the surviving entity, once', () => {
    const a = met('restaurant', 'bun bo hue 14', 'Bún Bò Huế 14');
    const b = met('restaurant', 'bun bo 14', 'Bún Bò 14');
    const merge: JudexpEvent = {
      ...met('restaurant', 'bun bo 14'),
      type: 'merge',
      fromKey: 'bun bo 14',
      intoKey: 'bun bo hue 14',
      createdAt: '2026-10-16T13:00:00Z',
    };
    const st = stateWith(a, b, merge);
    expect(keys(st, 'bun bo')).toEqual(['bun bo hue 14']);
  });
});

describe('searchEntities, ranking', () => {
  it('puts the exact match first', () => {
    const st = stateWith(met('driver', '59H123456'), met('driver', '59H1234567'));
    expect(keys(st, '59H123456')[0]).toBe('59H123456');
  });
});
