import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import BootScreen from './BootScreen';

// vitest runs from the project root.
const css = readFileSync('src/ui/logo.css', 'utf-8');

/** Every @keyframes in the stylesheet, with the properties its frames set. */
function keyframes(text: string): Map<string, Set<string>> {
  const found = new Map<string, Set<string>>();
  const head = /@keyframes\s+([\w-]+)\s*{/g;
  for (let m = head.exec(text); m; m = head.exec(text)) {
    let depth = 1;
    let i = head.lastIndex;
    while (depth > 0 && i < text.length) {
      if (text[i] === '{') depth += 1;
      if (text[i] === '}') depth -= 1;
      i += 1;
    }
    const body = text.slice(head.lastIndex, i - 1);
    const props = new Set([...body.matchAll(/([\w-]+)\s*:/g)].map((p) => p[1]));
    found.set(m[1], props);
  }
  return found;
}

describe('BootScreen', () => {
  it('shows the logo and says the kho is opening', () => {
    const { container } = render(<BootScreen />);
    expect(screen.getByText('Judexp')).toBeInTheDocument();
    expect(screen.getByText('Đang mở kho...')).toBeInTheDocument();
    // The word is real text; the cyclo is decoration.
    expect(container.querySelector('img.jx-logo-cyclo')).toHaveAttribute('alt', '');
  });

  it('pops the five stars in order', () => {
    const { container } = render(<BootScreen />);
    const delays = [...container.querySelectorAll<HTMLElement>('.jx-star')].map((star) => star.style.getPropertyValue('--star-delay'));
    expect(delays).toEqual(['0ms', '150ms', '300ms', '450ms', '600ms']);
  });

  it('makes each star an HTML layer the compositor can move', () => {
    // An SVG child is painted on the main thread; on UBS1 that alone made
    // the kho open 0.7 s later (Task 13 of the Watercolor plan).
    const { container } = render(<BootScreen />);
    for (const star of container.querySelectorAll('.jx-star')) {
      expect(star).toBeInstanceOf(HTMLElement);
      expect(star.querySelector('.jx-star-flash')).toBeInstanceOf(HTMLElement);
      expect(star.querySelector('.jx-star-glow')).toBeInstanceOf(HTMLElement);
    }
  });
});

/** jsdom has no matchMedia and applies no CSS, so the stylesheet is read as text. */
describe('the boot stars stylesheet', () => {
  it('has the pop and the shimmer', () => {
    const names = [...keyframes(css).keys()];
    expect(names.some((name) => name.startsWith('jx-pop'))).toBe(true);
    expect(names.some((name) => name.startsWith('jx-shimmer'))).toBe(true);
  });

  it('keeps the Settings logo short on a square screen', () => {
    // 40vw alone is a 192 x 240 dp logo on dGen1 (480 x 480): on the kho error
    // screen it pushed "Chọn folder kho" below the fold.
    expect(css).toMatch(/\.jx-logo\s*{[^}]*--logo-w:\s*min\(40vw,\s*24vh\)/);
  });

  it('animates only what the compositor runs, never paint', () => {
    // fill, filter and the like repaint every frame on the main thread, which
    // the kho opening needs at the same moment.
    for (const [name, props] of keyframes(css)) {
      expect({ name, props: [...props].filter((p) => p !== 'opacity' && p !== 'transform') }).toEqual({ name, props: [] });
    }
  });

  it('stands still when the phone asks for less motion', () => {
    const reduce = /@media \(prefers-reduced-motion: reduce\)\s*{([\s\S]*?)}\s*}/.exec(css)?.[1] ?? '';
    expect(reduce).toMatch(/\.jx-star[^{]*{[^}]*animation:\s*none/);
    expect(reduce).toMatch(/\.jx-star-flash[^{]*{[^}]*opacity:\s*0/);
    expect(reduce).toMatch(/\.jx-star-glow[^{]*{[^}]*opacity:\s*0/);
  });

  it('takes no text from CSS', () => {
    expect(css).not.toMatch(/(^|[\s{;])content\s*:/);
  });
});
