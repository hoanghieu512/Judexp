import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LookupPage from './ui/LookupPage';
import QuickRateSheet from './ui/QuickRateSheet';
import EntityPage from './ui/EntityPage';
import SettingsPage from './ui/SettingsPage';
import PinGate from './ui/PinGate';
import { ensureKhoLayout, KhoUnreadableError, readWorkerLog, writeEvent, type KhoDeps, type KhoDirs } from './storage/kho';
import { loadIndex, rebuildIndex, type Snapshot } from './index/store';
import type { SnapshotStore } from './index/snapshotStore';
import type { ReminderNativePlugin } from './plugins/reminders';
import type { Answer, ReminderStore } from './reminders/reminderStore';
import { eventFromAnswer, settleAnswers, type Identity } from './reminders/settle';
import { remember, stillPending, type LookupTarget, type Reminder } from './domain/reminders';
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

/** Set once the app has asked for notifications, so it never nags on every launch. */
const NOTIFICATIONS_ASKED_KEY = 'judexp.notificationsAsked';

/** Where v0.1.0 kept the snapshot; removed on start to shrink Preferences. */
const LEGACY_SNAPSHOT_KEY = 'judexp.snapshot';

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

/**
 * What to tell huynh when the kho will not open. A hidden kho is the phone's
 * fault, not the folder's, so picking the folder again would not help.
 */
