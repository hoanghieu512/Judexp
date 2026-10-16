import { useCallback, useEffect, useState } from 'react';
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
  khoLabelFromUri,
  setDeviceId,
  setKho,
  type KhoChoice,
  type PrefsStore,
} from './profile/settings';
import { Saf } from './plugins/saf';
import type { JudexpEvent } from './domain/events';
import './ui/theme/tokens.css';
import './ui/ui.css';

const SNAPSHOT_KEY = 'judexp.snapshot';

type View = { name: 'lookup' } | { name: 'rate' } | { name: 'entity'; key: string } | { name: 'settings' };

/**
 * What holds the app together: pick a kho, build the index from it, show a
 * screen, and append every rating back into the same folder. Navigation is
 * plain state rather than a router because there are four screens and no
 * deep links; the kho and the index are the only real moving parts.
 */
export default function AppShell({
  deps,
  prefs,
  now,
}: {
  deps: KhoDeps;
  prefs: PrefsStore;
  now: Date;
}) {
  const [kho, setKhoChoice] = useState<KhoChoice | null>(null);
  const [dirs, setDirs] = useState<KhoDirs | null>(null);
  const [state, setState] = useState<State>(emptyState());
  const [skipped, setSkipped] = useState<string[]>([]);
  const [device, setDevice] = useState('');
  const [author, setAuthorName] = useState('');
  const [pin, setPinValue] = useState<string | null>(null);
  const [view, setView] = useState<View>({ name: 'lookup' });
  const [ready, setReady] = useState(false);

  const refresh = useCallback(
    async (layout: KhoDirs, fromScratch = false) => {
      const stored = await prefs.get(SNAPSHOT_KEY);
      const snapshot = !fromScratch && stored ? (JSON.parse(stored) as Snapshot) : null;
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
      setDevice(await getDeviceId(prefs));
      setPinValue(await getPin(prefs));
      const chosen = await getKho(prefs);
      setKhoChoice(chosen);
      setAuthorName(await getAuthor(prefs));
      if (chosen) {
        const layout = await ensureKhoLayout(deps, chosen.rootUri);
        setDirs(layout);
        await refresh(layout);
      }
      setReady(true);
    })();
  }, [deps, prefs, refresh]);

  async function pickKho() {
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
    if (!dirs) return;
    await writeEvent(deps, dirs.events, event);
    await refresh(dirs);
    setView({ name: 'lookup' });
  }

  if (!ready) return <p className="jx-empty">Đang mở kho...</p>;

  if (!kho) {
    return (
      <SettingsPage
        kho={null}
        status="unreachable"
        deviceId={device}
        skipped={[]}
        workerLog=""
        onPickKho={pickKho}
        onRebuild={() => {}}
        onDeviceId={() => {}}
      />
    );
  }

  return (
    <PinGate pin={pin}>
      <nav className="jx-nav">
        <button type="button" className="jx-tag" onClick={() => setView({ name: 'lookup' })}>
          Tra cứu
        </button>
        <button type="button" className="jx-tag" onClick={() => setView({ name: 'rate' })}>
          Chấm nhanh
        </button>
        <button type="button" className="jx-tag" onClick={() => setView({ name: 'settings' })}>
          Cài đặt
        </button>
      </nav>

      {view.name === 'lookup' && (
        <LookupPage state={state} now={now} onOpen={(key) => setView({ name: 'entity', key })} />
      )}

      {view.name === 'rate' && (
        <QuickRateSheet kind="driver" author={author} device={device} onSave={save} />
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
          status="unreachable"
          deviceId={device}
          skipped={skipped}
          workerLog=""
          onPickKho={pickKho}
          onRebuild={() => dirs && refresh(dirs, true)}
          onDeviceId={async (name) => {
            await setDeviceId(name, prefs);
            setDevice(await getDeviceId(prefs));
          }}
        />
      )}
    </PinGate>
  );
}
