import { describe, it, expect } from 'vitest';
import { notificationIdFor, remember, reminderFor, stillPending, type LookupTarget } from './reminders';

const plate: LookupTarget = { kind: 'driver', key: '59H123456', label: '59H1-234.56' };
const other: LookupTarget = { kind: 'driver', key: '51A99999', label: '51A-999.99' };
const at = (iso: string) => new Date(iso);
const KHO = 'content://kho-hieu';

describe('reminderFor', () => {
  it('reminds 90 minutes after the lookup and gives up 48 hours after it', () => {
    const r = reminderFor(plate, at('2026-10-18T11:40:00Z'), KHO);
    expect(r.id).toBe('driver:59H123456');
    expect(r.kind).toBe('driver');
    expect(r.key).toBe('59H123456');
    expect(r.label).toBe('59H1-234.56');
    expect(r.lookedUpAt).toBe('2026-10-18T11:40:00.000Z');
    expect(r.dueAt).toBe('2026-10-18T13:10:00.000Z');
    expect(r.expiresAt).toBe('2026-10-20T11:40:00.000Z');
    expect(r.notificationId).toBe(notificationIdFor('driver:59H123456'));
  });
});

describe('reminders and their kho', () => {
  it('remembers which kho the lookup was made in', () => {
    expect(reminderFor(plate, at('2026-10-18T11:40:00Z'), KHO).khoUri).toBe(KHO);
  });

  it('keeps the same entity looked up in another kho as a separate reminder', () => {
    const qa = remember([], plate, at('2026-10-18T11:40:00Z'), 'content://kho-qa');
    expect(remember(qa, plate, at('2026-10-18T11:50:00Z'), KHO).map((r) => r.khoUri)).toEqual(['content://kho-qa', KHO]);
  });
});

describe('remember', () => {
  it('moves the reminder of an entity looked up again instead of adding one', () => {
    const first = remember([], plate, at('2026-10-18T11:40:00Z'), KHO);
    const second = remember(first, plate, at('2026-10-18T12:00:00Z'), KHO);
    expect(second).toHaveLength(1);
    expect(second[0].dueAt).toBe('2026-10-18T13:30:00.000Z');
  });

  it('keeps reminders for different entities apart', () => {
    const list = remember(remember([], plate, at('2026-10-18T11:40:00Z'), KHO), other, at('2026-10-18T11:45:00Z'), KHO);
    expect(list.map((r) => r.id)).toEqual(['driver:59H123456', 'driver:51A99999']);
  });

  it('drops expired reminders while remembering a new one', () => {
    const old = remember([], other, at('2026-10-15T08:00:00Z'), KHO);
    expect(remember(old, plate, at('2026-10-18T11:40:00Z'), KHO).map((r) => r.id)).toEqual(['driver:59H123456']);
  });
});

describe('stillPending', () => {
  it('drops a reminder once 48 hours have passed', () => {
    const list = remember([], plate, at('2026-10-18T11:40:00Z'), KHO);
    expect(stillPending(list, at('2026-10-20T11:39:59.999Z'))).toHaveLength(1);
    expect(stillPending(list, at('2026-10-20T11:40:00.000Z'))).toHaveLength(0);
  });
});

describe('notificationIdFor', () => {
  it('gives each id a stable positive notification id', () => {
    const a = notificationIdFor('driver:59H123456');
    expect(notificationIdFor('driver:59H123456')).toBe(a);
    expect(a).toBeGreaterThanOrEqual(1);
    expect(a).toBeLessThanOrEqual(2147483647);
    expect(Number.isInteger(a)).toBe(true);
    expect(notificationIdFor('driver:59H123457')).not.toBe(a);
  });
});
