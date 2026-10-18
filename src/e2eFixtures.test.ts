import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eventFileName, parseEvent } from './domain/events';
import { normalizePlate } from './domain/keys';
import { applyEvents, emptyState } from './domain/reduce';
import { entityColor } from './domain/color';

// The events e2e/scripts/preflight.ts puts into the QA kho. They are pushed as files, so the app
// must read them exactly as if it had written them; a fixture it skipped would make the e2e
// smoke tests fail for a reason that has nothing to do with the app.
const DIR = join(__dirname, '..', 'e2e', 'fixtures', 'events');
const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));

describe('e2e fixture events', () => {
  it('are events the app reads, named the way the app names them', () => {
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const event = parseEvent(readFileSync(join(DIR, file), 'utf8'));
      expect(event, file).not.toBeNull();
      expect(eventFileName(event!)).toBe(file);
    }
  });

  it('stay on the 00E plates kept for e2e, with keys already normalized', () => {
    for (const file of files) {
      const { entityRef } = parseEvent(readFileSync(join(DIR, file), 'utf8'))!;
      expect(entityRef?.key).toMatch(/^00E\d{6}$/);
      expect(normalizePlate(entityRef!.key)).toBe(entityRef!.key);
    }
  });

  it('give one driver never rated and one rated', () => {
    const events = files.map((f) => parseEvent(readFileSync(join(DIR, f), 'utf8'))!);
    const state = applyEvents(emptyState(), events);
    expect(entityColor(state.entities.get('00E000001')!)).toBe('grey');
    expect(entityColor(state.entities.get('00E000002')!)).toBe('green');
  });
});
