import { looksLikeFullPlate, looksLikePlate } from '../domain/keys';
import type { SearchHit } from '../search/fuzzy';
import EntityRow from './EntityRow';

/**
 * What the search box answers with.
 *
 * The common case, by far, is that this person has never been met before.
 * That has to read as a real answer, not as a blank screen, because the
 * person reading it has a driver waiting and ten seconds to decide.
 *
 * A whole plate names one vehicle, and one character off is another one
 * (§9.3). So once a whole plate is typed, only an exact match answers; a
 * plate that merely comes close is shown apart, under its own heading, so a
 * typo still finds the driver but its colour never reads as this plate's.
 */
export default function DecisionCard({
  query,
  hits,
  now,
  onOpen,
}: {
  query: string;
  hits: SearchHit[];
  now: Date;
  onOpen?: (key: string) => void;
}) {
  const wholePlate = looksLikeFullPlate(query);
  const answers = wholePlate ? hits.filter((hit) => hit.match === 'exact') : hits;
  const near = wholePlate ? hits.filter((hit) => hit.match !== 'exact') : [];

  const row = ({ entity }: SearchHit) => <EntityRow key={entity.key} entity={entity} now={now} onOpen={onOpen} />;

  return (
    <div className="jx-results">
      {answers.length > 0 ? (
        answers.map(row)
      ) : (
        <p className="jx-empty" data-testid="no-match">
          {/* A plate is a driver, anything else is somewhere to eat or go. */}
          {looksLikePlate(query) ? 'Chưa gặp người này.' : 'Chưa ghé chỗ này.'} Không có gì để nhớ lại.
        </p>
      )}
      {near.length > 0 && (
        <section className="jx-results" data-testid="near-plates" aria-labelledby="jx-near-title">
          <h2 className="jx-section-title" id="jx-near-title">
            Biển gần giống, có thể là xe khác
          </h2>
          {near.map(row)}
        </section>
      )}
    </div>
  );
}
