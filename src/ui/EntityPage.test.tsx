import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import EntityPage from './EntityPage';
import { applyEvents, emptyState, type State } from '../domain/reduce';
import type { Geo, JudexpEvent, Verdict } from '../domain/events';

const NOW = new Date('2026-10-16T12:00:00Z');

let seq = 0;
function met(key: string, label: string, verdict: Verdict | null, over: Partial<JudexpEvent> = {}): JudexpEvent {
  seq += 1;
  return {
    schemaVersion: 1,
    eventId: `p${seq}`,
    type: 'encounter',
    author: 'huynh',
    device: 'zflip4',
    createdAt: '2026-10-10T12:00:00Z',
    visibility: 'private',
    entityRef: { kind: 'restaurant', key, label },
    verdict,
    tags: [],
    ...over,
  };
}

function stateWith(...events: JudexpEvent[]): State {
  return applyEvents(emptyState(), events);
}

const near: Geo = { lat: 10.7769, lng: 106.7009, accuracy: 10 };
const alsoNear: Geo = { lat: 10.7777, lng: 106.7009, accuracy: 10 };

function show(state: State, key: string) {
  const onSave = vi.fn<(e: JudexpEvent) => void>();
  render(<EntityPage state={state} entityKey={key} now={NOW} author="huynh" device="zflip4" onSave={onSave} />);
  return { onSave };
}

describe('EntityPage', () => {
  it('lists encounters newest first with verdict and tags', () => {
    const state = stateWith(
      met('bun bo hue 14', 'Bún Bò Huế 14', 'good', { createdAt: '2026-10-01T12:00:00Z', tags: ['ngon'] }),
      met('bun bo hue 14', 'Bún Bò Huế 14', 'bad', { createdAt: '2026-10-14T12:00:00Z', tags: ['nguội'] }),
    );
    show(state, 'bun bo hue 14');
    const rows = screen.getAllByTestId('encounter');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute('data-verdict', 'bad');
    expect(within(rows[0]).getByText('nguội')).toBeInTheDocument();
    expect(rows[1]).toHaveAttribute('data-verdict', 'good');
  });

  it('lists every label the entity has ever had', () => {
    const state = stateWith(
      met('bun bo hue 14', 'Bún Bò Cô Ba', 'good'),
      met('bun bo hue 14', 'Bún Bò Huế 14', 'good', { createdAt: '2026-10-14T12:00:00Z' }),
    );
    show(state, 'bun bo hue 14');
    const labels = screen.getByTestId('labels');
    expect(labels).toHaveTextContent('Bún Bò Cô Ba');
    expect(labels).toHaveTextContent('Bún Bò Huế 14');
  });

  it('asks about a nearby similar place and writes nothing on its own', () => {
    const state = stateWith(
      met('bun bo hue 14', 'Bún Bò Huế 14', 'good', { context: { geo: near } }),
      met('bun bo 14', 'Bún Bò 14', 'good', { context: { geo: alsoNear } }),
    );
    const { onSave } = show(state, 'bun bo hue 14');
    expect(screen.getByText(/có phải cùng một quán/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('writes a merge event only after the user confirms', () => {
    const state = stateWith(
      met('bun bo hue 14', 'Bún Bò Huế 14', 'good', { context: { geo: near } }),
      met('bun bo 14', 'Bún Bò 14', 'good', { context: { geo: alsoNear } }),
    );
    const { onSave } = show(state, 'bun bo hue 14');
    fireEvent.click(screen.getByRole('button', { name: /đúng, gộp/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const event = onSave.mock.calls[0][0];
    expect(event.type).toBe('merge');
    expect(event.fromKey).toBe('bun bo 14');
    expect(event.intoKey).toBe('bun bo hue 14');
  });

  it('warns that it cannot tell whether a name-only match is the same place', () => {
    const state = stateWith(
      met('bun bo hue 14', 'Bún Bò Huế 14', 'good', { context: { geo: near } }),
      met('bun bo 14', 'Bún Bò 14', 'good'),
    );
    show(state, 'bun bo hue 14');
    expect(screen.getByText(/chưa biết có cùng chỗ/i)).toBeInTheDocument();
  });

  it('says nothing about merging when there is no candidate', () => {
    const state = stateWith(met('bun bo hue 14', 'Bún Bò Huế 14', 'good'));
    show(state, 'bun bo hue 14');
    expect(screen.queryByText(/có phải cùng một quán/i)).not.toBeInTheDocument();
  });
});
