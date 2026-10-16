import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { entityColor } from '../domain/color';
import type { Entity } from '../domain/reduce';

// vitest runs from the project root.
const css = readFileSync('src/ui/ui.css', 'utf-8');

/**
 * jsdom does not apply stylesheets, so a component test can assert
 * data-color="red" and still ship a badge with no colour at all. This reads
 * the stylesheet and checks that every value the code can emit is a value
 * the stylesheet styles.
 */
describe('mark colours have a stylesheet rule', () => {
  const colours = ['green', 'yellow', 'red', 'grey'];
  const verdicts = ['good', 'ok', 'bad'];

  it.each(colours)('styles the entity colour %s', (colour) => {
    expect(css).toContain(`.jx-mark[data-color='${colour}']`);
  });

  it.each(verdicts)('styles the encounter verdict %s', (verdict) => {
    expect(css).toContain(`.jx-mark[data-color='${verdict}']`);
  });

  it('covers every colour entityColor can return', () => {
    const base: Entity = {
      key: 'k',
      kind: 'driver',
      labels: [],
      firstSeen: '2026-10-16T10:00:00Z',
      lastSeen: '2026-10-16T10:00:00Z',
      encounters: [],
    };
    const enc = (verdict: 'good' | 'ok' | 'bad' | null, day: number) => ({
      eventId: `e${day}`,
      verdict,
      tags: [],
      happenedAt: `2026-10-${String(day).padStart(2, '0')}T10:00:00Z`,
    });

    const cases: Entity[] = [
      base,
      { ...base, encounters: [enc('good', 1)] },
      { ...base, encounters: [enc('ok', 1)] },
      { ...base, encounters: [enc('bad', 1)] },
    ];
    for (const entity of cases) {
      expect(colours).toContain(entityColor(entity));
      expect(css).toContain(`.jx-mark[data-color='${entityColor(entity)}']`);
    }
  });
});

/**
 * Ionic pins ion-app to the viewport and hides its overflow, so a screen made
 * of plain divs has no scroll container at all: on a 720x720 phone the
 * settings screen simply stops at the bottom edge. jsdom does no layout, so
 * only the stylesheet can be checked here.
 */
describe('the app has somewhere to scroll', () => {
  it('gives the app shell a scrollable full-height container', () => {
    expect(css).toMatch(/\.jx-app\s*{[^}]*height:\s*100%/);
    expect(css).toMatch(/\.jx-app\s*{[^}]*overflow-y:\s*auto/);
  });

  it('lets that container fill the page', () => {
    expect(css).toMatch(/html,\s*body,\s*#root\s*{[^}]*height:\s*100%/);
  });
})

describe('navigation is thumb sized', () => {
  it('gives the nav buttons the touch target the tokens promise', () => {
    expect(css).toMatch(/\.jx-nav-item\s*{[^}]*min-height:\s*var\(--jx-touch-min\)/);
  });
});
