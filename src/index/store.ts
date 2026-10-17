/**
 * The derived index.
 *
 * It lives in the app's own storage, never in the kho and never synced:
 * every device rebuilds it from the event files it has. Reading a file over
 * SAF costs milliseconds, and a year of use is thousands of files, so the
 * snapshot is what keeps opening the app instant: it carries the events
 * already read plus the cursor saying which files they came from.
 *
 * The snapshot stores raw events rather than folded state on purpose. When
 * the fold rules change in a later version, old snapshots still replay.
 */

import { applyEvents, emptyState, type State } from '../domain/reduce';
import { readNewEvents, type Cursor, type KhoDeps } from '../storage/kho';
import type { JudexpEvent } from '../domain/events';

const SNAPSHOT_VERSION = 1;

export interface Snapshot {
  schemaVersion: typeof SNAPSHOT_VERSION;
  /**
   * The events folder this snapshot was read from. There is one snapshot per
   * device, so without this a switch of kho would replay one kho's events
   * into another. Missing on snapshots written before it existed.
   */
  eventsUri?: string;
  cursor: Cursor;
  events: JudexpEvent[];
  /** Files that could not be used, carried so the warning outlives a restart. */
  skipped?: string[];
}

export interface IndexResult {
  state: State;
  snapshot: Snapshot;
  /** Event files that could not be used this round, for the UI to surface. */
  skipped: string[];
}

/**
 * Load the index, reading only what the snapshot has not seen. A snapshot
 * from an unknown version, or from another kho, is discarded rather than
 * trusted: a full rebuild costs seconds, a wrong replay costs correctness.
 */
export async function loadIndex(deps: KhoDeps, eventsUri: string, snapshot: Snapshot | null): Promise<IndexResult> {
  const usable =
    snapshot && snapshot.schemaVersion === SNAPSHOT_VERSION && snapshot.eventsUri === eventsUri ? snapshot : null;
  const base = usable ? applyEvents(emptyState(), usable.events) : emptyState();

  const { events, cursor, skipped } = await readNewEvents(deps, eventsUri, usable?.cursor ?? {});
  const state = applyEvents(base, events);
  const allSkipped = [...new Set([...(usable?.skipped ?? []), ...skipped])];

  return {
    state,
    snapshot: { schemaVersion: SNAPSHOT_VERSION, eventsUri, cursor, events: state.events, skipped: allSkipped },
    skipped: allSkipped,
  };
}

/** Throw the snapshot away and read the kho from the top. */
export async function rebuildIndex(deps: KhoDeps, eventsUri: string): Promise<IndexResult> {
  return loadIndex(deps, eventsUri, null);
}
