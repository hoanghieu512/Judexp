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
