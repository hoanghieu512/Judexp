import { describe, it, expect } from 'vitest';
import { ensureKhoLayout, KhoUnreadableError, readNewEvents, readWorkerLog, writeEvent, type Cursor, type KhoDeps } from './kho';

const ROOT_URI = 'content://kho';
import type { SafEntry } from '../plugins/saf';
import type { JudexpEvent } from '../domain/events';

interface FakeFile {
  name: string;
  content: string;
  size?: number;
  lastModified?: number;
}

function fakeKho(files: FakeFile[] = [], options: { hideRoot?: boolean; listAs?: Record<string, string> } = {}) {
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
      // `listAs` names the folder already on disk for a requested name, the
      // way the plugin hands back "Events" when asked for "events".
      async ensureDir({ parentUri, name }) {
        dirs.push(name);
        return { uri: `${parentUri}/${options.listAs?.[name] ?? name}` };
      },
      // The root lists the folders ensured so far plus loose files (like
      // _worker.log); any other folder lists the files. `hideRoot` mimics the
      // provider bug seen on dGen1, where the root lists nothing at all.
      async listFolder({ uri }) {
        if (uri !== ROOT_URI) return { entries };
        if (options.hideRoot) return { entries: [] };
        const folders = dirs.map<SafEntry>((asked) => {
          const name = options.listAs?.[asked] ?? asked;
          return { name, isDirectory: true, uri: `${ROOT_URI}/${name}` };
        });
        return { entries: [...folders, ...entries] };
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

  // Seen on dGen1: Android hid the kho's children but still created folders,
  // so "events" became "events (1)" and writes went where nothing reads.
  it('refuses a kho whose root does not list the folders it just ensured', async () => {
    const { deps } = fakeKho([], { hideRoot: true });
    await expect(ensureKhoLayout(deps, ROOT_URI)).rejects.toBeInstanceOf(KhoUnreadableError);
  });

  it('refuses a kho when the plugin reports a folder it cannot see', async () => {
    const { deps } = fakeKho();
    deps.saf.ensureDir = async () => {
      throw Object.assign(new Error('events exists but is hidden'), { code: 'KHO_HIDDEN' });
    };
    await expect(ensureKhoLayout(deps, ROOT_URI)).rejects.toBeInstanceOf(KhoUnreadableError);
  });

  it('passes any other failure through unchanged', async () => {
    const { deps } = fakeKho();
    const boom = new Error('bad parent');
    deps.saf.ensureDir = async () => {
      throw boom;
    };
    await expect(ensureKhoLayout(deps, ROOT_URI)).rejects.toBe(boom);
  });

  // Reading `.code` off a bare rejection used to throw a TypeError that hid
  // what the plugin said.
  it.each([undefined, null])('passes a %s rejection through unchanged', async (reason) => {
    const { deps } = fakeKho();
    deps.saf.ensureDir = async () => {
      throw reason;
    };
    await expect(ensureKhoLayout(deps, ROOT_URI)).rejects.toBe(reason);
  });

  // UBS1's kho disk ignores case, so a kho holding "Events" already has the
  // events folder: the plugin hands that one back and the root lists it so.
  it('accepts a folder the root lists in another case', async () => {
    const { deps } = fakeKho([], { listAs: { events: 'Events' } });
    const layout = await ensureKhoLayout(deps, ROOT_URI);
    expect(layout.events).toBe('content://kho/Events');
  });

  it('still refuses a root that lists only a renamed copy', async () => {
    const { deps } = fakeKho([], { listAs: { events: 'events (1)' } });
    await expect(ensureKhoLayout(deps, ROOT_URI)).rejects.toBeInstanceOf(KhoUnreadableError);
  });

  // The plugin drops a null name from the entry, as a provider may send while
  // it hides the kho: that folder is not listed, and it must not crash.
  it('refuses a root that lists a folder without its name', async () => {
    const { deps } = fakeKho();
    const list = deps.saf.listFolder;
    deps.saf.listFolder = async (options) => {
      const { entries } = await list(options);
      return { entries: entries.map((e) => (e.name === 'events' ? { ...e, name: undefined as unknown as string } : e)) };
    };
    await expect(ensureKhoLayout(deps, ROOT_URI)).rejects.toBeInstanceOf(KhoUnreadableError);
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

  // Review Focus 1, the truly empty case: zero bytes, not merely bad JSON.
  it('skips a zero-byte file, then reads it once it has content, even with the same mtime', async () => {
    const empty = fakeKho([{ name: 'a.json', content: '', size: 0, lastModified: 5 }]);
    const first = await readNewEvents(empty.deps, EVENTS_URI, {});
    expect(first.events).toHaveLength(0);
    expect(first.skipped).toEqual(['a.json']);

    // Syncthing keeps the source's mtime, so only the size says it changed.
    const full = fakeKho([{ name: 'a.json', content: eventJson(), lastModified: 5 }]);
    const second = await readNewEvents(full.deps, EVENTS_URI, first.cursor);
    expect(second.events).toHaveLength(1);
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

describe('readWorkerLog', () => {
  const ROOT = 'content://kho';

  function rootWith(files: FakeFile[]) {
    const kho = fakeKho(files);
    const listed: string[] = [];
    const list = kho.deps.saf.listFolder;
    kho.deps.saf.listFolder = async (opts) => {
      listed.push(opts.uri);
      return list(opts);
    };
    return { ...kho, listed };
  }

  it('reads _worker.log from the kho root, last lines only', async () => {
    const lines = Array.from({ length: 60 }, (_, i) => `line ${i + 1}`);
    const { deps, listed } = rootWith([{ name: '_worker.log', content: lines.join('\n') + '\n' }]);
    const log = await readWorkerLog(deps, ROOT, 40);
    expect(listed).toEqual([ROOT]);
    expect(log.split('\n')).toEqual(lines.slice(20));
  });

  it('returns nothing when the worker has never written a log', async () => {
    const { deps } = rootWith([]);
    expect(await readWorkerLog(deps, ROOT)).toBe('');
  });

  it('returns nothing and says so in the kho log when the file cannot be read', async () => {
    const { deps, logged } = rootWith([{ name: '_worker.log', content: 'x' }]);
    deps.saf.readFile = async () => {
      throw new Error('gone');
    };
    expect(await readWorkerLog(deps, ROOT)).toBe('');
    expect(logged.join(' ')).toContain('_worker.log');
  });
});
