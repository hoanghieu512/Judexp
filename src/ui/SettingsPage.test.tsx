import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SettingsPage from './SettingsPage';

function show(over: Record<string, unknown> = {}) {
  const props = {
    kho: { rootUri: 'content://kho/huynh', label: 'Prod huynh' },
    status: 'synced' as const,
    deviceId: 'zflip4',
    skipped: [] as string[],
    workerLog: '',
    syncConfig: { baseUrl: 'http://127.0.0.1:8384', apiKey: 'k', folderId: 'judexp-hieu-qa', atommanDeviceId: 'A' },
    onSyncConfig: vi.fn(),
    onPickKho: vi.fn(),
    onRebuild: vi.fn(),
    onDeviceId: vi.fn(),
    ...over,
  };
  render(<SettingsPage {...props} />);
  return props;
}

describe('SettingsPage', () => {
  it('shows which kho is in use', () => {
    show();
    expect(screen.getByTestId('kho-label')).toHaveTextContent('Prod huynh');
  });

  it('shows the three-state sync light', () => {
    show({ status: 'unreachable' });
    expect(screen.getByTestId('sync-light')).toHaveAttribute('data-status', 'unreachable');
    expect(screen.getByTestId('sync-light')).toHaveTextContent(/chưa thấy atomman/i);
  });

  it('asks before rebuilding the index and only then calls back', () => {
    const props = show();
    fireEvent.click(screen.getByRole('button', { name: /dựng lại index/i }));
    expect(props.onRebuild).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /chắc chắn/i }));
    expect(props.onRebuild).toHaveBeenCalledTimes(1);
  });

  it('says the light is unconfigured rather than blaming Atomman', () => {
    show({ status: 'unconfigured' });
    expect(screen.getByTestId('sync-light')).toHaveTextContent(/chưa cấu hình syncthing/i);
  });

  it('saves the Atomman device id huynh types', () => {
    const props = show();
    fireEvent.blur(screen.getByLabelText(/device id của atomman/i), { target: { value: 'ATOM-1' } });
    expect(props.onSyncConfig).toHaveBeenCalledWith(expect.objectContaining({ atommanDeviceId: 'ATOM-1' }));
  });

  it('surfaces event files that could not be read instead of swallowing them', () => {
    show({ skipped: ['broken.json', 'half.json'] });
    expect(screen.getByTestId('skipped')).toHaveTextContent('2 file');
  });

  it('says nothing about skipped files when there are none', () => {
    show();
    expect(screen.queryByTestId('skipped')).not.toBeInTheDocument();
  });
});
