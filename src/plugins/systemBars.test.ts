import { describe, it, expect, vi } from 'vitest';
import { SystemBarsStyle } from '@capacitor/core';
import { keepBarsWithScheme } from './systemBars';

/** A matchMedia that remembers its change listener, so a test can fire it. */
function fakeMatch() {
  const listeners: (() => void)[] = [];
  const match = vi.fn(() => ({
    addEventListener: (_: string, listener: () => void) => listeners.push(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.splice(listeners.indexOf(listener), 1),
  }));
  return { match, fire: () => listeners.forEach((listener) => listener()), listeners };
}

describe('keepBarsWithScheme', () => {
  it('asks for the default bar style again when the phone switches scheme', () => {
    // Capacitor caches the resolved LIGHT or DARK and re-applies it on a
    // configuration change, so the status bar icons kept the old mode.
    const { match, fire } = fakeMatch();
    const bars = { setStyle: vi.fn(async () => {}) };
    keepBarsWithScheme(match as unknown as typeof matchMedia, bars);
    expect(match).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    expect(bars.setStyle).not.toHaveBeenCalled();
    fire();
    expect(bars.setStyle).toHaveBeenCalledWith({ style: SystemBarsStyle.Default });
  });

  it('stops listening when asked', () => {
    const { match, listeners } = fakeMatch();
    const stop = keepBarsWithScheme(match as unknown as typeof matchMedia, { setStyle: vi.fn(async () => {}) });
    stop();
    expect(listeners).toHaveLength(0);
  });

  it('does nothing where there is no matchMedia, and a failing plugin does not throw', async () => {
    const bars = { setStyle: vi.fn(async () => Promise.reject(new Error('not implemented on web'))) };
    expect(() => keepBarsWithScheme(undefined, bars)).not.toThrow();
    const { match, fire } = fakeMatch();
    keepBarsWithScheme(match as unknown as typeof matchMedia, bars);
    expect(() => fire()).not.toThrow();
    await Promise.resolve();
  });
});
