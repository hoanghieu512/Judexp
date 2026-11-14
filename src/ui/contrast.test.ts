import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { tokenBlock } from './theme/tokenBlocks';

// vitest runs from the project root.
const tokens = readFileSync('src/ui/theme/tokens.css', 'utf-8');

const schemes = {
  day: tokenBlock(tokens, ':root'),
  night: tokenBlock(tokens, ":root[data-scheme='dark']"),
};

type Rgb = [number, number, number];

/** `#rrggbb` or `#rrggbbaa`. */
function parse(hex: string): { rgb: Rgb; alpha: number } {
  const h = hex.replace('#', '');
  const channel = (i: number) => parseInt(h.slice(i, i + 2), 16);
  return { rgb: [channel(0), channel(2), channel(4)], alpha: h.length === 8 ? channel(6) / 255 : 1 };
}

/** A translucent colour laid over an opaque one. */
function over(top: string, under: Rgb): Rgb {
  const { rgb, alpha } = parse(top);
  return rgb.map((c, i) => c * alpha + under[i] * (1 - alpha)) as Rgb;
}

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * WCAG contrast of the pairs in §3 of the Watercolor spec, read from the
 * stylesheet itself, so a colour changed later is measured again. Washes are
 * measured at their strongest point, the centre colour laid over the page.
 * Text needs 4.5; the input border and the big Judexp word need 3.
 */
const PAIRS: [fg: string, bg: string | [layer: string, under: string], min: number][] = [
  ['text', 'bg', 4.5],
  ['text', 'surface', 4.5],
  ['text-dim', 'bg', 4.5],
  ['text-dim', 'surface', 4.5],
  ['text-dim', ['wash-peach', 'bg'], 4.5],
  ['text-dim', ['wash-sky', 'bg'], 4.5],
  ['text-dim', ['wash-mint', 'bg'], 4.5],
  ['good', 'surface', 4.5],
  ['ok', 'surface', 4.5],
  ['bad', 'surface', 4.5],
  ['unrated', 'surface', 4.5],
  ['good', 'good-soft', 4.5],
  ['ok', 'ok-soft', 4.5],
  ['bad', 'bad-soft', 4.5],
  ['chip-text', ['chip-bg', 'surface'], 4.5],
  ['chip-text', ['chip-bg', 'bg'], 4.5],
  ['text-on-accent', 'ink', 4.5],
  ['text-on-accent', 'accent', 4.5],
  ['title', 'bg', 4.5],
  ['title', ['wash-peach', 'bg'], 4.5],
  ['title', ['wash-sky', 'bg'], 4.5],
  ['title', ['wash-mint', 'bg'], 4.5],
  ['ink', 'surface', 3],
  ['brand', 'bg', 3],
  ['brand', ['wash-peach', 'bg'], 3],
];

describe.each(Object.entries(schemes))('%s contrast', (_, scheme) => {
  const colour = (name: string) => {
    const value = scheme.get(`--jx-${name}`);
    if (!value) throw new Error(`--jx-${name} is not defined`);
    return value;
  };
  const opaque = (bg: string | [string, string]): Rgb =>
    typeof bg === 'string' ? parse(colour(bg)).rgb : over(colour(bg[0]), parse(colour(bg[1])).rgb);

  it.each(PAIRS.map(([fg, bg, min]) => [fg, typeof bg === 'string' ? bg : `${bg[0]} over ${bg[1]}`, min, bg] as const))(
    '%s on %s reaches %s',
    (fg, _label, min, bg) => {
      expect(ratio(parse(colour(fg)).rgb, opaque(bg))).toBeGreaterThanOrEqual(min);
    },
  );
});
