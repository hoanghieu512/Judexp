import type { Entity } from '../domain/reduce';
import EntityRow from './EntityRow';

/**
 * What the search box answers with.
 *
 * The common case, by far, is that this person has never been met before.
 * That has to read as a real answer, not as a blank screen, because the
 * person reading it has a driver waiting and ten seconds to decide.
 */
export default function DecisionCard({
  results,
  now,
  onOpen,
}: {
  results: Entity[];
  now: Date;
  onOpen?: (key: string) => void;
}) {
  if (results.length === 0) {
    return (
      <p className="jx-empty" data-testid="no-match">
        Chưa gặp người này. Không có gì để nhớ lại.
      </p>
    );
  }

  return (
    <div className="jx-results">
      {results.map((entity) => (
        <EntityRow key={entity.key} entity={entity} now={now} onOpen={onOpen} />
      ))}
    </div>
  );
}
