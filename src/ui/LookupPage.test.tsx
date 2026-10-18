import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import LookupPage from './LookupPage';
import { applyEvents, emptyState, type State } from '../domain/reduce';
import type { EntityKind, JudexpEvent, Verdict } from '../domain/events';
import { reminderFor, type LookupTarget } from '../domain/reminders';

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

  it('does not call a place a person when a name finds nothing', () => {
    typeQuery(emptyState(), 'Bún Bò Huế 14');
    expect(screen.getByTestId('no-match')).toHaveTextContent(/chưa ghé chỗ này/i);
    expect(screen.getByTestId('no-match')).not.toHaveTextContent(/người/i);
  });

  it('renders a plate in the mono class so 0 and O cannot be confused', () => {
    const state = stateWith(met('driver', '59H123456', 'good'));
    typeQuery(state, '59h1');
    expect(screen.getByTestId('entity-key-59H123456')).toHaveClass('jx-plate');
  });

  it('orders recent meetings by instant, not by the text of timestamps with different offsets', () => {
    const state = stateWith(
      // 10:00+07:00 is 03:00Z, two hours before the other one.
      met('driver', '51A11111', 'good', { createdAt: '2026-10-14T10:00:00+07:00' }),
      met('driver', '59H123456', 'good', { createdAt: '2026-10-14T05:00:00Z' }),
    );
    render(<LookupPage state={state} now={NOW} />);
    const order = screen.getAllByTestId(/^entity-[0-9A-Z]+$/).map((el) => el.dataset.testid);
    expect(order).toEqual(['entity-59H123456', 'entity-51A11111']);
  });

  it('shows recent meetings before anything is typed', () => {
    const state = stateWith(met('driver', '59H123456', 'good'));
    render(<LookupPage state={state} now={NOW} />);
    expect(screen.getByText(/gặp gần đây/i)).toBeInTheDocument();
    expect(screen.getByTestId('entity-59H123456')).toBeInTheDocument();
  });
});

describe('LookupPage, reporting a finished lookup', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(state: State) {
    vi.useFakeTimers();
    const calls: string[] = [];
    const onLookup = vi.fn((t: LookupTarget) => void calls.push(`lookup:${t.key}`));
    const onOpen = vi.fn((key: string) => void calls.push(`open:${key}`));
    const view = render(<LookupPage state={state} now={NOW} onOpen={onOpen} onLookup={onLookup} />);
    const type = (value: string) => fireEvent.change(screen.getByRole('searchbox'), { target: { value } });
    const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
    return { onLookup, onOpen, calls, type, wait, view };
  }

  it('reports a lookup once the box has been still for 2.5 seconds', () => {
    const { onLookup, type, wait } = setup(stateWith(met('driver', '59H123456', 'bad', { entityRef: { kind: 'driver', key: '59H123456', label: '59H1-234.56' } })));
    type('59H1-234.56');
    wait(2499);
    expect(onLookup).not.toHaveBeenCalled();
    wait(1);
    expect(onLookup).toHaveBeenCalledTimes(1);
    expect(onLookup).toHaveBeenCalledWith({ kind: 'driver', key: '59H123456', label: '59H1-234.56' });
  });

  it('reports a new full plate that finds nothing', () => {
    const { onLookup, type, wait } = setup(emptyState());
    type('51A99999');
    wait(2500);
    expect(onLookup).toHaveBeenCalledWith({ kind: 'driver', key: '51A99999', label: '51A99999' });
  });

  it('does not report while several entities match or the plate is half typed', () => {
    const { onLookup, type, wait } = setup(stateWith(met('driver', '59H123456', 'good'), met('driver', '59H123457', 'good')));
    type('59h1');
    wait(5000);
    expect(onLookup).not.toHaveBeenCalled();
  });

  it('reports a whole plate typed exactly, even when a neighbour plate also matches', () => {
    const { onLookup, type, wait } = setup(stateWith(met('driver', '59H123456', 'good'), met('driver', '59H123457', 'good')));
    type('59H1-234.56');
    wait(5000);
    expect(onLookup).toHaveBeenCalledTimes(1);
    expect(onLookup.mock.calls[0][0].key).toBe('59H123456');
  });

  it('does not report the same settled query twice', () => {
    const state = stateWith(met('driver', '59H123456', 'good'));
    const { onLookup, onOpen, type, wait, view } = setup(state);
    type('23456');
    wait(2500);
    // The index refreshes: same entity, new state object.
    view.rerender(<LookupPage state={stateWith(met('driver', '59H123456', 'good'))} now={NOW} onOpen={onOpen} onLookup={onLookup} />);
    wait(5000);
    expect(onLookup).toHaveBeenCalledTimes(1);
  });

  it('reports the same words again after the box was cleared', () => {
    const { onLookup, type, wait } = setup(stateWith(met('driver', '59H123456', 'good')));
    type('23456');
    wait(2500);
    type('');
    type('23456');
    wait(2500);
    expect(onLookup).toHaveBeenCalledTimes(2);
  });

  it('reports at once when a result is opened', () => {
    const { calls, type } = setup(stateWith(met('driver', '59H123456', 'good')));
    type('23456');
    fireEvent.click(screen.getByTestId('entity-59H123456'));
    expect(calls).toEqual(['lookup:59H123456', 'open:59H123456']);
  });

  it('does not report opening a row from Gặp gần đây', () => {
    const { onLookup, onOpen } = setup(stateWith(met('driver', '59H123456', 'good')));
    fireEvent.click(screen.getByTestId('entity-59H123456'));
    expect(onOpen).toHaveBeenCalledWith('59H123456');
    expect(onLookup).not.toHaveBeenCalled();
  });
});

describe('LookupPage, Chờ chấm', () => {
  it('shows Chờ chấm above Gặp gần đây when the box is empty', () => {
    const pending = reminderFor({ kind: 'driver', key: '51A99999', label: '51A-999.99' }, new Date('2026-10-16T11:00:00Z'), 'content://kho');
    render(<LookupPage state={stateWith(met('driver', '59H123456', 'good'))} now={NOW} reminders={[pending]} onAnswer={() => {}} />);
    const headings = screen.getAllByRole('heading').map((h) => h.textContent);
    expect(headings.indexOf('Chờ chấm')).toBeGreaterThanOrEqual(0);
    expect(headings.indexOf('Chờ chấm')).toBeLessThan(headings.indexOf('Gặp gần đây'));
  });

  it('puts entities with an unrated meeting in Chờ chấm', () => {
    render(<LookupPage state={stateWith(met('driver', '51A99999', null))} now={NOW} reminders={[]} onAnswer={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Chờ chấm' })).toBeInTheDocument();
  });
});
