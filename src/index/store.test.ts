import { describe, it, expect } from 'vitest';
import { loadIndex, rebuildIndex, type Snapshot } from './store';
import type { KhoDeps } from '../storage/kho';
import type { SafEntry } from '../plugins/saf';
import type { JudexpEvent } from '../domain/events';

function eventJson(id: string, key = '59H123456'): string {
  return JSON.stringify({
    schemaVersion: 1,
    eventId: id,
    type: 'encounter',
    author: 'huynh',
    device: 'zflip4',
    createdAt: `2026-10-16T1${id.length % 9}:00:00Z`,
    visibility: 'private',
    entityRef: { kind: 'driver', key },
    verdict: 'good',
  } satisfies Partial<JudexpEvent>);
}

function fakeKho(files: { name: string; content: string }[]) {
  let reads = 0;
  const entries: SafEntry[] = files.map((f, i) => ({
    name: f.name,
    isDirectory: false,
    uri: `content://kho/events/${f.name}`,
    size: f.content.length,
    lastModified: 100 + i,
  }));
  const byUri = new Map(files.map((f) => [`content://kho/events/${f.name}`, f.content]));

  const deps: KhoDeps = {
    saf: {
      async ensureDir({ parentUri, name }) {
        return { uri: `${parentUri}/${name}` };
      },
      async listFolder() {
        return { entries };
      },
      async readFile({ uri }) {
        reads += 1;
        return { data: byUri.get(uri)! };
      },
      async writeFile({ dirUri, name }) {
        return { uri: `${dirUri}/${name}` };
      },
    },
    log: () => {},
  };

  return { deps, reads: () => reads };
}

const EVENTS_URI = 'content://kho/events';
const twoFiles = [
  { name: 'a.json', content: eventJson('id-a') },
  { name: 'b.json', content: eventJson('id-b') },
];

describe('loadIndex', () => {
  it('builds state from scratch when there is no snapshot', async () => {
    const { deps, reads } = fakeKho(twoFiles);
    const { state, snapshot } = await loadIndex(deps, EVENTS_URI, null);
    expect(reads()).toBe(2);
    expect(state.entities.get('59H123456')!.encounters).toHaveLength(2);
    expect(snapshot.events).toHaveLength(2);
    expect(snapshot.schemaVersion).toBe(1);
  });

  it('reads only the files the snapshot has not seen', async () => {
    const { deps, reads } = fakeKho(twoFiles);
    const first = await loadIndex(deps, EVENTS_URI, null);
    const second = await loadIndex(deps, EVENTS_URI, first.snapshot);
    expect(reads()).toBe(2);
    expect(second.state.entities.get('59H123456')!.encounters).toHaveLength(2);
  });

  it('ignores a snapshot written by a different schema version', async () => {
    const { deps, reads } = fakeKho(twoFiles);
    const stale = { schemaVersion: 99, cursor: { 'a.json': { size: 1, lastModified: 1 } }, events: [] } as unknown as Snapshot;
    const { state } = await loadIndex(deps, EVENTS_URI, stale);
    expect(reads()).toBe(2);
    expect(state.entities.get('59H123456')!.encounters).toHaveLength(2);
  });
});

describe('rebuildIndex', () => {
  it('re-reads everything and ignores any snapshot', async () => {
    const { deps, reads } = fakeKho(twoFiles);
    const first = await loadIndex(deps, EVENTS_URI, null);
    expect(reads()).toBe(2);
    const rebuilt = await rebuildIndex(deps, EVENTS_URI);
    expect(reads()).toBe(4);
    expect(rebuilt.state.entities.get('59H123456')!.encounters).toHaveLength(2);
    expect(rebuilt.snapshot.events).toHaveLength(first.snapshot.events.length);
  });

  it('produces the same state whether built incrementally or rebuilt', async () => {
    const { deps } = fakeKho(twoFiles);
    const incremental = await loadIndex(deps, EVENTS_URI, (await loadIndex(deps, EVENTS_URI, null)).snapshot);
    const rebuilt = await rebuildIndex(deps, EVENTS_URI);
    const a = incremental.state.entities.get('59H123456')!;
    const b = rebuilt.state.entities.get('59H123456')!;
    expect(a).toEqual(b);
  });
});
