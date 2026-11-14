import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tokenBlock } from './theme/tokenBlocks';

// vitest runs from the project root.
const tokens = readFileSync('src/ui/theme/tokens.css', 'utf-8');
const html = readFileSync('index.html', 'utf-8');

const NIGHT_MEDIA = '@media (prefers-color-scheme: dark)';
const day = () => tokenBlock(tokens, ':root');
const nightByPhone = () => tokenBlock(tokens, ":root:not([data-scheme='light'])", NIGHT_MEDIA);
const nightByNative = () => tokenBlock(tokens, ":root[data-scheme='dark']");

/** Every stylesheet under src/ui, so a file added later is checked too. */
function stylesheets(dir = 'src/ui'): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return stylesheets(path);
    return entry.name.endsWith('.css') ? [path] : [];
  });
}

/**
 * Day is the main theme and night follows the phone's dark mode (W2). Night
 * is written twice: once for the phone's setting, once for data-scheme, which
 * native sets if the WebView ever misses a change (S6).
 */
describe('day and night', () => {
  it('keeps day in :root', () => {
    const d = day();
    expect(d.get('color-scheme')).toBe('light');
    expect(d.get('--jx-bg')).toBe('#f6eddd');
    expect(d.get('--jx-text')).toBe('#2b2118');
    expect(d.get('--jx-show-day')).toBe('block');
    expect(d.get('--jx-show-night')).toBe('none');
    expect(d.get('--jx-halo-opacity')).toBe('0');
  });

  it('writes night twice, the same both times', () => {
    const phone = nightByPhone();
    expect([...phone.entries()]).toEqual([...nightByNative().entries()]);
    expect(phone.get('color-scheme')).toBe('dark');
    expect(phone.get('--jx-bg')).toBe('#1a1714');
    expect(phone.get('--jx-bad')).toBe('#f6767b');
    expect(phone.get('--jx-unrated')).toBe('#7c8c9d');
    expect(phone.get('--jx-halo-opacity')).toBe('0.8');
  });

  it('gives night every colour the day sets', () => {
    // The stars are the same gold at night; everything else must change, or
    // night shows a day colour, like dark text on the dark page.
    const shared = new Set(['--jx-star', '--jx-star-edge']);
    const night = nightByPhone();
    const missing = [...day()]
      .filter(([name, value]) => value.startsWith('#') && !shared.has(name))
      .map(([name]) => name)
      .concat(['--jx-show-day', '--jx-show-night', '--jx-halo-opacity'])
      .filter((name) => !night.has(name));
    expect(missing).toEqual([]);
  });

  it('drops the dead light theme and the unused tokens', () => {
    expect(tokens).not.toMatch(/\[data-theme/);
    expect(tokens).not.toContain('--jx-unrated-soft');
    expect(tokens).not.toContain('--jx-mark-');
  });

  it('defines every token a stylesheet uses', () => {
    const defined = day();
    const missing = stylesheets().flatMap((path) =>
      [...readFileSync(path, 'utf-8').matchAll(/var\((--jx-[\w-]+)/g)]
        .map((m) => m[1])
        .filter((name) => !defined.has(name))
        .map((name) => `${path}: ${name}`),
    );
    expect(missing).toEqual([]);
  });

  it('preloads what the boot screen draws first, so its first frame is not a fallback font', () => {
    for (const href of [
      '/src/assets/watercolor/logo-cyclo.webp',
      '/node_modules/@fontsource-variable/fraunces/files/fraunces-latin-full-normal.woff2',
      '/node_modules/@fontsource/mali/files/mali-latin-400-normal.woff2',
      '/node_modules/@fontsource/mali/files/mali-vietnamese-400-normal.woff2',
    ]) {
      expect(html).toMatch(new RegExp(`<link rel="preload"[^>]*href="${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
    }
  });

  it('paints the page before React does', () => {
    expect(html).toContain('<meta name="color-scheme" content="light dark"');
    expect(html).toContain('#f6eddd');
    expect(html).toContain('#1a1714');
    expect(html).toContain("[data-scheme='dark']");
  });
});
