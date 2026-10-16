/**
 * Event schema v1.
 *
 * Every file under `events/` is one thing that happened and is never edited
 * again: corrections are new `amend` events, deletions are `tombstone`
 * events. Two devices therefore never touch the same file, which is why a
 * sync conflict cannot happen by construction.
 */

export type EventType = 'encounter' | 'attach' | 'amend' | 'merge' | 'tombstone';
export type Verdict = 'good' | 'ok' | 'bad';
export type EntityKind = 'driver' | 'restaurant' | 'dish' | 'place';
export type Visibility = 'private' | 'shared';

export interface EntityRef {
  kind: EntityKind;
  /** Normalized key, see domain/keys.ts. */
  key: string;
  /** What the name looked like at the time; labels change, keys do not. */
  label?: string;
}

export interface Geo {
  lat: number;
  lng: number;
  /** Metres of uncertainty. Above 100 it must not drive a merge suggestion. */
  accuracy?: number;
}

export interface EventContext {
  app?: string;
  price?: number;
  route?: string;
  happenedAt?: string;
  geo?: Geo;
  /** Features read at decide-time, collected so a future score can be calibrated. */
  driverStars?: number;
  vehicleType?: string;
  distanceKm?: number;
  durationMin?: number;
}

export type SourceKind = 'share_booking' | 'share_history' | 'camera' | 'manual';
export type ImageKind = 'booking' | 'history_list' | 'order_detail' | 'signboard' | 'unknown';

export interface EventSource {
  kind: SourceKind;
  imageRef?: string;
  imageKind?: ImageKind;
  /** Encounters produced from one image share this. */
  batchRef?: string;
  rowIndex?: number;
  parsedBy?: string;
  confidence?: number;
}

export interface JudexpEvent {
  schemaVersion: 1;
  eventId: string;
  type: EventType;
  author: string;
  device: string;
  createdAt: string;
  visibility: Visibility;
  entityRef?: EntityRef | null;
  /** null means the meeting happened but was never rated. */
  verdict?: Verdict | null;
  tags?: string[];
  note?: string;
  context?: EventContext;
  source?: EventSource;
  /** attach, amend and tombstone point at the event they act on. */
  targetEventId?: string;
  /** merge folds one entity key into another. */
  fromKey?: string;
  intoKey?: string;
}

const SCHEMA_VERSION = 1;

/**
 * `20261016T120322Z_zflip4_a3f9c21.json`.
 *
 * Sorting by name happens to sort by time, which helps a human reading the
 * folder. Program logic sorts by `createdAt` instead, because two devices
 * can disagree about the clock.
 */
export function eventFileName(e: JudexpEvent): string {
  const stamp = new Date(e.createdAt).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const short = e.eventId.replace(/-/g, '').slice(0, 7);
  return `${stamp}_${e.device}_${short}.json`;
}

/**
 * Parse one event file. Returns null instead of throwing: a half-synced or
 * truncated file must cost that one file, never the whole index build.
 */
export function parseEvent(raw: string): JudexpEvent | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;

  const e = value as Partial<JudexpEvent>;
  if (e.schemaVersion !== SCHEMA_VERSION) return null;
  if (typeof e.eventId !== 'string' || e.eventId === '') return null;
  if (typeof e.type !== 'string') return null;
  if (typeof e.createdAt !== 'string' || Number.isNaN(Date.parse(e.createdAt))) return null;

  return e as JudexpEvent;
}

export interface NewEncounterInput {
  author: string;
  device: string;
  entityRef?: EntityRef | null;
  verdict?: Verdict | null;
  tags?: string[];
  note?: string;
  context?: EventContext;
  source?: EventSource;
  /** Injectable so tests do not depend on the clock or on randomness. */
  now?: Date;
  eventId?: string;
}

export function newEncounter(input: NewEncounterInput): JudexpEvent {
  const { now, eventId, ...rest } = input;
  return {
    schemaVersion: SCHEMA_VERSION,
    eventId: eventId ?? crypto.randomUUID(),
    type: 'encounter',
    createdAt: (now ?? new Date()).toISOString(),
    visibility: 'private',
    ...rest,
  };
}
