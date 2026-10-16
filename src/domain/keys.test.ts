import { describe, it, expect } from 'vitest';
import { normalizePlate, normalizeName, restaurantKey, dishKey } from './keys';

describe('normalizePlate', () => {
  it('strips separators and upper-cases', () => {
    expect(normalizePlate('59H1-234.56')).toBe('59H123456');
    expect(normalizePlate('59-H1 23456')).toBe('59H123456');
    expect(normalizePlate(' 59h1 234 56 ')).toBe('59H123456');
  });
});

describe('normalizeName', () => {
  it('strips diacritics, lower-cases, collapses spaces', () => {
    expect(normalizeName('  Bún   Bò Huế 14 ')).toBe('bun bo hue 14');
  });

  it('maps the Vietnamese d with stroke to a plain d', () => {
    expect(normalizeName('Đặc Biệt')).toBe('dac biet');
  });

  it('strips only leading generic prefixes', () => {
    expect(normalizeName('Quán Bún Bò')).toBe('bun bo');
    expect(normalizeName('Tiệm Cơm Tấm')).toBe('com tam');
    expect(normalizeName('Nhà Hàng Ngon')).toBe('ngon');
    expect(normalizeName('Cửa Hàng Tiện Lợi')).toBe('tien loi');
    expect(normalizeName('Phở Quán Mới')).toBe('pho quan moi');
  });
});

describe('restaurantKey', () => {
  it('is the normalized name, so the same place keeps one key across visits', () => {
    expect(restaurantKey('Quán Bún Bò Huế 14')).toBe('bun bo hue 14');
    expect(restaurantKey('  bun bo hue 14  ')).toBe('bun bo hue 14');
  });
});

describe('dishKey', () => {
  it('scopes a dish under its restaurant', () => {
    expect(dishKey('bun bo hue 14', 'Bún Bò Đặc Biệt')).toBe('bun bo hue 14::bun bo dac biet');
  });
});
