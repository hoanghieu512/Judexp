import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import VerdictMark, { type MarkColor } from './VerdictMark';

function mark(color: MarkColor, glyph: string, label?: string): HTMLElement {
  const { container } = render(<VerdictMark color={color} glyph={glyph} label={label} />);
  return container.querySelector('.jx-mark') as HTMLElement;
}

/** Each verdict has its own shape, not only its own colour (W4). */
describe('VerdictMark', () => {
  it.each(['red', 'bad'] as const)('draws %s as a triangle the reader skips', (color) => {
    const el = mark(color, '✕');
    const svg = el.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(el.textContent).toBe('✕');
    expect(el).toHaveAttribute('data-color', color);
  });

  it.each(['green', 'yellow', 'grey', 'good', 'ok', 'unrated'] as const)('draws %s without a picture', (color) => {
    expect(mark(color, '?').querySelector('svg')).toBeNull();
  });

  it('keeps the label a screen reader reads', () => {
    expect(mark('red', '✕', 'xấu')).toHaveAttribute('aria-label', 'xấu');
    expect(mark('green', '✔')).not.toHaveAttribute('aria-label');
  });
});
