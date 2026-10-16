import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import LookupPage from './LookupPage';
import { applyEvents, emptyState, type State } from '../domain/reduce';
import type { EntityKind, JudexpEvent, Verdict } from '../domain/events';

const NOW = new Date('2026-10-16T12:00:00Z');

let seq = 0;
function met(
  kind: EntityKind,
  key: string,
  verdict: Verdict | null,
  over: Partial<JudexpEvent> = {},
): JudexpEvent {
  seq += 1;
  return {
    schemaVersion: 1,
    eventId: `u${seq}`,
    type: 'encounter',
    author: 'huynh',
    device: 'zflip4',
    createdAt: '2026-10-14T12:00:00Z',
    visibility: 'private',
    entityRef: { kind, key, label: 'Anh A' },
    verdict,
    tags: [],
    ...over,
  };
}

function stateWith(...events: JudexpEvent[]): State {
  return applyEvents(emptyState(), events);
}

/** Render the page and type a query into its single search box. */
function typeQuery(state: State, query: string) {
  render(<LookupPage state={state} now={NOW} />);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: query } });
}

describe('LookupPage', () => {
  it('focuses the search box on mount', () => {
    render(<LookupPage state={emptyState()} now={NOW} />);
    expect(screen.getByRole('searchbox')).toHaveFocus();
  });

  it('shows the verdict mark, last-seen age, meeting count and top three tags', () => {
    const state = stateWith(
      met('driver', '59H123456', 'bad', { tags: ['chạy ẩu', 'nói nhiều'], createdAt: '2026-10-10T12:00:00Z' }),
      met('driver', '59H123456', 'bad', { tags: ['chạy ẩu', 'vượt đèn đỏ', 'bắt chờ lâu'] }),
    );
    typeQuery(state, '59h1');

    const row = screen.getByTestId('entity-59H123456');
    expect(row).toHaveAttribute('data-color', 'red');
    expect(row).toHaveTextContent('2 lần gặp');
    expect(row).toHaveTextContent('2 ngày trước');
    expect(within(row).getAllByTestId('tag')).toHaveLength(3);
    expect(within(row).getAllByTestId('tag')[0]).toHaveTextContent('chạy ẩu');
  });

  it('shows an unrated entity as grey and says it was never rated', () => {
    const state = stateWith(met('driver', '59H123456', null), met('driver', '59H123456', null));
    typeQuery(state, '59h1');
    const row = screen.getByTestId('entity-59H123456');
    expect(row).toHaveAttribute('data-color', 'grey');
    expect(row).toHaveTextContent('chưa chấm lần nào');
  });

  it('says "chưa gặp người này" instead of rendering an empty list', () => {
    typeQuery(emptyState(), '59H1');
    expect(screen.getByText(/chưa gặp/i)).toBeInTheDocument();
  });

  it('renders a plate in the mono class so 0 and O cannot be confused', () => {
    const state = stateWith(met('driver', '59H123456', 'good'));
    typeQuery(state, '59h1');
    expect(screen.getByTestId('entity-key-59H123456')).toHaveClass('jx-plate');
  });

  it('shows recent meetings before anything is typed', () => {
    const state = stateWith(met('driver', '59H123456', 'good'));
    render(<LookupPage state={state} now={NOW} />);
    expect(screen.getByText(/gặp gần đây/i)).toBeInTheDocument();
    expect(screen.getByTestId('entity-59H123456')).toBeInTheDocument();
  });
});
