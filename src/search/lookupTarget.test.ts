import { describe, it, expect } from 'vitest';
import { lookupTarget } from './lookupTarget';
import type { SearchHit } from './fuzzy';
import type { Entity } from '../domain/reduce';

function entity(key: string, labels: string[], kind: Entity['kind'] = 'driver'): Entity {
  return { key, kind, labels, firstSeen: '2026-10-16T10:00:00Z', lastSeen: '2026-10-16T10:00:00Z', encounters: [] };
}

/** Hits the way the search returns them: loose unless said otherwise. */
const found = (...entities: Entity[]): SearchHit[] => entities.map((e) => ({ entity: e, match: 'loose' }));
const exactly = (e: Entity): SearchHit => ({ entity: e, match: 'exact' });
const startingWith = (e: Entity): SearchHit => ({ entity: e, match: 'prefix' });

describe('lookupTarget', () => {
  it('points at the one entity the search found', () => {
    expect(lookupTarget('23456', found(entity('59H123456', ['59H1-234.56'])))).toEqual({
      kind: 'driver',
      key: '59H123456',
      label: '59H1-234.56',
    });
  });

  it('uses the newest label of the entity, or its key when it has none', () => {
    expect(lookupTarget('ba ghi', found(entity('com tam ba ghi', ['Ba Ghi', 'Cơm Tấm Ba Ghi'], 'restaurant')))?.label).toBe('Cơm Tấm Ba Ghi');
    expect(lookupTarget('59h1', found(entity('59H123456', [])))?.label).toBe('59H123456');
  });

  it('points at a new driver when a full plate finds nothing', () => {
    expect(lookupTarget(' 51a-999.99 ', [])).toEqual({ kind: 'driver', key: '51A99999', label: '51a-999.99' });
  });

  it('points at a new driver when a full plate only comes close to a known one', () => {
    // One character off is another vehicle: rating the known one would rate the wrong ride.
    expect(lookupTarget('59H123458', found(entity('59H123456', ['Anh A'])))).toEqual({
      kind: 'driver',
      key: '59H123458',
      label: '59H123458',
    });
  });

  it('points at nobody while the plate is still being typed', () => {
    expect(lookupTarget('59h1', [])).toBeNull();
  });

  it('points at nobody when several entities match and none of them exactly', () => {
    expect(lookupTarget('59h1', [startingWith(entity('59H123456', [])), startingWith(entity('59H123457', []))])).toBeNull();
  });

  it('points at the exact match even when a neighbour one character off also matches', () => {
    const hits = [exactly(entity('59H123456', [])), ...found(entity('59H123457', []))];
    expect(lookupTarget('59H123456', hits)?.key).toBe('59H123456');
  });

  it('points at nobody when an exact match may still be the start of a longer one', () => {
    const pho = [exactly(entity('::pho', ['Phở'], 'dish')), startingWith(entity('pho 24', ['Phở 24'], 'restaurant'))];
    expect(lookupTarget('pho', pho)).toBeNull();
    const plates = [exactly(entity('51H12345', [])), startingWith(entity('51H123456', []))];
    expect(lookupTarget('51H12345', plates)).toBeNull();
  });

  it('points at nobody when two entities match exactly', () => {
    const hits = [exactly(entity('ba ghi', ['Ba Ghi'], 'restaurant')), exactly(entity('com tam ba ghi', ['Ba Ghi'], 'restaurant'))];
    expect(lookupTarget('ba ghi', hits)).toBeNull();
  });

  it('points at nobody for an empty query', () => {
    expect(lookupTarget('   ', found(entity('59H123456', [])))).toBeNull();
  });
});
