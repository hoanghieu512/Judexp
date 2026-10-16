/**
 * Reading and writing the kho folder through Storage Access Framework.
 *
 * The kho is a plain folder that Syncthing replicates, so this layer never
 * edits a file: it only appends new event files and reads the ones it has
 * not read yet. Everything it touches can be half-written, truncated or
 * gone by the time it is read, because another device may be syncing the
 * same folder right now. One bad file costs that file, never the lot.
 */

import { eventFileName, parseEvent, type JudexpEvent } from '../domain/events';
import type { SafPlugin } from '../plugins/saf';

/** What was read last time, keyed by file name. */
export type Cursor = Record<string, { size: number; lastModified: number }>;

export interface KhoDeps {
  saf: Pick<SafPlugin, 'listFolder' | 'readFile' | 'writeFile' | 'ensureDir'>;
  log: (msg: string) => void;
}

export interface KhoDirs {
  events: string;
  inbox: string;
  parsed: string;
  attachments: string;
}

const SUBFOLDERS = ['events', 'inbox', 'parsed', 'attachments'] as const;

export async function ensureKhoLayout(deps: KhoDeps, rootUri: string): Promise<KhoDirs> {
  const dirs = {} as KhoDirs;
  for (const name of SUBFOLDERS) {
    const { uri } = await deps.saf.ensureDir({ parentUri: rootUri, name });
    dirs[name] = uri;
  }
  return dirs;
}

export async function writeEvent(deps: KhoDeps, eventsUri: string, event: JudexpEvent): Promise<void> {
  await deps.saf.writeFile({
    dirUri: eventsUri,
    name: eventFileName(event),
    content: JSON.stringify(event),
  });
}

/**
 * A file counts as unread when the cursor has never seen it, when its size
 * or lastModified is missing or -1, or when either value differs from what
 * the cursor holds.
 *
 * The -1 case matters: some DocumentsProviders do not return those columns,
 * and treating two -1 readings as equal would silently drop events.
 */
function isUnread(name: string, size: number | undefined, lastModified: number | undefined, cursor: Cursor): boolean {
  const seen = cursor[name];
  if (!seen) return true;
  if (size === undefined || lastModified === undefined) return true;
  if (size === -1 || lastModified === -1) return true;
  return seen.size !== size || seen.lastModified !== lastModified;
}

export async function readNewEvents(
  deps: KhoDeps,
  eventsUri: string,
  cursor: Cursor,
): Promise<{ events: JudexpEvent[]; cursor: Cursor; skipped: string[] }> {
  const { entries } = await deps.saf.listFolder({ uri: eventsUri });
  const nextCursor: Cursor = { ...cursor };
  const events: JudexpEvent[] = [];
  const skipped: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    if (!entry.name.endsWith('.json')) continue;

    if (entry.name.includes('.sync-conflict')) {
      deps.log(`skipping sync-conflict file: ${entry.name}`);
      continue;
    }

    if (!isUnread(entry.name, entry.size, entry.lastModified, cursor)) continue;

    let raw: string;
    try {
      raw = (await deps.saf.readFile({ uri: entry.uri })).data;
    } catch {
      deps.log(`could not read ${entry.name}, skipping`);
      skipped.push(entry.name);
      continue;
    }

    const event = parseEvent(raw);
    // Record the file either way: a file that is malformed now stays
    // malformed, and re-reading it on every open buys nothing.
    nextCursor[entry.name] = { size: entry.size ?? -1, lastModified: entry.lastModified ?? -1 };

    if (!event) {
      deps.log(`malformed event file, skipping: ${entry.name}`);
      skipped.push(entry.name);
      continue;
    }
    events.push(event);
  }

  return { events, cursor: nextCursor, skipped };
}
