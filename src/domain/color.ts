/**
 * The colour an entity wears in search results.
 *
 * It answers one question, asked while standing on the street: should I use
 * this again? So it is not an average. One bad ride last week outweighs a
 * year of fine ones, and a place nobody has rated yet says so plainly
 * instead of pretending to be good.
 */

import { instant, type Entity } from './reduce';

export type EntityColor = 'grey' | 'red' | 'yellow' | 'green';

/** How many times this entity was met, rated or not. */
export function meetingCount(entity: Entity): number {
  return entity.encounters.length;
}

export function entityColor(entity: Entity): EntityColor {
  const rated = entity.encounters
    .filter((e) => e.verdict !== null)
    .sort((a, b) => instant(a.happenedAt) - instant(b.happenedAt));

  if (rated.length === 0) return 'grey';

  const window = rated.slice(-5);
  const latest = rated[rated.length - 1].verdict;
  const bad = window.filter((e) => e.verdict === 'bad').length;

  if (latest === 'bad' || bad >= 2) return 'red';
  if (bad === 0 && latest === 'good') return 'green';
  return 'yellow';
}
