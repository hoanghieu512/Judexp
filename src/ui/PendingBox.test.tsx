import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import PendingBox from './PendingBox';
import { reminderFor } from '../domain/reminders';
import type { Entity } from '../domain/reduce';

const NOW = new Date('2026-10-18T13:20:00Z');
const plateReminder = reminderFor({ kind: 'driver', key: '59H123456', label: '59H1-234.56' }, new Date('2026-10-18T11:40:00Z'), 'content://kho');

const unratedEntity: Entity = {
  key: '51A99999',
  kind: 'driver',
  labels: ['51A-999.99'],
  firstSeen: '2026-10-17T10:00:00Z',
  lastSeen: '2026-10-17T10:00:00Z',
  encounters: [{ eventId: 'e1', verdict: null, tags: [], happenedAt: '2026-10-17T10:00:00Z' }],
};

function show(over: Partial<Parameters<typeof PendingBox>[0]> = {}) {
  const props = { reminders: [plateReminder], unrated: [], now: NOW, onAnswer: vi.fn(), onOpen: vi.fn(), ...over };
  const view = render(<PendingBox {...props} />);
  return { ...props, view };
}

describe('PendingBox', () => {
  it('lists each pending reminder with the four answers', () => {
    show();
    expect(screen.getByRole('heading', { name: 'Chờ chấm' })).toBeInTheDocument();
    const row = screen.getByTestId('reminder-driver:59H123456');
    expect(within(row).getByText('59H1-234.56')).toHaveClass('jx-plate');
    expect(row).toHaveTextContent('tra hôm nay');
    const names = within(row).getAllByRole('button').map((b) => b.textContent?.replace(/[✔–✕]/g, '').trim());
    expect(names).toEqual(['Tốt', 'Ổn', 'Xấu', 'Không đi']);
  });

  it('answers a reminder with the tapped button', () => {
    const { onAnswer } = show();
    fireEvent.click(screen.getByRole('button', { name: /xấu/i }));
    expect(onAnswer).toHaveBeenLastCalledWith(plateReminder, 'bad');
    fireEvent.click(screen.getByRole('button', { name: /không đi/i }));
    expect(onAnswer).toHaveBeenLastCalledWith(plateReminder, 'skip');
  });

  it('shows a restaurant name in the name style, not the plate style', () => {
    const place = reminderFor({ kind: 'restaurant', key: 'com tam ba ghi', label: 'Cơm Tấm Ba Ghi' }, new Date('2026-10-18T11:40:00Z'), 'content://kho');
    show({ reminders: [place] });
    expect(screen.getByText('Cơm Tấm Ba Ghi')).toHaveClass('jx-name');
  });

  it('lists entities met but never rated, and opens one', () => {
    const { onOpen } = show({ reminders: [], unrated: [unratedEntity] });
    fireEvent.click(screen.getByTestId('entity-51A99999'));
    expect(onOpen).toHaveBeenCalledWith('51A99999');
  });

  it('shows nothing when nothing waits', () => {
    const { view } = show({ reminders: [], unrated: [] });
    expect(view.container).toBeEmptyDOMElement();
  });
});
