import { describe, it, expect } from 'vitest';
import { relativeTime } from './relativeTime';

// Tests run in Asia/Ho_Chi_Minh (UTC+7), pinned in vite.config.ts, because
// "today" and "yesterday" are days on the phone's calendar, not 24h blocks.
describe('relativeTime', () => {
  it('calls a ride from late last night "hôm qua" the next morning', () => {
    // 23:00 on the 16th, read at 08:00 on the 17th: nine hours, but yesterday.
    expect(relativeTime('2026-10-16T16:00:00Z', new Date('2026-10-17T01:00:00Z'))).toBe('hôm qua');
  });

  it('calls an earlier ride on the same calendar day "hôm nay"', () => {
    // 08:00 and 23:00 on the 16th.
    expect(relativeTime('2026-10-16T01:00:00Z', new Date('2026-10-16T16:00:00Z'))).toBe('hôm nay');
  });

  it('counts calendar days, not whole 24h periods', () => {
    // 23:30 on the 10th to 08:00 on the 16th is under six full days, yet six days ago.
    expect(relativeTime('2026-10-10T16:30:00Z', new Date('2026-10-16T01:00:00Z'))).toBe('6 ngày trước');
  });

  it('keeps the coarser wording for weeks, months and years', () => {
    const now = new Date('2026-10-16T05:00:00Z');
    expect(relativeTime('2026-10-02T05:00:00Z', now)).toBe('2 tuần trước');
    expect(relativeTime('2026-08-01T05:00:00Z', now)).toBe('2 tháng trước');
    expect(relativeTime('2024-10-01T05:00:00Z', now)).toBe('2 năm trước');
  });
});
