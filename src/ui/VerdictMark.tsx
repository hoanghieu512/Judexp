import type { EntityColor } from '../domain/color';
import type { Verdict } from '../domain/events';

/**
 * What a mark can show: an entity's colour rolled up from its history, a
 * single encounter's verdict, or no rating at all.
 */
export type MarkColor = EntityColor | Verdict | 'unrated';

/**
 * A verdict by shape as well as colour (W4): Tốt a circle, Ổn a rounded
 * square, Xấu a triangle, unrated a dashed circle. The triangle is an SVG
 * because clip-path would cut its border off (W15). The glyph stays the only
 * text inside, so what a reader or a test reads is unchanged.
 */
export default function VerdictMark({ color, glyph, label }: { color: MarkColor; glyph: string; label?: string }) {
  const triangle = color === 'red' || color === 'bad';
  return (
    <span className="jx-mark" data-color={color} aria-label={label}>
      {triangle && (
        <svg className="jx-mark-shape" viewBox="0 0 40 36" aria-hidden="true">
          <path d="M20 2 L38 34 H2 Z" />
        </svg>
      )}
      {glyph}
    </span>
  );
}
