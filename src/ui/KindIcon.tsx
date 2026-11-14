import type { EntityKind } from '../domain/events';

/** Every exported size of every kind, by file name: `driver-44.webp` and so on. */
const FILES = import.meta.glob<string>('../assets/kinds/*.webp', { eager: true, import: 'default' });

function file(kind: EntityKind, px: number): string {
  return FILES[`../assets/kinds/${kind}-${px}.webp`];
}

/**
 * The K1 watercolour icon of a kind (W9), pre-scaled to 2x and 3x so it stays
 * sharp at 22dp. Decoration only: the row's label already says what it is.
 */
export default function KindIcon({ kind, size }: { kind: EntityKind; size: 22 | 28 | 32 }) {
  const twice = file(kind, size * 2);
  return (
    <img
      className="jx-kind"
      data-kind={kind}
      src={twice}
      srcSet={`${twice} 2x, ${file(kind, size * 3)} 3x`}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      decoding="async"
    />
  );
}
