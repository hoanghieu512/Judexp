import type { Entity } from '../domain/reduce';
import type { Reminder } from '../domain/reminders';
import type { Answer } from '../reminders/reminderStore';
import EntityRow from './EntityRow';
import { VERDICTS } from './QuickRateSheet';
import { relativeTime } from './relativeTime';
import './ui.css';

/**
 * Chờ chấm: the way back to every reminder that was swiped away or missed,
 * and to every meeting that was never rated (§9.3). Android draws only three
 * buttons on a notification, so this is also where "Không đi" lives.
 */
export default function PendingBox({
  reminders,
  unrated,
  now,
  onAnswer,
  onOpen,
}: {
  reminders: Reminder[];
  /** Entities with at least one unrated encounter, most recent first, at most 10. */
  unrated: Entity[];
  now: Date;
  onAnswer: (reminder: Reminder, answer: Answer) => void;
  onOpen: (key: string) => void;
}) {
  if (reminders.length === 0 && unrated.length === 0) return null;
  const newestFirst = [...reminders].sort((a, b) => Date.parse(b.lookedUpAt) - Date.parse(a.lookedUpAt));

  return (
    <section>
      <h2 className="jx-section-title">Chờ chấm</h2>
      {newestFirst.map((r) => (
        <div key={r.id} className="jx-prompt" data-testid={`reminder-${r.id}`}>
          <p>
            <span className={r.kind === 'driver' ? 'jx-plate' : 'jx-name'}>{r.label}</span>{' '}
            <span className="jx-sub">tra {relativeTime(r.lookedUpAt, now)}</span>
          </p>
          <div className="jx-verdicts" data-columns="4">
            {VERDICTS.map((v) => (
              <button key={v.value} type="button" className="jx-verdict" data-color={v.value} onClick={() => onAnswer(r, v.value)}>
                <span aria-hidden="true">{v.mark}</span>
                {v.label}
              </button>
            ))}
            <button type="button" className="jx-verdict" onClick={() => onAnswer(r, 'skip')}>
              Không đi
            </button>
          </div>
        </div>
      ))}
      {unrated.map((entity) => (
        <EntityRow key={entity.key} entity={entity} now={now} onOpen={onOpen} />
      ))}
    </section>
  );
}
