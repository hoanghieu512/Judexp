import LogoLockup from './LogoLockup';
import './ui.css';

/**
 * What shows while the kho opens and the index loads (W8). It fills a wait
 * the app has anyway and never outstays it: AppShell swaps it out the moment
 * it is ready, stars finished or not.
 */
export default function BootScreen() {
  return (
    <div className="jx-app jx-boot">
      <LogoLockup variant="boot" />
      <p className="jx-empty">Đang mở kho...</p>
    </div>
  );
}
