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

function entityFor(entities: Map<string, Entity>, e: JudexpEvent): Entity {
  const ref = e.entityRef!;
  let entity = entities.get(ref.key);
  if (!entity) {
    entity = {
      key: ref.key,
      kind: ref.kind,
      labels: [],
      firstSeen: e.createdAt,
      lastSeen: e.createdAt,
      encounters: [],
    };
    entities.set(ref.key, entity);
  }
  if (ref.label && !entity.labels.includes(ref.label)) entity.labels.push(ref.label);
  if (e.createdAt < entity.firstSeen) entity.firstSeen = e.createdAt;
  if (e.createdAt > entity.lastSeen) entity.lastSeen = e.createdAt;
  return entity;
}

function findEncounter(state: { entities: Map<string, Entity>; pending: Map<string, Encounter> }, eventId: string): Encounter | undefined {
  const waiting = state.pending.get(eventId);
  if (waiting) return waiting;
  for (const entity of state.entities.values()) {
    const found = entity.encounters.find((enc) => enc.eventId === eventId);
    if (found) return found;
  }
  return undefined;
}

/**
 * Add events to the state and refold. Events already present, by event id,
 * are ignored, so reading a file twice changes nothing.
 */
export function applyEvents(state: State, events: JudexpEvent[]): State {
  const byId = new Map(state.events.map((e) => [e.eventId, e]));
  for (const e of events) if (!byId.has(e.eventId)) byId.set(e.eventId, e);

  const ordered = [...byId.values()].sort((a, b) =>
    a.createdAt === b.createdAt ? a.eventId.localeCompare(b.eventId) : a.createdAt.localeCompare(b.createdAt),
  );

  const hidden = new Set<string>();
  for (const e of ordered) {
    if (e.type === 'tombstone' && e.targetEventId) hidden.add(e.targetEventId);
  }

  const next: State = { events: ordered, entities: new Map(), pending: new Map() };

  for (const e of ordered) {
    if (hidden.has(e.eventId)) continue;

    switch (e.type) {
      case 'encounter': {
        const enc = encounterOf(e);
        if (e.entityRef) entityFor(next.entities, e).encounters.push(enc);
        else next.pending.set(e.eventId, enc);
        break;
      }
      case 'attach': {
        const enc = e.targetEventId ? next.pending.get(e.targetEventId) : undefined;
        if (enc && e.entityRef) {
          next.pending.delete(e.targetEventId!);
          entityFor(next.entities, e).encounters.push(enc);
        }
        break;
      }
      case 'amend': {
        const enc = e.targetEventId ? findEncounter(next, e.targetEventId) : undefined;
        if (enc) {
          if (e.verdict !== undefined) enc.verdict = e.verdict;
          if (e.tags !== undefined) enc.tags = e.tags;
          if (e.note !== undefined) enc.note = e.note;
        }
        break;
      }
      case 'merge': {
        const from = e.fromKey ? next.entities.get(e.fromKey) : undefined;
        const into = e.intoKey ? next.entities.get(e.intoKey) : undefined;
        if (from && into && from !== into) {
          into.encounters.push(...from.encounters);
          for (const label of from.labels) if (!into.labels.includes(label)) into.labels.push(label);
          if (from.firstSeen < into.firstSeen) into.firstSeen = from.firstSeen;
          if (from.lastSeen > into.lastSeen) into.lastSeen = from.lastSeen;
          from.encounters = [];
          from.mergedInto = into.key;
        }
        break;
      }
      case 'tombstone':
        break;
    }
  }

  return next;
}
