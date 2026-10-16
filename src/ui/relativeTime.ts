/** How long ago, in the words a person would use, not a timestamp. */
export function relativeTime(iso: string, now: Date): string {
  const then = new Date(iso).getTime();
  const days = Math.floor((now.getTime() - then) / 86_400_000);

  if (days <= 0) return 'hôm nay';
  if (days === 1) return 'hôm qua';
  if (days < 7) return `${days} ngày trước`;
  if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
  if (days < 365) return `${Math.floor(days / 30)} tháng trước`;
  return `${Math.floor(days / 365)} năm trước`;
}
