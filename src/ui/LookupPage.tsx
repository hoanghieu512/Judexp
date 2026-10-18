import { useEffect, useMemo, useRef, useState } from 'react';
import { searchEntities } from '../search/fuzzy';
import { lookupTarget } from '../search/lookupTarget';
import type { LookupTarget } from '../domain/reminders';
import { instant, type Entity, type State } from '../domain/reduce';
import DecisionCard from './DecisionCard';
import EntityRow from './EntityRow';
import './ui.css';

const RECENT_LIMIT = 10;
/** How long the box must stay still before a lookup counts as finished. */
export const SETTLE_MS = 2500;

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
  onLookup,
}: {
  state: State;
  now: Date;
  onOpen?: (key: string) => void;
  /** A lookup that clearly names one entity has finished (§9.3 reminder). */
  onLookup?: (target: LookupTarget) => void;
}) {
  const [query, setQuery] = useState('');
  const box = useRef<HTMLInputElement>(null);
  // `${query}\u0000${key}` of the last report, so a refresh of the index or a
  // tap on the row already reported does not report the same lookup again.
  const reported = useRef<string | null>(null);
  const report = useRef(onLookup);
  useEffect(() => {
    report.current = onLookup;
  });

  useEffect(() => {
    box.current?.focus();
  }, []);

  const results = useMemo(() => searchEntities(state, query), [state, query]);
  const recent = useMemo(() => recentlyMet(state), [state]);
  const typing = query.trim() !== '';

  function reportOnce(typed: string, target: LookupTarget) {
    const mark = `${typed}\u0000${target.key}`;
    if (reported.current === mark) return;
    reported.current = mark;
    report.current?.(target);
  }

  // A lookup is finished once the box stays still: typing "2345" on the way to
  // "23456" must not leave a reminder for whatever "2345" matched.
  useEffect(() => {
    const typed = query.trim();
    if (typed === '') return;
    const timer = setTimeout(() => {
      const target = lookupTarget(typed, results);
      if (target) reportOnce(typed, target);
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [query, results]);

  // Opening a result is the clearest sign of which one was meant.
  function openResult(key: string) {
    const typed = query.trim();
    const entity = results.find((e) => e.key === key);
    if (typed !== '' && entity) {
      reportOnce(typed, { kind: entity.kind, key: entity.key, label: entity.labels[entity.labels.length - 1] ?? entity.key });
    }
    onOpen?.(key);
  }

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
        <DecisionCard query={query} results={results} now={now} onOpen={openResult} />
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