function khoProblem(err: unknown, fallback: string): string {
  if (err instanceof KhoUnreadableError) {
    return 'Android đang không cho app đọc folder kho, thường do máy khởi động lỗi. Khởi động lại máy rồi mở lại app. Trong lúc này app không ghi gì vào kho.';
  }
  return `Không mở được kho: ${(err as Error).message}.${fallback}`;
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
  snapshots,
  reminders,
  clock = () => new Date(),
}: {
  deps: KhoDeps;
  prefs: PrefsStore;
  snapshots: SnapshotStore;
  /** Native scheduling plus the app-private files reminders and answers live in (§9.3). */
  reminders: { native: ReminderNativePlugin; store: ReminderStore };
  /** Injectable so tests can move time; the app reads the real clock. */
  clock?: () => Date;
}) {
  const now = useNow(clock);
  const latestClock = useRef(clock);
  useEffect(() => {
    latestClock.current = clock;
  });
  const [pending, setPending] = useState<Reminder[]>([]);
  const [notifications, setNotifications] = useState<'on' | 'off' | 'unknown'>('unknown');
  // One settle at a time: two at once could write the same answer twice.
  const settling = useRef(false);
  // Chờ chấm answers in flight: each button rates on touch, so a double tap is easy.
  const answering = useRef(new Set<string>());
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
  const [workerLog, setWorkerLog] = useState('');
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
      const stored = await snapshots.read();
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
      try {
        await snapshots.write(JSON.stringify(result.snapshot));
      } catch (err) {
        // The snapshot only makes the next launch faster. Failing to save it
        // (a full disk, say) must neither lock the kho nor fail a rating.
        deps.log(`could not save index snapshot: ${(err as Error).message}`);
      }
    },
    [deps, snapshots],
  );

  // Answers tapped on notifications become events here, the next time the app
  // is open with a readable kho. A failure keeps the answer for the next try.
  const settle = useCallback(
    async (layout: KhoDirs, who: Identity) => {
      if (settling.current) return;
      settling.current = true;
      try {
        const { written } = await settleAnswers(reminders.store, (e) => writeEvent(deps, layout.events, e), who);
        if (written > 0) await refresh(layout);
        setPending(stillPending(await reminders.store.load(), latestClock.current()));
      } catch (err) {
        deps.log(`could not settle reminder answers: ${(err as Error).message}`);
      } finally {
        settling.current = false;
      }
    },
    [deps, refresh, reminders],
  );

  // Asked once, right after the kho opens: never in the middle of a lookup,
  // when huynh is on the street with a driver waiting.
  const askNotificationsOnce = useCallback(async () => {
    try {
      const { granted } = await reminders.native.permission();
      if (!granted && (await prefs.get(NOTIFICATIONS_ASKED_KEY)) === null) {
        await prefs.set(NOTIFICATIONS_ASKED_KEY, '1');
        setNotifications((await reminders.native.requestPermission()).granted ? 'on' : 'off');
        return;
      }
      setNotifications(granted ? 'on' : 'off');
    } catch (err) {
      deps.log(`could not check notification permission: ${(err as Error).message}`);
    }
  }, [deps, prefs, reminders]);

  useEffect(() => {
    (async () => {
      // Whatever happens here, the app must end up on a screen huynh can act
      // on. A tree uri goes stale when the kho folder is renamed, moved or
      // unplugged, and being stuck on the splash would leave no way back in.
      try {
        // Derived data, so dropping it costs one read of the kho at most.
        await prefs.remove(LEGACY_SNAPSHOT_KEY);
        const deviceId = await getDeviceId(prefs);
        setDevice(deviceId);
        setPinValue(await getPin(prefs));
        setSync(await getSyncConfig(prefs));
        const chosen = await getKho(prefs);
        setKhoChoice(chosen);
        const authorName = await getAuthor(prefs);
        setAuthorName(authorName);
        if (chosen) {
          const layout = await ensureKhoLayout(deps, chosen.rootUri);
          setDirs(layout);
          await refresh(layout);
          await settle(layout, { author: authorName, device: deviceId });
          await askNotificationsOnce();
        }
      } catch (err) {
        setProblem(khoProblem(err, ' Chọn lại folder kho bên dưới.'));
        setDirs(null);
      } finally {
        setReady(true);
      }
    })();
  }, [deps, prefs, refresh, settle, askNotificationsOnce]);

  // The app comes back to the foreground, or a minute passes: an answer may
  // have been tapped on a notification meanwhile.
  useEffect(() => {
    if (!ready || !dirs) return;
    settle(dirs, { author, device });
  }, [now, ready, dirs, author, device, settle]);

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

  // Read on every visit to Settings: the worker on Atomman appends to the
  // log while the app is open, and Settings is the only place it is shown.
  const rootUri = kho?.rootUri;
  useEffect(() => {
    if (view.name !== 'settings' || !rootUri) return;
    let alive = true;
    readWorkerLog(deps, rootUri).then((log) => {
      if (alive) setWorkerLog(log);
    });
    return () => {
      alive = false;
    };
  }, [view.name, rootUri, deps]);

  async function pickKho() {
    try {
      await pickKhoInner();
      setProblem(null);
    } catch (err) {
      setProblem(khoProblem(err, ''));
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
    // A first run reaches a kho here, not at start, so this is where it asks.
    await askNotificationsOnce();
  }

  async function onLookup(target: LookupTarget) {
    try {
      const list = remember(await reminders.store.load(), target, latestClock.current());
      await reminders.store.save(list);
      setPending(list);
      const reminder = list[list.length - 1];
      const { granted } = await reminders.native.permission();
      setNotifications(granted ? 'on' : 'off');
      // Without permission the reminder still waits in Chờ chấm.
      if (granted) await reminders.native.schedule({ ...reminder, reminderId: reminder.id, at: Date.parse(reminder.dueAt) });
    } catch (err) {
      deps.log(`could not schedule a reminder: ${(err as Error).message}`);
    }
  }

  async function answerReminder(reminder: Reminder, answer: Answer) {
    if (!dirs) return;
    const lookup = `${reminder.id}|${reminder.lookedUpAt}`;
    if (answering.current.has(lookup)) return;
    answering.current.add(lookup);
    try {
      await answerReminderOnce(reminder, answer, dirs);
    } finally {
      answering.current.delete(lookup);
    }
  }

  async function answerReminderOnce(reminder: Reminder, answer: Answer, dirs: KhoDirs) {
    // An answer may already be queued from the notification: settle it first,
    // and if that answered this lookup, do not write a second rating for it.
    await settle(dirs, { author, device });
    const stillWaiting = (await reminders.store.load()).some((r) => r.id === reminder.id && r.lookedUpAt === reminder.lookedUpAt);
    if (!stillWaiting) {
      await reminders.native.cancel({ notificationId: reminder.notificationId }).catch(() => {});
      return;
    }
    const event = eventFromAnswer(
      {
        answerId: crypto.randomUUID(),
        reminderId: reminder.id,
        kind: reminder.kind,
        key: reminder.key,
        label: reminder.label,
        lookedUpAt: reminder.lookedUpAt,
        expiresAt: reminder.expiresAt,
        answer,
        answeredAt: latestClock.current().toISOString(),
      },
      { author, device },
    );
    if (event) {
      try {
        await writeEvent(deps, dirs.events, event);
      } catch (err) {
        // The reminder stays, so the same tap can be made again later.
        setProblem(`Chưa ghi được lần chấm này: ${(err as Error).message}. Thử lại khi kho đọc được.`);
        return;
      }
      try {
        await refresh(dirs);
        setProblem(null);
      } catch (err) {
        setProblem(`Đã ghi lần chấm này vào kho, nhưng chưa đọc lại được kho: ${(err as Error).message}. Nó sẽ hiện khi mở lại app.`);
      }
    }
    const rest = (await reminders.store.load()).filter((r) => !(r.id === reminder.id && r.lookedUpAt === reminder.lookedUpAt));
    await reminders.store.save(rest);
    setPending(stillPending(rest, latestClock.current()));
    await reminders.native.cancel({ notificationId: reminder.notificationId }).catch(() => {});
  }

  async function askNotifications() {
    await prefs.set(NOTIFICATIONS_ASKED_KEY, '1');
    setNotifications((await reminders.native.requestPermission()).granted ? 'on' : 'off');
  }

  async function save(event: JudexpEvent) {
    if (!dirs) {
      setProblem('Chưa ghi được: chưa chọn kho.');
      return;
    }
    try {
      await writeEvent(deps, dirs.events, event);
    } catch (err) {
      // Staying on the sheet matters: a silent failure invites a second tap,
      // and the second tap would write a second event for the same ride.
      setProblem(`Chưa ghi được lần chấm này: ${(err as Error).message}. Thử lại khi kho đọc được.`);
      return;
    }

    // From here the rating is in the kho. Whatever fails next must not read
    // as "not written", or the second tap writes the same ride twice.
    setView({ name: 'lookup' });
    try {
      await refresh(dirs);
      setProblem(null);
    } catch (err) {
      setProblem(
        `Đã ghi lần chấm này vào kho, nhưng chưa đọc lại được kho: ${(err as Error).message}. Nó sẽ hiện khi mở lại app.`,
      );
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
        kho={kho}
        status={syncState}
        deviceId={device}
        skipped={[]}
        workerLog=""
        syncConfig={sync}
        pin={pin}
        author={author}
        khoLog={khoLog}
        notifications={notifications}
        onAskNotifications={askNotifications}
        onPin={async (value) => {
          await setPin(value, prefs);
          setPinValue(value);
        }}
        onAuthor={async (value) => {
          await setAuthor(value, prefs);
          setAuthorName(await getAuthor(prefs));
        }}
        onPickKho={pickKho}
        onRebuild={async () => {}}
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
        <LookupPage
          state={state}
          now={now}
          onOpen={(key) => setView({ name: 'entity', key })}
          onLookup={onLookup}
          reminders={pending}
          onAnswer={answerReminder}
        />
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
          workerLog={workerLog}
          syncConfig={sync}
          pin={pin}
          author={author}
          khoLog={khoLog}
        notifications={notifications}
        onAskNotifications={askNotifications}
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
          onRebuild={async () => {
            // Check the kho still lists before throwing the index away: a
            // hidden kho reads as empty, and rebuilding from it wipes the index.
            try {
              await ensureKhoLayout(deps, kho.rootUri);
            } catch (err) {
              throw new Error(khoProblem(err, ''));
            }
            await refresh(dirs, true);
          }}
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
