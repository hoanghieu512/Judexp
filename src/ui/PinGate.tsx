import { useState, type ReactNode } from 'react';
import './ui.css';

/**
 * A PIN, not a login. There is no server to authenticate against: this only
 * stops someone holding the unlocked phone from reading the kho. The files
 * themselves are plain JSON on disk, and the screen says so rather than
 * letting anyone believe otherwise.
 */
export default function PinGate({ pin, children }: { pin: string | null; children: ReactNode }) {
  const [typed, setTyped] = useState('');

  if (pin === null || typed === pin) return <>{children}</>;

  return (
    <div className="jx-screen">
      <label className="jx-sub" htmlFor="jx-pin">
        PIN
      </label>
      <input
        id="jx-pin"
        className="jx-search"
        type="password"
        inputMode="numeric"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
      />
      <p className="jx-sub">PIN chỉ chặn người cầm máy, nó không mã hoá dữ liệu trong kho.</p>
    </div>
  );
}
