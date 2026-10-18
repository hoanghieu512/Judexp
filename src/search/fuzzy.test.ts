import { describe, it, expect } from 'vitest';
import { searchEntities, searchHits } from './fuzzy';
import { restaurantKey } from '../domain/keys';
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

  it('finds a piece from the middle of a plate from three characters', () => {
    expect(keys(st, '234')).toEqual(['59H123456']);
    expect(keys(st, '23')).toEqual([]);
  });

  it('ranks a middle piece below a suffix', () => {
    const two = stateWith(met('driver', '59H123456'), met('driver', '51A99234'));
    expect(keys(two, '234')).toEqual(['51A99234', '59H123456']);
  });

  it('does not show a known driver for a never-met plate that shares some digits', () => {
    // Trigrams on plates made 51H12345 look like 59H123456: a stranger's row,
    // and a reminder that would rate the wrong vehicle.
    expect(keys(stateWith(met('driver', '59H123456', 'Nguyễn Văn An')), '51H12345')).toEqual([]);
    expect(keys(stateWith(met('driver', '51H23588', 'Anh A')), '51H23017')).toEqual([]);
  });

  it('still finds a driver by the name on the label', () => {
    expect(keys(stateWith(met('driver', '59H123456', 'Nguyễn Văn An')), 'van an')).toEqual(['59H123456']);
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

describe('searchEntities, places', () => {
  it('finds a place by its name, never by pieces of its generated key', () => {
    const key = '0192f3a4-7b2c-7d10-9e44-5a6b7c8d9e0f';
    const st = stateWith(met('place', key, 'Công viên Gia Định'));
    expect(keys(st, 'gia dinh')).toEqual([key]);
    expect(keys(st, '7b2c')).toEqual([]);
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

  it('puts a whole word above the start of a longer word', () => {
    const st = stateWith(
      met('restaurant', 'phong tra xua', 'Phòng trà Xưa'),
      met('restaurant', 'sai gon pho', 'Sài Gòn Phở'),
      met('restaurant', 'pho 24', 'Phở 24'),
    );
    expect(keys(st, 'pho')).toEqual(['pho 24', 'sai gon pho', 'phong tra xua']);
  });

  it('breaks a tie with the most recent meeting, not the order things were first written', () => {
    const st = stateWith(
      met('driver', '59H100001', undefined, { createdAt: '2026-10-10T12:00:00Z' }),
      met('driver', '59H100002', undefined, { createdAt: '2026-10-15T12:00:00Z' }),
      met('driver', '59H100003', undefined, { createdAt: '2026-10-12T12:00:00Z' }),
    );
    expect(keys(st, '59h1')).toEqual(['59H100002', '59H100003', '59H100001']);
  });

  it('breaks the tie by recency whatever shape the plate label was written in', () => {
    const st = stateWith(
      met('driver', '59H100001', '59H1-000.01', { createdAt: '2026-10-01T12:00:00Z' }),
      met('driver', '59H100002', 'Anh B', { createdAt: '2026-10-15T12:00:00Z' }),
      met('driver', '59H100003', '59h100003', { createdAt: '2026-10-14T12:00:00Z' }),
    );
    expect(keys(st, '59h1')).toEqual(['59H100002', '59H100003', '59H100001']);
  });

  it('does not match two letters in the middle of a word', () => {
    const st = stateWith(met('restaurant', 'banh mi hoa', 'Bánh mì Hòa'), met('restaurant', 'an nhien', 'An Nhiên'));
    expect(keys(st, 'an')).toEqual(['an nhien']);
  });

  it('still matches a longer piece from the middle of a word', () => {
    const st = stateWith(met('restaurant', 'an nhien', 'An Nhiên'));
    expect(keys(st, 'hien')).toEqual(['an nhien']);
  });
});

describe('searchEntities, while typing', () => {
  const st = stateWith(
    met('restaurant', restaurantKey('Quán Ba Ghi'), 'Quán Ba Ghi'),
    met('restaurant', restaurantKey('Nhà hàng Ngọc Sương'), 'Nhà hàng Ngọc Sương'),
  );

  it('finds a place while its generic prefix is still being typed', () => {
    expect(keys(st, 'quán')).toEqual(['ba ghi']);
    expect(keys(st, 'quán b')).toEqual(['ba ghi']);
    expect(keys(st, 'nha hang')).toEqual(['ngoc suong']);
    expect(keys(st, 'nhà hàng n')).toEqual(['ngoc suong']);
  });

  it('still finds the place by its name alone', () => {
    expect(keys(st, 'ba ghi')).toEqual(['ba ghi']);
    expect(keys(st, 'ngoc')).toEqual(['ngoc suong']);
  });
});

describe('searchEntities, OCR text', () => {
  it('finds a sign read with an eth (Ð) by its name typed with d or Đ', () => {
    // The key keeps the eth: keys are frozen in the kho, only search folds it.
    const key = restaurantKey('Ðức Phở');
    const st = stateWith(met('restaurant', key, 'Ðức Phở'));
    expect(keys(st, 'duc')).toEqual([key]);
    expect(keys(st, 'Đức')).toEqual([key]);
    expect(keys(st, 'duc pho')).toEqual([key]);
  });
});

describe('searchHits', () => {
  const st = stateWith(met('driver', '59H123456'), met('driver', '59H123457'), met('restaurant', 'ba ghi', 'Quán Ba Ghi'));
  const matched = (q: string, how: string) =>
    searchHits(st, q)
      .filter((h) => h.match === how)
      .map((h) => h.entity.key);

  it('marks only a match on the whole plate or the whole name as exact', () => {
    expect(matched('59H1-234.56', 'exact')).toEqual(['59H123456']);
    expect(matched('59h1', 'exact')).toEqual([]);
    expect(matched('Ba Ghi', 'exact')).toEqual(['ba ghi']);
    expect(matched('Quán Ba Ghi', 'exact')).toEqual(['ba ghi']);
    expect(matched('ba', 'exact')).toEqual([]);
  });

  it('marks a plate or name that starts with the whole query as a prefix', () => {
    expect(matched('59h1', 'prefix')).toEqual(['59H123456', '59H123457']);
    expect(matched('ba', 'prefix')).toEqual(['ba ghi']);
    expect(matched('59H123456', 'prefix')).toEqual([]);
  });
});
