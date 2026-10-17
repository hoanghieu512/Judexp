import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AppShell from './AppShell';
import type { KhoDeps } from './storage/kho';
import type { PrefsStore } from './profile/settings';
import type { SafEntry } from './plugins/saf';
import type { SnapshotStore } from './index/snapshotStore';

const NOW = new Date('2026-10-16T12:00:00Z');

const ROOT_URI = 'content://kho';

/** A kho that remembers what the app writes into it. */
function fakeKho() {
  const files = new Map<string, string>();
  const folders: string[] = [];
  /** Set to mimic Android hiding the kho's children, as seen on dGen1. */
  const view = { hidden: false };
  const entries = () =>
    [...files.keys()].map<SafEntry>((name) => ({
      name,
      isDirectory: false,
      uri: `content://kho/events/${name}`,
      size: files.get(name)!.length,
      lastModified: 1,
    }));

  const deps: KhoDeps = {
    saf: {
      async ensureDir({ parentUri, name }) {
        if (!folders.includes(name)) folders.push(name);
        return { uri: `${parentUri}/${name}` };
      },
      // Like a real kho, the root lists its folders as well as loose files.
      async listFolder({ uri }) {
        if (view.hidden) return { entries: [] };
        if (uri !== ROOT_URI) return { entries: entries() };
        const dirs = folders.map<SafEntry>((name) => ({ name, isDirectory: true, uri: `${ROOT_URI}/${name}` }));
        return { entries: [...dirs, ...entries()] };
      },
      async readFile({ uri }) {
        return { data: files.get(uri.split('/').pop()!)! };
      },
      async writeFile({ dirUri, name, content }) {
        files.set(name, content);
        return { uri: `${dirUri}/${name}` };
      },
    },
    log: () => {},
  };
  return { deps, files, view };
}

function fakePrefs(seed: Record<string, string> = {}): PrefsStore {
  const data = new Map(Object.entries(seed));
  return {
    async get(key) {
      return data.get(key) ?? null;
    },
    async set(key, value) {
      data.set(key, value);
    },
    async remove(key) {
      data.delete(key);
    },
  };
}

/** The index snapshot store, kept in memory instead of a file. */
function memorySnapshots(seed: string | null = null): SnapshotStore & { stored: () => string | null } {
  let stored = seed;
  return {
    async read() {
      return stored;
    },
    async write(json) {
      stored = json;
    },
    stored: () => stored,
  };
}

describe('AppShell', () => {
  it('asks for a kho folder before anything else', async () => {
    const { deps } = fakeKho();
    render(<AppShell deps={deps} prefs={fakePrefs()} snapshots={memorySnapshots()} clock={() => NOW} />);
    expect(await screen.findByRole('button', { name: /chọn folder kho/i })).toBeInTheDocument();
  });

  it('writes a rating into the kho and finds it again by plate', async () => {
    const { deps, files } = fakeKho();
    const prefs = fakePrefs({
      'judexp.kho': JSON.stringify({ rootUri: 'content://kho', label: 'Hieu' }),
      'judexp.device': 'dgen1',
    });

    render(<AppShell deps={deps} prefs={prefs} snapshots={memorySnapshots()} clock={() => NOW} />);

    fireEvent.click(await screen.findByRole('button', { name: /chấm nhanh/i }));
    fireEvent.change(screen.getByLabelText(/biển số/i), { target: { value: '59H1-234.56' } });
    fireEvent.click(screen.getByRole('button', { name: /^xấu$/i }));
    fireEvent.click(screen.getByRole('button', { name: 'chạy ẩu' }));
    fireEvent.click(screen.getByRole('button', { name: /lưu/i }));

    await waitFor(() => expect(files.size).toBe(1));
    const written = JSON.parse([...files.values()][0]);
    expect(written.entityRef.key).toBe('59H123456');
    expect(written.author).toBe('hieu');
    expect(written.device).toBe('dgen1');

    fireEvent.change(await screen.findByRole('searchbox'), { target: { value: '23456' } });
    expect(await screen.findByTestId('entity-59H123456')).toHaveAttribute('data-color', 'red');
  });
});

