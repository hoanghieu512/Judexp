import { describe, it, expect } from 'vitest';
import { lookupTarget } from './lookupTarget';
import type { Entity } from '../domain/reduce';

function entity(key: string, labels: string[], kind: Entity['kind'] = 'driver'): Entity {
  return { key, kind, labels, firstSeen: '2026-10-16T10:00:00Z', lastSeen: '2026-10-16T10:00:00Z', encounters: [] };
}

describe('lookupTarget', () => {
  it('points at the one entity the search found', () => {
    expect(lookupTarget('23456', [entity('59H123456', ['59H1-234.56'])])).toEqual({
      kind: 'driver',
      key: '59H123456',
      label: '59H1-234.56',
    });
  });

  it('uses the newest label of the entity, or its key when it has none', () => {
    expect(lookupTarget('ba ghi', [entity('com tam ba ghi', ['Ba Ghi', 'Cơm Tấm Ba Ghi'], 'restaurant')])?.label).toBe('Cơm Tấm Ba Ghi');
    expect(lookupTarget('59h1', [entity('59H123456', [])])?.label).toBe('59H123456');
  });

  it('points at a new driver when a full plate finds nothing', () => {
    expect(lookupTarget(' 51a-999.99 ', [])).toEqual({ kind: 'driver', key: '51A99999', label: '51a-999.99' });
  });

  it('points at nobody while the plate is still being typed', () => {
    expect(lookupTarget('59h1', [])).toBeNull();
  });

  it('points at nobody when several entities match', () => {
    expect(lookupTarget('59h1', [entity('59H123456', []), entity('59H123457', [])])).toBeNull();
  });

  it('points at nobody for an empty query', () => {
    expect(lookupTarget('   ', [entity('59H123456', [])])).toBeNull();
  });
});
