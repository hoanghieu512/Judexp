import { describe, it, expect } from 'vitest';
import { mergeCandidates } from './merge';
import { applyEvents, emptyState, type State } from './reduce';
import type { Geo, JudexpEvent } from './events';

let seq = 0;
function place(key: string, label: string, geo?: Geo): JudexpEvent {
  seq += 1;
  return {
    schemaVersion: 1,
    eventId: `m${seq}`,
    type: 'encounter',
    author: 'huynh',
    device: 'zflip4',
    createdAt: '2026-10-16T12:00:00Z',
    visibility: 'private',
    entityRef: { kind: 'restaurant', key, label },
    verdict: 'good',
    context: geo ? { geo } : undefined,
  };
}

function stateWith(...events: JudexpEvent[]): State {
  return applyEvents(emptyState(), events);
}

const near: Geo = { lat: 10.7769, lng: 106.7009, accuracy: 10 };
/** Roughly 90m north of `near`. */
const alsoNear: Geo = { lat: 10.7777, lng: 106.7009, accuracy: 10 };
/** Roughly 5km away. */
const far: Geo = { lat: 10.8219, lng: 106.7009, accuracy: 10 };

function candidateKeys(state: State, key: string) {
  return mergeCandidates(state, state.entities.get(key)!).map((c) => c.entity.key);
}

describe('mergeCandidates', () => {
  it('suggests a similar name within 150m', () => {
    const st = stateWith(place('bun bo hue 14', 'Bún Bò Huế 14', near), place('bun bo 14', 'Bún Bò 14', alsoNear));
    expect(candidateKeys(st, 'bun bo hue 14')).toEqual(['bun bo 14']);
  });

  it('does not suggest a similar name 5km away when both positions are accurate', () => {
    const st = stateWith(place('bun bo hue 14', 'Bún Bò Huế 14', near), place('bun bo 14', 'Bún Bò 14', far));
    expect(candidateKeys(st, 'bun bo hue 14')).toEqual([]);
  });

  it('does not suggest two different names that merely stand close together', () => {
    const st = stateWith(place('bun bo hue 14', 'Bún Bò Huế 14', near), place('com tam ba ghien', 'Cơm Tấm Bà Ghiền', alsoNear));
    expect(candidateKeys(st, 'bun bo hue 14')).toEqual([]);
  });

  it('falls back to name only when accuracy is worse than 100m, and says so', () => {
    const vague: Geo = { lat: 10.9, lng: 106.9, accuracy: 300 };
    const st = stateWith(place('bun bo hue 14', 'Bún Bò Huế 14', near), place('bun bo 14', 'Bún Bò 14', vague));
    const found = mergeCandidates(st, st.entities.get('bun bo hue 14')!);
    expect(found.map((c) => c.entity.key)).toEqual(['bun bo 14']);
    expect(found[0].basis).toBe('name-only');
  });

  it('falls back to name only when one side has no coordinates at all', () => {
    const st = stateWith(place('bun bo hue 14', 'Bún Bò Huế 14', near), place('bun bo 14', 'Bún Bò 14'));
    expect(mergeCandidates(st, st.entities.get('bun bo hue 14')!)[0].basis).toBe('name-only');
  });

  it('keeps an older accurate position when the newest one is too vague to use', () => {
    const accurateVisit = { ...place('bun bo hue 14', 'Bún Bò Huế 14', far), createdAt: '2026-10-16T10:00:00Z' };
    const vagueVisit = {
      ...place('bun bo hue 14', 'Bún Bò Huế 14', { lat: 10.9, lng: 106.9, accuracy: 300 }),
      createdAt: '2026-10-16T12:00:00Z',
    };
    const st = stateWith(accurateVisit, vagueVisit, place('bun bo 14', 'Bún Bò 14', near));
    // The accurate visit puts this place 5km from the other one, so no question.
    expect(candidateKeys(st, 'bun bo hue 14')).toEqual([]);
  });

  it('never suggests an entity of another kind, itself, or one already merged away', () => {
    const st = stateWith(
      place('bun bo hue 14', 'Bún Bò Huế 14', near),
      place('bun bo 14', 'Bún Bò 14', alsoNear),
      { ...place('bun bo 14', 'Bún Bò 14'), type: 'merge', fromKey: 'bun bo 14', intoKey: 'bun bo hue 14', createdAt: '2026-10-16T13:00:00Z' },
    );
    expect(candidateKeys(st, 'bun bo hue 14')).toEqual([]);
  });
});

describe('mergeCandidates, kinds other than restaurant', () => {
  function driver(key: string, label: string): JudexpEvent {
    seq += 1;
    return {
      schemaVersion: 1,
      eventId: `d${seq}`,
      type: 'encounter',
      author: 'huynh',
      device: 'zflip4',
      createdAt: '2026-10-16T12:00:00Z',
      visibility: 'private',
      entityRef: { kind: 'driver', key, label },
      verdict: 'good',
    };
  }

  // A plate is an identity, not a name: two plates one character apart are two
  // different vehicles, and merging them tangles two people's histories.
  it('never suggests merging two drivers, however close the plates look', () => {
    const st = stateWith(driver('59H123456', '59H1-234.56'), driver('59H123457', '59H1-234.57'));
    expect(mergeCandidates(st, st.entities.get('59H123456')!)).toEqual([]);
  });

  it('never suggests merging two drivers who happen to share a name label', () => {
    const st = stateWith(driver('51A11111', 'Anh Tuấn'), driver('77B99999', 'Anh Tuấn'));
    expect(mergeCandidates(st, st.entities.get('51A11111')!)).toEqual([]);
  });
});