describe('AppShell, index snapshot', () => {
  it('keeps the index snapshot out of Preferences', async () => {
    const { deps } = fakeKho();
    const prefs = fakePrefs({ 'judexp.kho': JSON.stringify({ rootUri: 'content://kho', label: 'Hieu' }) });
    const snapshots = memorySnapshots();
    render(<AppShell deps={deps} prefs={prefs} snapshots={snapshots} clock={() => NOW} />);

    fireEvent.click(await screen.findByRole('button', { name: /chấm nhanh/i }));
    fireEvent.change(screen.getByLabelText(/biển số/i), { target: { value: '59H1-234.56' } });
    fireEvent.click(screen.getByRole('button', { name: /^tốt$/i }));
    fireEvent.click(screen.getByRole('button', { name: /lưu/i }));

    await waitFor(() => expect(JSON.parse(snapshots.stored() ?? '{}').events).toHaveLength(1));
    expect(await prefs.get('judexp.snapshot')).toBeNull();
  });

  it('drops the snapshot an older version left in Preferences', async () => {
    const { deps } = fakeKho();
    const prefs = fakePrefs({
      'judexp.kho': JSON.stringify({ rootUri: 'content://kho', label: 'Hieu' }),
      'judexp.snapshot': JSON.stringify({ schemaVersion: 1, cursor: {}, events: [] }),
    });
    render(<AppShell deps={deps} prefs={prefs} snapshots={memorySnapshots()} clock={() => NOW} />);
    await screen.findByRole('searchbox');
    await waitFor(async () => expect(await prefs.get('judexp.snapshot')).toBeNull());
  });
});

describe('AppShell, worker log', () => {
  it('shows what the worker wrote in _worker.log when Settings opens', async () => {
    const { deps, files } = fakeKho();
    files.set('_worker.log', '2026-10-16 22:00 parsed 3 images\n');
    const prefs = fakePrefs({ 'judexp.kho': JSON.stringify({ rootUri: 'content://kho', label: 'Hieu' }) });
    render(<AppShell deps={deps} prefs={prefs} snapshots={memorySnapshots()} clock={() => NOW} />);

    fireEvent.click(await screen.findByRole('button', { name: /cài đặt/i }));
    await waitFor(() => expect(screen.getByTestId('worker-log')).toHaveTextContent('parsed 3 images'));
  });
});

