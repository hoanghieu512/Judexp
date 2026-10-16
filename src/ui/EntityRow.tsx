import { entityColor, meetingCount, type EntityColor } from '../domain/color';
import type { Entity } from '../domain/reduce';
import { relativeTime } from './relativeTime';

const MARKS: Record<EntityColor, string> = {
  good: '✔',
  ok: '–',
  bad: '✕',
  grey: '?',
};

const MARK_LABELS: Record<EntityColor, string> = {
  good: 'tốt',
  ok: 'ổn',
  bad: 'xấu',
  grey: 'chưa chấm',
};

/** The three tags this entity picked up most often, most frequent first. */
function topTags(entity: Entity, limit = 3): string[] {
  const counts = new Map<string, number>();
  for (const enc of entity.encounters) {
    for (const tag of enc.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}

export default function EntityRow({
  entity,
  now,
  onOpen,
}: {
  entity: Entity;
  now: Date;
  onOpen?: (key: string) => void;
}) {
  const color = entityColor(entity);
  const meetings = meetingCount(entity);
  const isPlate = entity.kind === 'driver';
  const rated = entity.encounters.some((e) => e.verdict !== null);
  const latestLabel = entity.labels[entity.labels.length - 1];

  return (
    <button
      type="button"
      className="jx-row"
      data-testid={`entity-${entity.key}`}
      data-color={color}
      onClick={() => onOpen?.(entity.key)}
    >
      <span className="jx-mark" data-color={color} aria-label={MARK_LABELS[color]}>
        {MARKS[color]}
      </span>
      <span>
        <span
          className={isPlate ? 'jx-plate' : 'jx-name'}
          data-testid={`entity-key-${entity.key}`}
        >
          {isPlate ? entity.key : latestLabel ?? entity.key}
        </span>
        <span className="jx-sub">
          {' '}
          {isPlate && latestLabel ? `${latestLabel}, ` : ''}
          {meetings} lần gặp, {rated ? relativeTime(entity.lastSeen, now) : 'chưa chấm lần nào'}
        </span>
        {topTags(entity).length > 0 && (
          <span className="jx-tags">
            {topTags(entity).map((tag) => (
              <span className="jx-tag" data-testid="tag" key={tag}>
                {tag}
              </span>
            ))}
          </span>
        )}
      </span>
    </button>
  );
}
