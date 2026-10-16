/** Days since the epoch, counted on the phone's own calendar rather than in UTC. */
function calendarDay(d: Date): number {
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

/**
 * How long ago, in the words a person would use, not a timestamp. "Hôm qua"
 * means the previous calendar day: a ride at 23:00 read at 08:00 the next
 * morning is yesterday, though fewer than 24 hours have passed.
 */
export function relativeTime(iso: string, now: Date): string {
  const days = calendarDay(now) - calendarDay(new Date(iso));

  if (days <= 0) return 'hôm nay';
  if (days === 1) return 'hôm qua';
  if (days < 7) return `${days} ngày trước`;
  if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
  if (days < 365) return `${Math.floor(days / 30)} tháng trước`;
  return `${Math.floor(days / 365)} năm trước`;
}
