import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import QuickRateSheet from './QuickRateSheet';
import type { JudexpEvent } from '../domain/events';

function setup(kind: 'driver' | 'place' = 'driver', extra: Record<string, unknown> = {}) {
  const onSave = vi.fn<(e: JudexpEvent) => void>();
  render(<QuickRateSheet kind={kind} author="huynh" device="zflip4" onSave={onSave} {...extra} />);
  return { onSave };
}

const saveButton = () => screen.getByRole('button', { name: /lưu/i });

describe('QuickRateSheet', () => {
  it('requires a verdict before saving', () => {
    setup();
    fireEvent.change(screen.getByLabelText(/biển số/i), { target: { value: '59H1-234.56' } });
    expect(saveButton()).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /^xấu$/i }));
    expect(saveButton()).toBeEnabled();
  });

  it('requires an entity before saving', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /^xấu$/i }));
    expect(saveButton()).toBeDisabled();
  });

  it('writes an encounter event with the chosen verdict, tags and normalized key', () => {
    const { onSave } = setup();
    fireEvent.change(screen.getByLabelText(/biển số/i), { target: { value: '59H1-234.56' } });
    fireEvent.click(screen.getByRole('button', { name: /^xấu$/i }));
    fireEvent.click(screen.getByRole('button', { name: 'chạy ẩu' }));
    fireEvent.click(saveButton());

    expect(onSave).toHaveBeenCalledTimes(1);
    const event = onSave.mock.calls[0][0];
    expect(event.type).toBe('encounter');
    expect(event.verdict).toBe('bad');
    expect(event.tags).toEqual(['chạy ẩu']);
    expect(event.entityRef).toMatchObject({ kind: 'driver', key: '59H123456' });
    expect(event.source).toMatchObject({ kind: 'manual' });
    expect(event.author).toBe('huynh');
    expect(event.device).toBe('zflip4');
  });

  it('keeps a free-typed tag that is not in the vocabulary', () => {
    const { onSave } = setup();
    fireEvent.change(screen.getByLabelText(/biển số/i), { target: { value: '59H123456' } });
    fireEvent.click(screen.getByRole('button', { name: /^tốt$/i }));
    fireEvent.change(screen.getByLabelText(/tag riêng/i), { target: { value: 'mũ bảo hiểm thơm' } });
    fireEvent.click(screen.getByRole('button', { name: /thêm tag/i }));
    fireEvent.click(saveButton());
    expect(onSave.mock.calls[0][0].tags).toEqual(['mũ bảo hiểm thơm']);
  });

  it('toggles a tag off when tapped twice', () => {
    const { onSave } = setup();
    fireEvent.change(screen.getByLabelText(/biển số/i), { target: { value: '59H123456' } });
    fireEvent.click(screen.getByRole('button', { name: /^ổn$/i }));
    fireEvent.click(screen.getByRole('button', { name: 'chạy ẩu' }));
    fireEvent.click(screen.getByRole('button', { name: 'chạy ẩu' }));
    fireEvent.click(saveButton());
    expect(onSave.mock.calls[0][0].tags).toEqual([]);
  });

  it('attaches coordinates and their accuracy for a place', async () => {
    const getPosition = vi.fn().mockResolvedValue({ lat: 10.77, lng: 106.7, accuracy: 12 });
    const { onSave } = setup('place', { getPosition });
    fireEvent.change(screen.getByLabelText(/tên/i), { target: { value: 'Bún Bò Huế 14' } });
    fireEvent.click(screen.getByRole('button', { name: /toạ độ/i }));
    await screen.findByText(/đã lấy toạ độ/i);
    fireEvent.click(screen.getByRole('button', { name: /^tốt$/i }));
    fireEvent.click(saveButton());
    expect(onSave.mock.calls[0][0].context?.geo).toEqual({ lat: 10.77, lng: 106.7, accuracy: 12 });
  });
});

describe('QuickRateSheet, choosing what is being rated', () => {
  function open() {
    const onSave = vi.fn<(e: JudexpEvent) => void>();
    render(<QuickRateSheet author="huynh" device="zflip4" onSave={onSave} />);
    return { onSave };
  }

  it('offers all four kinds, not drivers alone', () => {
    open();
    for (const label of [/^xe$/i, /^quán$/i, /^món$/i, /^địa điểm$/i]) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('switches the field label and the tag vocabulary with the kind', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: /^quán$/i }));
    expect(screen.getByLabelText(/tên quán/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ship lâu' })).toBeInTheDocument();
  });

  it('writes a restaurant with its normalized key', () => {
    const { onSave } = open();
    fireEvent.click(screen.getByRole('button', { name: /^quán$/i }));
    fireEvent.change(screen.getByLabelText(/tên quán/i), { target: { value: 'Quán Bún Bò Huế 14' } });
    fireEvent.click(screen.getByRole('button', { name: /^tốt$/i }));
    fireEvent.click(screen.getByRole('button', { name: /lưu/i }));
    expect(onSave.mock.calls[0][0].entityRef).toMatchObject({ kind: 'restaurant', key: 'bun bo hue 14' });
  });

  // §6: a place keeps a generated key, so renaming it does not create a new one
  // and two places sharing a name do not collapse into one.
  it('gives a place a generated key and keeps the typed name as its label', () => {
    const { onSave } = open();
    fireEvent.click(screen.getByRole('button', { name: /^địa điểm$/i }));
    fireEvent.change(screen.getByLabelText(/tên địa điểm/i), { target: { value: 'Chỗ ngồi hóng gió' } });
    fireEvent.click(screen.getByRole('button', { name: /^tốt$/i }));
    fireEvent.click(screen.getByRole('button', { name: /lưu/i }));
    const ref = onSave.mock.calls[0][0].entityRef!;
    expect(ref.kind).toBe('place');
    expect(ref.key).toMatch(/^place-[0-9a-f]{8,}/);
    expect(ref.label).toBe('Chỗ ngồi hóng gió');
  });
});
