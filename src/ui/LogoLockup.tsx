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
        // HTML layers, not SVG paths: only opacity and transform move, which the
        // compositor runs off the main thread the kho opening needs. Each star
        // stacks a soft glow, the gold star and a white one that flashes first.
        <div className="jx-logo-stars" aria-hidden="true">
          {STARS.map((star) => (
            <span
              key={star.delay}
              className="jx-star"
              style={
                {
                  // left, width and margins are shares of the frame's width;
                  // top is a share of its height, as the table gives it.
                  left: `${star.x - star.size / 2}%`,
                  top: `${star.y}%`,
                  marginTop: `${-star.size / 2}%`,
                  width: `${star.size}%`,
                  '--star-delay': `${star.delay}ms`,
                } as CSSProperties
              }
            >
              <span className="jx-star-twinkle">
                <span className="jx-star-glow" />
                <svg className="jx-star-gold" viewBox="0 0 24 24">
                  <path d={STAR} />
                </svg>
                <span className="jx-star-flash">
                  <svg viewBox="0 0 24 24">
                    <path d={STAR} />
                  </svg>
                </span>
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
