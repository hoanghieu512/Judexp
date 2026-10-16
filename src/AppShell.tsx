import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LookupPage from './ui/LookupPage';
import QuickRateSheet from './ui/QuickRateSheet';
import EntityPage from './ui/EntityPage';
import SettingsPage from './ui/SettingsPage';
import PinGate from './ui/PinGate';
import { ensureKhoLayout, writeEvent, type KhoDeps, type KhoDirs } from './storage/kho';
import { loadIndex, rebuildIndex, type Snapshot } from './index/store';
import { emptyState, type State } from './domain/reduce';
import {
  getAuthor,
  getDeviceId,
  getKho,
  getPin,
  getSyncConfig,
  khoLabelFromUri,
  setSyncConfig,
  setAuthor,
  setDeviceId,
  setKho,
  setPin,
  type KhoChoice,
  type PrefsStore,
} from './profile/settings';
import { Saf } from './plugins/saf';
import { Syncthing } from './plugins/syncthing';
import { syncStatus, type SyncConfig, type SyncState } from './sync/status';
import type { JudexpEvent } from './domain/events';
import './ui/theme/tokens.css';
import './ui/ui.css';

const SNAPSHOT_KEY = 'judexp.snapshot';

/** Re-read at most this often while the app stays on screen. */
const CLOCK_TICK_MS = 60_000;

/**
 * "Today" as of now, not as of when the app was opened. A phone keeps the
 * app alive in the background for days, so the clock is read again when it
 * comes back to the foreground and once a minute while it stays there.
 */
