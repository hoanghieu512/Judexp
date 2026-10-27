import { SystemBars, SystemBarsStyle, type SystemBarsStyleOptions } from '@capacitor/core';

/**
 * Keeps the status and nav bar icons readable when the phone switches between
 * light and dark while the app is open, or while it waits in the background.
 * Capacitor's SystemBars resolves DEFAULT to LIGHT or DARK once and re-applies
 * that cached value on a configuration change, so the icons kept the old mode
 * (dark icons on the night page). Asking for DEFAULT again re-resolves it, and
 * also repaints the bar strips with the theme's page colour.
 *
 * Returns a function that stops listening. Without matchMedia (tests) it does nothing.
 */
export function keepBarsWithScheme(
  match: typeof matchMedia | undefined = globalThis.matchMedia,
  bars: { setStyle(options: SystemBarsStyleOptions): Promise<void> } = SystemBars,
): () => void {
  if (typeof match !== 'function') return () => {};
  const query = match('(prefers-color-scheme: dark)');
  const onChange = () => {
    // Off Android (the browser harness) the plugin may not be implemented.
    bars.setStyle({ style: SystemBarsStyle.Default }).catch(() => {});
  };
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