describe('AppShell, when the app stays open across midnight', () => {
  function seededKho() {
    const kho = fakeKho();
    kho.files.set(
      '20261016T100000Z_dgen1_a3f9c21.json',
      JSON.stringify({
        schemaVersion: 1,
        eventId: 'a3f9c21d-7b44-4c2e-9f10-2c7a51d9e001',
        type: 'encounter',
        author: 'hieu',
        device: 'dgen1',
        createdAt: '2026-10-16T10:00:00Z',
        visibility: 'private',
        entityRef: { kind: 'driver', key: '59H123456', label: '59H1-234.56' },
        verdict: 'good',
        tags: [],
      }),
    );
    const prefs = fakePrefs({ 'judexp.kho': JSON.stringify({ rootUri: 'content://kho', label: 'Hieu' }) });
    return { ...kho, prefs };
  }

  it('reads the clock again when the app comes back to the foreground', async () => {
    const { deps, prefs } = seededKho();
    let current = NOW;
    render(<AppShell deps={deps} prefs={prefs} snapshots={memorySnapshots()} clock={() => current} />);
    expect(await screen.findByTestId('entity-59H123456')).toHaveTextContent('hôm nay');

    current = new Date('2026-10-17T12:00:00Z');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(await screen.findByTestId('entity-59H123456')).toHaveTextContent('hôm qua');
  });

  it('reads the clock again every minute while it stays in the foreground', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { deps, prefs } = seededKho();
      let current = NOW;
      render(<AppShell deps={deps} prefs={prefs} snapshots={memorySnapshots()} clock={() => current} />);
      expect(await screen.findByTestId('entity-59H123456')).toHaveTextContent('hôm nay');

      current = new Date('2026-10-17T12:00:00Z');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });
      expect(screen.getByTestId('entity-59H123456')).toHaveTextContent('hôm qua');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('AppShell, when Android hides what is in the kho', () => {
  const khoPrefs = () => fakePrefs({ 'judexp.kho': JSON.stringify({ rootUri: ROOT_URI, label: 'Hieu' }) });

  it('says to restart the phone and offers no way to write', async () => {
    const { deps, files, view } = fakeKho();
    view.hidden = true;
    render(<AppShell deps={deps} prefs={khoPrefs()} snapshots={memorySnapshots()} clock={() => NOW} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/khởi động lại máy/i);
    expect(screen.queryByRole('button', { name: /chấm nhanh/i })).toBeNull();
    expect(files.size).toBe(0);
    // The kho is still the chosen one, it just cannot be read right now.
    expect(screen.getByTestId('kho-label')).toHaveTextContent('Hieu');
  });

  it('keeps the index instead of rebuilding it from a folder that lists nothing', async () => {
    const { deps, files, view } = fakeKho();
    files.set(
      '20261016T100000Z_dgen1_a3f9c21.json',
      JSON.stringify({
        schemaVersion: 1,
        eventId: 'a3f9c21d-7b44-4c2e-9f10-2c7a51d9e001',
        type: 'encounter',
        author: 'hieu',
        device: 'dgen1',
        createdAt: '2026-10-16T10:00:00Z',
        visibility: 'private',
        entityRef: { kind: 'driver', key: '59H123456', label: '59H1-234.56' },
        verdict: 'bad',
        tags: [],
      }),
    );
    render(<AppShell deps={deps} prefs={khoPrefs()} snapshots={memorySnapshots()} clock={() => NOW} />);
    expect(await screen.findByTestId('entity-59H123456')).toBeInTheDocument();

    view.hidden = true;
    fireEvent.click(screen.getByRole('button', { name: /cài đặt/i }));
    fireEvent.click(screen.getByRole('button', { name: /dựng lại index/i }));
    fireEvent.click(screen.getByRole('button', { name: /chắc chắn/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/khởi động lại máy/i);

    fireEvent.click(screen.getByRole('button', { name: /tra cứu/i }));
    expect(await screen.findByTestId('entity-59H123456')).toBeInTheDocument();
  });
});

describe('AppShell, when the kho cannot be opened', () => {
  it('still reaches a screen huynh can act on instead of hanging on the splash', async () => {
    const { deps } = fakeKho();
    deps.saf.ensureDir = async () => {
      throw new Error('bad parent');
    };
    const prefs = fakePrefs({ 'judexp.kho': JSON.stringify({ rootUri: 'content://gone', label: 'Hieu' }) });

    render(<AppShell deps={deps} prefs={prefs} snapshots={memorySnapshots()} clock={() => NOW} />);

    expect(await screen.findByText(/không mở được kho/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /chọn folder kho/i })).toBeInTheDocument();
    expect(screen.queryByText(/đang mở kho/i)).not.toBeInTheDocument();
  });

  it('survives a snapshot that cannot be parsed', async () => {
    const { deps } = fakeKho();
    const prefs = fakePrefs({ 'judexp.kho': JSON.stringify({ rootUri: 'content://kho', label: 'Hieu' }) });
    render(<AppShell deps={deps} prefs={prefs} snapshots={memorySnapshots('{broken')} clock={() => NOW} />);
    expect(await screen.findByRole('searchbox')).toBeInTheDocument();
  });
});

describe('AppShell, when a rating cannot be written', () => {
  it('says so instead of looking like nothing happened', async () => {
    const { deps } = fakeKho();
    deps.saf.writeFile = async () => {
      throw new Error('permission revoked');
    };
    const prefs = fakePrefs({
      'judexp.kho': JSON.stringify({ rootUri: 'content://kho', label: 'Hieu' }),
      'judexp.device': 'dgen1',
    });

    render(<AppShell deps={deps} prefs={prefs} snapshots={memorySnapshots()} clock={() => NOW} />);
    fireEvent.click(await screen.findByRole('button', { name: /chấm nhanh/i }));
    fireEvent.change(screen.getByLabelText(/biển số/i), { target: { value: '59H123456' } });
    fireEvent.click(screen.getByRole('button', { name: /^xấu$/i }));
    fireEvent.click(screen.getByRole('button', { name: /lưu/i }));

    expect(await screen.findByText(/chưa ghi được/i)).toBeInTheDocument();
  });
});
