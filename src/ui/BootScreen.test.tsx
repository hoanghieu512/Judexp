import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import BootScreen from './BootScreen';

// vitest runs from the project root.
const css = readFileSync('src/ui/logo.css', 'utf-8');

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
    const delays = [...container.querySelectorAll<SVGElement>('.jx-star')].map((star) => star.style.getPropertyValue('--star-delay'));
    expect(delays).toEqual(['0ms', '150ms', '300ms', '450ms', '600ms']);
  });
});

/** jsdom has no matchMedia and applies no CSS, so the stylesheet is read as text. */
describe('the boot stars stylesheet', () => {
  it('has the pop and the shimmer', () => {
    expect(css).toMatch(/@keyframes jx-pop/);
    expect(css).toMatch(/@keyframes jx-shimmer/);
  });

  it('stands still when the phone asks for less motion', () => {
    const reduce = /@media \(prefers-reduced-motion: reduce\)\s*{([\s\S]*?)}\s*}/.exec(css)?.[1] ?? '';
    expect(reduce).toMatch(/\.jx-star\s*{[^}]*animation:\s*none/);
    expect(reduce).toMatch(/\.jx-star\s*{[^}]*fill:\s*var\(--jx-star\)/);
  });

  it('takes no text from CSS', () => {
    expect(css).not.toMatch(/(^|[\s{;])content\s*:/);
  });
});