function useNow(clock: () => Date): Date {
  const [now, setNow] = useState(clock);
  // Held in a ref so a new clock function on each render does not restart
  // the timer, which would keep a busy screen from ever ticking.
  const latest = useRef(clock);
  useEffect(() => {
    latest.current = clock;
  });
  useEffect(() => {
    const tick = () => setNow(latest.current());
    const onVisible = () => {
      if (document.visibilityState !== 'hidden') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(tick, CLOCK_TICK_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
    };
  }, []);
  return now;
}

type View = { name: 'lookup' } | { name: 'rate' } | { name: 'entity'; key: string } | { name: 'settings' };

/**
 * What holds the app together: pick a kho, build the index from it, show a
 * screen, and append every rating back into the same folder. Navigation is
 * plain state rather than a router because there are four screens and no
 * deep links; the kho and the index are the only real moving parts.
 */
export default function AppShell({
  deps: rawDeps,
  prefs,
  clock = () => new Date(),
}: {
  deps: KhoDeps;
  prefs: PrefsStore;
  /** Injectable so tests can move time; the app reads the real clock. */
  clock?: () => Date;
}) {
  const now = useNow(clock);
  const [kho, setKhoChoice] = useState<KhoChoice | null>(null);
  const [dirs, setDirs] = useState<KhoDirs | null>(null);
  const [state, setState] = useState<State>(emptyState());
  const [skipped, setSkipped] = useState<string[]>([]);
  const [device, setDevice] = useState('');
  const [author, setAuthorName] = useState('');
  const [pin, setPinValue] = useState<string | null>(null);
  const [view, setView] = useState<View>({ name: 'lookup' });
  const [ready, setReady] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [khoLog, setKhoLog] = useState<string[]>([]);
  const [sync, setSync] = useState<SyncConfig>({
    baseUrl: 'https://127.0.0.1:8384',
    apiKey: '',
    folderId: '',
    atommanDeviceId: '',
  });
  const [syncState, setSyncState] = useState<SyncState>('unconfigured');

  // Keep what the kho layer reports where huynh can see it, not only in a
  // console nobody on a phone can open.
  const deps = useMemo<KhoDeps>(
    () => ({
      saf: rawDeps.saf,
      log: (msg) => {
        rawDeps.log(msg);
        setKhoLog((lines) => [...lines.slice(-49), msg]);
      },
    }),
    [rawDeps],
  );

  const refresh = useCallback(
    async (layout: KhoDirs, fromScratch = false) => {
      const stored = await prefs.get(SNAPSHOT_KEY);
      let snapshot: Snapshot | null = null;
      if (!fromScratch && stored) {
        try {
          snapshot = JSON.parse(stored) as Snapshot;
        } catch {
          // A snapshot is derived data. If it is unreadable, rebuild from the
          // kho rather than refusing to open.
          snapshot = null;
        }
      }
      const result = fromScratch
        ? await rebuildIndex(deps, layout.events)
        : await loadIndex(deps, layout.events, snapshot);
      setState(result.state);
      setSkipped(result.skipped);
      await prefs.set(SNAPSHOT_KEY, JSON.stringify(result.snapshot));
    },
    [deps, prefs],
  );

  useEffect(() => {
    (async () => {
      // Whatever happens here, the app must end up on a screen huynh can act
      // on. A tree uri goes stale when the kho folder is renamed, moved or
      // unplugged, and being stuck on the splash would leave no way back in.
      try {
        setDevice(await getDeviceId(prefs));
        setPinValue(await getPin(prefs));
        setSync(await getSyncConfig(prefs));
        const chosen = await getKho(prefs);
        setKhoChoice(chosen);
        setAuthorName(await getAuthor(prefs));
        if (chosen) {
          const layout = await ensureKhoLayout(deps, chosen.rootUri);
          setDirs(layout);
          await refresh(layout);
        }
      } catch (err) {
        setProblem(`Không mở được kho: ${(err as Error).message}. Chọn lại folder kho bên dưới.`);
        setDirs(null);
      } finally {
        setReady(true);
      }
    })();
  }, [deps, prefs, refresh]);

  // Poll rather than subscribe: ten seconds is plenty for a light that
  // answers "is what I just wrote already on Atomman?".
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    const read = async () => {
      const state = await syncStatus({ request: (o) => Syncthing.request(o) }, sync);
      if (alive) setSyncState(state);
    };
    read();
    const timer = setInterval(read, 10_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [ready, sync]);

  async function pickKho() {
    try {
      await pickKhoInner();
      setProblem(null);
    } catch (err) {
      setProblem(`Không mở được kho: ${(err as Error).message}`);
    }
  }

  async function pickKhoInner() {
    const { uri } = await Saf.pickFolder();
    const choice: KhoChoice = { rootUri: uri, label: khoLabelFromUri(uri) };
    await setKho(choice, prefs);
    setKhoChoice(choice);
    setAuthorName(await getAuthor(prefs));
    const layout = await ensureKhoLayout(deps, uri);
    setDirs(layout);
    await refresh(layout);
  }

  async function save(event: JudexpEvent) {
    if (!dirs) {
      setProblem('Chưa ghi được: chưa chọn kho.');
      return;
    }
    try {
      await writeEvent(deps, dirs.events, event);
      await refresh(dirs);
      setProblem(null);
      setView({ name: 'lookup' });
    } catch (err) {
      // Staying on the sheet matters: a silent failure invites a second tap,
      // and the second tap would write a second event for the same ride.
      setProblem(`Chưa ghi được lần chấm này: ${(err as Error).message}. Thử lại khi kho đọc được.`);
    }
  }

  if (!ready) return <div className="jx-app"><p className="jx-empty">Đang mở kho...</p></div>;

  const banner = problem ? (
    <p className="jx-problem" role="alert">
      {problem}
    </p>
  ) : null;

  if (!kho || !dirs) {
    return (
      <div className="jx-app">
        {banner}
      <SettingsPage
        kho={null}
        status={syncState}
        deviceId={device}
        skipped={[]}
        workerLog=""
        syncConfig={sync}
        pin={pin}
        author={author}
        khoLog={khoLog}
        onPin={async (value) => {
          await setPin(value, prefs);
          setPinValue(value);
        }}
        onAuthor={async (value) => {
          await setAuthor(value, prefs);
          setAuthorName(await getAuthor(prefs));
        }}
        onPickKho={pickKho}
        onRebuild={() => {}}
        onDeviceId={() => {}}
        onSyncConfig={async (cfg) => {
          await setSyncConfig(cfg, prefs);
          setSync(cfg);
        }}
        />
      </div>
    );
  }

  return (
    <PinGate pin={pin}>
      <div className="jx-app">
      <nav className="jx-nav">
        <button type="button" className="jx-nav-item" data-selected={view.name === 'lookup'} onClick={() => setView({ name: 'lookup' })}>
          Tra cứu
        </button>
        <button type="button" className="jx-nav-item" data-selected={view.name === 'rate'} onClick={() => setView({ name: 'rate' })}>
          Chấm nhanh
        </button>
        <button type="button" className="jx-nav-item" data-selected={view.name === 'settings'} onClick={() => setView({ name: 'settings' })}>
          Cài đặt
        </button>
      </nav>
      {banner}

      {view.name === 'lookup' && (
        <LookupPage state={state} now={now} onOpen={(key) => setView({ name: 'entity', key })} />
      )}

      {view.name === 'rate' && (
        <QuickRateSheet author={author} device={device} onSave={save} />
      )}

      {view.name === 'entity' && (
        <EntityPage
          state={state}
          entityKey={view.key}
          now={now}
          author={author}
          device={device}
          onSave={save}
        />
      )}

      {view.name === 'settings' && (
        <SettingsPage
          kho={kho}
          status={syncState}
          deviceId={device}
          skipped={skipped}
          workerLog=""
          syncConfig={sync}
          pin={pin}
          author={author}
          khoLog={khoLog}
          onPin={async (value) => {
            await setPin(value, prefs);
            setPinValue(value);
          }}
          onAuthor={async (value) => {
            await setAuthor(value, prefs);
            setAuthorName(await getAuthor(prefs));
          }}
          onPickKho={pickKho}
          onSyncConfig={async (cfg) => {
            await setSyncConfig(cfg, prefs);
            setSync(cfg);
          }}
          onRebuild={() => dirs && refresh(dirs, true)}
          onDeviceId={async (name) => {
            await setDeviceId(name, prefs);
            setDevice(await getDeviceId(prefs));
          }}
        />
      )}
      </div>
    </PinGate>
  );
}
