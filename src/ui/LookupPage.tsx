import { useEffect, useMemo, useRef, useState } from 'react';
import { searchEntities } from '../search/fuzzy';
import { instant, type Entity, type State } from '../domain/reduce';
import DecisionCard from './DecisionCard';
import EntityRow from './EntityRow';
import './ui.css';

const RECENT_LIMIT = 10;

/** Entities met most recently, for the screen before anything is typed. */
function recentlyMet(state: State, limit = RECENT_LIMIT): Entity[] {
  return [...state.entities.values()]
    .filter((e) => !e.mergedInto && e.encounters.length > 0)
    .sort((a, b) => instant(b.lastSeen) - instant(a.lastSeen))
    .slice(0, limit);
}

/**
 * The default screen. Nine times out of ten the app is opened to look
 * something up, so the keyboard is already waiting.
 */
export default function LookupPage({
  state,
  now,
  onOpen,
}: {
  state: State;
  now: Date;
  onOpen?: (key: string) => void;
}) {
  const [query, setQuery] = useState('');
  const box = useRef<HTMLInputElement>(null);

  useEffect(() => {
    box.current?.focus();
  }, []);

  const results = useMemo(() => searchEntities(state, query), [state, query]);
  const recent = useMemo(() => recentlyMet(state), [state]);
  const typing = query.trim() !== '';

  return (
    <div className="jx-screen">
      <input
        ref={box}
        type="search"
        className="jx-search"
        placeholder="Biển số hoặc tên quán"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {typing ? (
        <DecisionCard results={results} now={now} onOpen={onOpen} />
      ) : (
        <>
          <h2 className="jx-section-title">Gặp gần đây</h2>
          {recent.map((entity) => (
            <EntityRow key={entity.key} entity={entity} now={now} onOpen={onOpen} />
          ))}
        </>
      )}
    </div>
  );
}
