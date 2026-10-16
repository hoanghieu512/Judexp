import { describe, it, expect } from 'vitest';
import { tagsFor } from './tags';

describe('tagsFor', () => {
  it('offers the driver vocabulary', () => {
    expect(tagsFor('driver').bad).toContain('chạy ẩu');
    expect(tagsFor('driver').good).toContain('chạy êm');
  });

  it('offers the restaurant vocabulary', () => {
    expect(tagsFor('restaurant').bad).toContain('ship lâu');
    expect(tagsFor('restaurant').good).toContain('ngon');
  });

  it('offers a vocabulary for every entity kind', () => {
    for (const kind of ['driver', 'restaurant', 'dish', 'place'] as const) {
      expect(tagsFor(kind).good.length).toBeGreaterThan(0);
      expect(tagsFor(kind).bad.length).toBeGreaterThan(0);
    }
  });
});
