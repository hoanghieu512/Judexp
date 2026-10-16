/**
 * Fold events into the state the app looks things up in.
 *
 * The state is derived: it is rebuilt from the event files and never synced.
 * `applyEvents` keeps the deduplicated event list and folds it from scratch,
 * which is what makes replaying the same file twice a no-op and makes
 * undoing a merge nothing more special than dropping one event.
 */

import type { EntityKind, EventContext, JudexpEvent, Verdict } from './events';

export interface Encounter {
  eventId: string;
  verdict: Verdict | null;
  tags: string[];
  note?: string;
  /** When it actually happened, falling back to when it was written down. */
  happenedAt: string;
  context?: EventContext;
}

export interface Entity {
  key: string;
  kind: EntityKind;
  /** Every name this entity has ever been seen under, oldest first. */
  labels: string[];
  firstSeen: string;
  lastSeen: string;
  encounters: Encounter[];
  /** Set when a merge folded this key into another one. */
  mergedInto?: string;
}

export interface State {
  /** Deduplicated, the raw material every other field is folded from. */
  events: JudexpEvent[];
  entities: Map<string, Entity>;
  /** Encounters whose entity is not known yet, keyed by their event id. */
  pending: Map<string, Encounter>;
}

/** An instant, not the text of a timestamp: two devices write different offsets. */
function instant(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

export function emptyState(): State {
  return { events: [], entities: new Map(), pending: new Map() };
}

function encounterOf(e: JudexpEvent): Encounter {
  return {
    eventId: e.eventId,
    verdict: e.verdict ?? null,
    tags: e.tags ?? [],
    note: e.note,
    happenedAt: e.context?.happenedAt ?? e.createdAt,
    context: e.context,
  };
}

function touchEntity(entity: Entity, e: JudexpEvent, label?: string): void {
  if (label && !entity.labels.includes(label)) entity.labels.push(label);
  if (instant(e.createdAt) < instant(entity.firstSeen)) entity.firstSeen = e.createdAt;
  if (instant(e.createdAt) > instant(entity.lastSeen)) entity.lastSeen = e.createdAt;
}

function entityAt(entities: Map<string, Entity>, key: string, kind: EntityKind, e: JudexpEvent): Entity {
  let entity = entities.get(key);
  if (!entity) {
    entity = { key, kind, labels: [], firstSeen: e.createdAt, lastSeen: e.createdAt, encounters: [] };
    entities.set(key, entity);
  }
  return entity;
}

function findEncounter(
  state: { entities: Map<string, Entity>; pending: Map<string, Encounter> },
  eventId: string,
): Encounter | undefined {
  const waiting = state.pending.get(eventId);
  if (waiting) return waiting;
  for (const entity of state.entities.values()) {
    const found = entity.encounters.find((enc) => enc.eventId === eventId);
    if (found) return found;
  }
  return undefined;
}

/**
 * Add events to the state and refold. Events already present, by event id, are
 * ignored, so reading a file twice changes nothing.
 *
 * The fold runs in passes rather than in one sweep, because arrival order is
 * not something two phones agree on. Merges are collected first, so a rating
 * written under a key that was merged away still lands on the surviving
 * entity. Corrections run last, so a correction dated before the thing it
 * corrects is still applied instead of being silently dropped.
 */
export function applyEvents(state: State, events: JudexpEvent[]): State {
  const byId = new Map(state.events.map((e) => [e.eventId, e]));
  for (const e of events) if (!byId.has(e.eventId)) byId.set(e.eventId, e);

  const ordered = [...byId.values()].sort((a, b) => {
    const diff = instant(a.createdAt) - instant(b.createdAt);
    return diff !== 0 ? diff : a.eventId.localeCompare(b.eventId);
  });

  const hidden = new Set<string>();
  for (const e of ordered) {
    if (e.type === 'tombstone' && e.targetEventId) hidden.add(e.targetEventId);
  }
  const live = ordered.filter((e) => !hidden.has(e.eventId));

  // Pass 1: where every merged key ends up, following chains.
  const mergedInto = new Map<string, string>();
  for (const e of live) {
    if (e.type !== 'merge' || !e.fromKey || !e.intoKey || e.fromKey === e.intoKey) continue;
    mergedInto.set(e.fromKey, e.intoKey);
  }
  const resolve = (key: string): string => {
    let current = key;
    for (let hops = 0; hops < 16; hops += 1) {
      const next = mergedInto.get(current);
      if (next === undefined || next === current) return current;
      current = next;
    }
    return current;
  };

  const next: State = { events: ordered, entities: new Map(), pending: new Map() };

  // Pass 2: encounters, each one placed on the entity its key resolves to.
  for (const e of live) {
    if (e.type !== 'encounter') continue;
    const enc = encounterOf(e);
    if (!e.entityRef) {
      next.pending.set(e.eventId, enc);
      continue;
    }
    const entity = entityAt(next.entities, resolve(e.entityRef.key), e.entityRef.kind, e);
    touchEntity(entity, e, e.entityRef.label);
    entity.encounters.push(enc);
  }

  // Pass 3: attach, which can arrive dated before the encounter it names.
  for (const e of live) {
    if (e.type !== 'attach' || !e.targetEventId || !e.entityRef) continue;
    const enc = next.pending.get(e.targetEventId);
    if (!enc) continue;
    next.pending.delete(e.targetEventId);
    const entity = entityAt(next.entities, resolve(e.entityRef.key), e.entityRef.kind, e);
    touchEntity(entity, e, e.entityRef.label);
    entity.encounters.push(enc);
  }

  // Pass 4: corrections, once every encounter has a home.
  for (const e of live) {
    if (e.type !== 'amend' || !e.targetEventId) continue;
    const enc = findEncounter(next, e.targetEventId);
    if (!enc) continue;
    if (e.verdict !== undefined) enc.verdict = e.verdict;
    if (e.tags !== undefined) enc.tags = e.tags;
    if (e.note !== undefined) enc.note = e.note;
  }

  // Pass 5: keep every merged-away key reachable, pointing at its survivor.
  for (const e of live) {
    if (e.type !== 'merge' || !e.fromKey || !e.intoKey || e.fromKey === e.intoKey) continue;
    const target = next.entities.get(resolve(e.fromKey));
    const stub = entityAt(next.entities, e.fromKey, target?.kind ?? 'restaurant', e);
    stub.mergedInto = resolve(e.fromKey);
    if (target && target !== stub) {
      if (instant(stub.firstSeen) < instant(target.firstSeen)) target.firstSeen = stub.firstSeen;
    }
  }

  // Encounters are kept oldest first, the order the rest of the app expects.
  for (const entity of next.entities.values()) {
    entity.encounters.sort((a, b) => instant(a.happenedAt) - instant(b.happenedAt));
  }

  return next;
}
