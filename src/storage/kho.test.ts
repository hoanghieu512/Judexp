import { describe, it, expect } from 'vitest';
import { ensureKhoLayout, readNewEvents, writeEvent, type Cursor, type KhoDeps } from './kho';
import type { SafEntry } from '../plugins/saf';
import type { JudexpEvent } from '../domain/events';

interface FakeFile {
  name: string;
  content: string;
  size?: number;
  lastModified?: number;
}

function fakeKho(files: FakeFile[] = []) {
  const logged: string[] = [];
  const written: { dirUri: string; name: string; content: string }[] = [];
  const dirs: string[] = [];
  const byUri = new Map<string, string>();
  const entries: SafEntry[] = files.map((f, i) => {
    const uri = `content://kho/events/${f.name}`;
    byUri.set(uri, f.content);
    return {
      name: f.name,
      isDirectory: false,
      uri,
      size: f.size ?? f.content.length,
      lastModified: f.lastModified ?? 1000 + i,
    };
  });

  const deps: KhoDeps = {
    saf: {
      async ensureDir({ parentUri, name }) {
        dirs.push(name);
        return { uri: `${parentUri}/${name}` };
      },
      async listFolder() {
        return { entries };
      },
      async readFile({ uri }) {
        const data = byUri.get(uri);
        if (data === undefined) throw new Error(`gone: ${uri}`);
        return { data };
      },
      async writeFile({ dirUri, name, content }) {
        written.push({ dirUri, name, content });
        return { uri: `${dirUri}/${name}` };
      },
    },
    log: (msg) => logged.push(msg),
  };

  return { deps, logged, written, dirs };
}

function eventJson(over: Partial<JudexpEvent> = {}): string {
  return JSON.stringify({
    schemaVersion: 1,
    eventId: 'a3f9c21d-7b44-4c2e-9f10-2c7a51d9e001',
    type: 'encounter',
    author: 'huynh',
    device: 'zflip4',
    createdAt: '2026-10-16T19:03:22+07:00',
    visibility: 'private',
    entityRef: { kind: 'driver', key: '59H123456' },
    verdict: 'bad',
    ...over,
  });
}

const EVENTS_URI = 'content://kho/events';

describe('ensureKhoLayout', () => {
  it('creates the four kho folders', async () => {
    const { deps, dirs } = fakeKho();
    const layout = await ensureKhoLayout(deps, 'content://kho');
    expect(dirs).toEqual(['events', 'inbox', 'parsed', 'attachments']);
    expect(layout.events).toBe('content://kho/events');
    expect(layout.attachments).toBe('content://kho/attachments');
  });
});

describe('writeEvent', () => {
  it('writes an event under its canonical file name', async () => {
    const { deps, written } = fakeKho();
    const event = JSON.parse(eventJson()) as JudexpEvent;
    await writeEvent(deps, EVENTS_URI, event);
    expect(written).toHaveLength(1);
    expect(written[0].name).toBe('20261016T120322Z_zflip4_a3f9c21.json');
    expect(JSON.parse(written[0].content).eventId).toBe(event.eventId);
  });
});

describe('readNewEvents', () => {
  it('reads every file when the cursor is empty', async () => {
    const { deps } = fakeKho([{ name: 'a.json', content: eventJson() }]);
    const r = await readNewEvents(deps, EVENTS_URI, {});
    expect(r.events).toHaveLength(1);
    expect(r.cursor['a.json']).toBeDefined();
  });

  it('reads only files the cursor has not seen', async () => {
    const { deps } = fakeKho([
      { name: 'a.json', content: eventJson({ eventId: 'id-a' }), size: 10, lastModified: 1 },
      { name: 'b.json', content: eventJson({ eventId: 'id-b' }), size: 20, lastModified: 2 },
    ]);
    const cursor: Cursor = { 'a.json': { size: 10, lastModified: 1 } };
    const r = await readNewEvents(deps, EVENTS_URI, cursor);
    expect(r.events.map((e) => e.eventId)).toEqual(['id-b']);
  });

  it('re-reads a file whose size or lastModified changed', async () => {
    const { deps } = fakeKho([{ name: 'a.json', content: eventJson(), size: 99, lastModified: 7 }]);
    const r = await readNewEvents(deps, EVENTS_URI, { 'a.json': { size: 10, lastModified: 1 } });
    expect(r.events).toHaveLength(1);
  });

  // Review Focus 1
  it('skips a malformed file and still returns the good ones', async () => {
    const { deps } = fakeKho([
      { name: 'broken.json', content: '{oops' },
      { name: 'good.json', content: eventJson() },
    ]);
    const r = await readNewEvents(deps, EVENTS_URI, {});
    expect(r.events).toHaveLength(1);
    expect(r.skipped).toEqual(['broken.json']);
    expect(r.cursor['broken.json']).toBeDefined();
  });

  // Review Focus 2
  it('ignores .sync-conflict files and logs them', async () => {
    const { deps, logged } = fakeKho([
      { name: 'a.sync-conflict-20261016-120000-ABCDEFG.json', content: eventJson() },
    ]);
    const r = await readNewEvents(deps, EVENTS_URI, {});
    expect(r.events).toHaveLength(0);
    expect(logged.join(' ')).toContain('sync-conflict');
  });

  // Review Focus 3
  it('re-reads a file whose size and lastModified are -1', async () => {
    const { deps } = fakeKho([{ name: 'a.json', content: eventJson(), size: -1, lastModified: -1 }]);
    const r = await readNewEvents(deps, EVENTS_URI, { 'a.json': { size: -1, lastModified: -1 } });
    expect(r.events).toHaveLength(1);
  });

  it('skips directories and non-json entries', async () => {
    const { deps } = fakeKho([{ name: '_worker.log', content: 'noise' }]);
    const r = await readNewEvents(deps, EVENTS_URI, {});
    expect(r.events).toHaveLength(0);
    expect(r.skipped).toHaveLength(0);
  });

  it('survives a file that disappeared between listing and reading', async () => {
    const { deps } = fakeKho([{ name: 'a.json', content: eventJson() }]);
    deps.saf.readFile = async () => {
      throw new Error('gone');
    };
    const r = await readNewEvents(deps, EVENTS_URI, {});
    expect(r.events).toHaveLength(0);
    expect(r.skipped).toEqual(['a.json']);
  });
});
