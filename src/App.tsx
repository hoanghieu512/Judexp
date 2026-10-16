import { IonApp, setupIonicReact } from '@ionic/react';
import AppShell from './AppShell';
import { Saf } from './plugins/saf';
import { capacitorStore } from './profile/settings';
import type { KhoDeps } from './storage/kho';

setupIonicReact();

const deps: KhoDeps = {
  saf: Saf,
  // Kho problems must be visible, not silent: this also feeds the Settings screen.
  log: (msg) => console.warn('[judexp]', msg),
};

export default function App() {
  return (
    <IonApp>
      <AppShell deps={deps} prefs={capacitorStore} now={new Date()} />
    </IonApp>
  );
}
