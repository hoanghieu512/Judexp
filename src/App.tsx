import { IonApp, setupIonicReact } from '@ionic/react';
import { Filesystem } from '@capacitor/filesystem';
import AppShell from './AppShell';
import { fileSnapshotStore } from './index/snapshotStore';
import { ReminderNative } from './plugins/reminders';
import { fileReminderStore } from './reminders/reminderStore';
import { Saf } from './plugins/saf';
import { capacitorStore } from './profile/settings';
import type { KhoDeps } from './storage/kho';

setupIonicReact();

const deps: KhoDeps = {
  saf: Saf,
  // Kho problems must be visible, not silent: this also feeds the Settings screen.
  log: (msg) => console.warn('[judexp]', msg),
};

// Module scope so the store is one object for the life of the app: AppShell
// keys its index refresh on it.
const snapshots = fileSnapshotStore(Filesystem);
const reminders = { native: ReminderNative, store: fileReminderStore(Filesystem) };

export default function App() {
  return (
    <IonApp>
      <AppShell deps={deps} prefs={capacitorStore} snapshots={snapshots} reminders={reminders} />
    </IonApp>
  );
}
