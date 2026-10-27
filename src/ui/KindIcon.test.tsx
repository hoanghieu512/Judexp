import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import KindIcon from './KindIcon';
import type { EntityKind } from '../domain/events';

const KINDS: EntityKind[] = ['driver', 'restaurant', 'dish', 'place'];
const SIZES = [22, 28, 32] as const;

function icon(kind: EntityKind, size: (typeof SIZES)[number]): HTMLImageElement {
  const { container } = render(<KindIcon kind={kind} size={size} />);
  return container.querySelector('img') as HTMLImageElement;
}

describe('KindIcon', () => {
  it.each(KINDS.flatMap((kind) => SIZES.map((size) => [kind, size] as const)))(
    'has a %s icon at 2x and 3x of %idp',
    (kind, size) => {
      const img = icon(kind, size);
      expect(img.getAttribute('src')).toContain(`${kind}-${size * 2}.webp`);
      expect(img.getAttribute('srcset')).toContain(`${kind}-${size * 3}.webp 3x`);
      expect(img).toHaveAttribute('width', String(size));
      expect(img).toHaveAttribute('data-kind', kind);
    },
  );

  it('is decoration only', () => {
    const img = icon('dish', 22);
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('aria-hidden', 'true');
  });
});
