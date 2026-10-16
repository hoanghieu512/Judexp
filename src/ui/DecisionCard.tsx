import type { Entity } from '../domain/reduce';
import { looksLikePlate } from '../domain/keys';
import EntityRow from './EntityRow';

/**
 * What the search box answers with.
 *
 * The common case, by far, is that this person has never been met before.
 * That has to read as a real answer, not as a blank screen, because the
 * person reading it has a driver waiting and ten seconds to decide.
 */
export default function DecisionCard({
  query,
  results,
  now,
  onOpen,
}: {
  query: string;
  results: Entity[];
  now: Date;
  onOpen?: (key: string) => void;
}) {
  if (results.length === 0) {
    // A plate is a driver, anything else is somewhere to eat or go.
    const never = looksLikePlate(query) ? 'Chưa gặp người này.' : 'Chưa ghé chỗ này.';
    return (
      <p className="jx-empty" data-testid="no-match">
        {never} Không có gì để nhớ lại.
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
