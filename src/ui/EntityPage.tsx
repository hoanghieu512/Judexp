import { useMemo, useState } from 'react';
import { entityColor } from '../domain/color';
import { COLOR_LABELS, COLOR_MARKS } from './EntityRow';
import { mergeCandidates } from '../domain/merge';
import { newEncounter, type JudexpEvent } from '../domain/events';
import type { State } from '../domain/reduce';
import MergePrompt from './MergePrompt';
import { relativeTime } from './relativeTime';
import './ui.css';

const VERDICT_MARKS: Record<string, string> = { good: '✔', ok: '–', bad: '✕', grey: '?' };

/** Everything known about one entity, newest first. */
export default function EntityPage({
  state,
  entityKey,
  now,
  author,
  device,
  onSave,
}: {
  state: State;
  entityKey: string;
  now: Date;
  author: string;
  device: string;
  onSave: (event: JudexpEvent) => void;
}) {
  const entity = state.entities.get(entityKey);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const candidates = useMemo(
    () => (entity ? mergeCandidates(state, entity).filter((c) => !dismissed.includes(c.entity.key)) : []),
    [state, entity, dismissed],
  );

  if (!entity) return <p className="jx-empty">Không còn thực thể này.</p>;

  const encounters = [...entity.encounters].sort((a, b) => b.happenedAt.localeCompare(a.happenedAt));

  function confirmMerge(fromKey: string) {
    onSave({
      ...newEncounter({ author, device }),
      type: 'merge',
      fromKey,
      intoKey: entityKey,
      entityRef: null,
      verdict: undefined,
    });
  }

  return (
    <div className="jx-screen">
      <div className="jx-row">
        <span className="jx-mark" data-color={entityColor(entity)} aria-label={COLOR_LABELS[entityColor(entity)]}>
          {COLOR_MARKS[entityColor(entity)]}
        </span>
        <span>
          <span className={entity.kind === 'driver' ? 'jx-plate' : 'jx-name'}>{entityKey}</span>
          <span className="jx-sub" data-testid="labels">
            {' '}
            Từng thấy tên: {entity.labels.join(', ') || 'chưa có tên'}
          </span>
        </span>
      </div>

      {candidates.map((candidate) => (
        <MergePrompt
          key={candidate.entity.key}
          candidate={candidate}
          onConfirm={() => confirmMerge(candidate.entity.key)}
          onDismiss={() => setDismissed([...dismissed, candidate.entity.key])}
        />
      ))}

      <h2 className="jx-section-title">Các lần gặp</h2>
      {encounters.map((enc) => (
        <div className="jx-row" data-testid="encounter" data-verdict={enc.verdict ?? 'unrated'} key={enc.eventId}>
          <span className="jx-mark" data-color={enc.verdict ?? 'grey'}>
            {VERDICT_MARKS[enc.verdict ?? 'grey']}
          </span>
          <span>
            <span className="jx-sub">{relativeTime(enc.happenedAt, now)}</span>
            {enc.tags.length > 0 && (
              <span className="jx-tags">
                {enc.tags.map((tag) => (
                  <span className="jx-tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </span>
            )}
            {enc.note && <span className="jx-sub"> {enc.note}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
