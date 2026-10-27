import type { CSSProperties } from 'react';
import cyclo from '../assets/watercolor/logo-cyclo.webp';
import './logo.css';

/**
 * The five stars around the cyclo, from the approved boot screen (spec
 * Watercolor §6.4): centre and size in percent of the 4:5 frame (x and size
 * of its width, y of its height), and when each one pops.
 */
export const STARS: { x: number; y: number; size: number; delay: number }[] = [
  { x: 9.5, y: 5.7, size: 8.3, delay: 0 },
  { x: 88.1, y: 7.6, size: 7.1, delay: 150 },
  { x: 97.6, y: 38.1, size: 6.0, delay: 300 },
  { x: 2.4, y: 43.8, size: 6.0, delay: 450 },
  { x: 52.4, y: 0, size: 6.0, delay: 600 },
];

/** A four-pointed star in a 24 x 24 box. */
const STAR = 'M12 0C12.9 7.2 16.8 11.1 24 12C16.8 12.9 12.9 16.8 12 24C11.1 16.8 7.2 12.9 0 12C7.2 11.1 11.1 7.2 12 0Z';

/** The dotted road under the word. */
const ROAD = 'M4 8 C 40 3, 70 12, 100 7 S 160 3, 196 8';

/**
 * The full logo (W6): the cyclo, the word Judexp, and a dotted road. The word
 * and the road are drawn, not part of the picture, so they take the colours
 * of day and night. `boot` is the boot screen's, with stars; `header` heads
 * Settings, small and still.
 */
export default function LogoLockup({ variant }: { variant: 'boot' | 'header' }) {
  return (
    <div className={`jx-logo jx-logo-${variant}`}>
      <div className="jx-logo-halo" aria-hidden="true" />
      <img className="jx-logo-cyclo" src={cyclo} alt="" />
      <span className="jx-logo-word">Judexp</span>
      <svg className="jx-logo-road" viewBox="0 0 200 14" aria-hidden="true">
        <path d={ROAD} />
      </svg>
      {variant === 'boot' && (
        // 100 x 125 is the frame; each star sits in its own group so the
        // animation's transform does not replace its position.
        <svg className="jx-logo-stars" viewBox="0 0 100 125" aria-hidden="true">
          {STARS.map((star) => (
            <g
              key={star.delay}
              transform={`translate(${star.x - star.size / 2} ${star.y * 1.25 - star.size / 2}) scale(${star.size / 24})`}
            >
              <path className="jx-star" d={STAR} style={{ '--star-delay': `${star.delay}ms` } as CSSProperties} />
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}
