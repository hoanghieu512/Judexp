import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import SettingsPage from './SettingsPage';

function show(over: Record<string, unknown> = {}) {
  const props = {
    kho: { rootUri: 'content://kho/huynh', label: 'Prod huynh' },
    status: 'synced' as const,
    deviceId: 'zflip4',
    skipped: [] as string[],
    workerLog: '',
    syncConfig: { baseUrl: 'https://127.0.0.1:8384', apiKey: 'k', folderId: 'judexp-hieu-qa', atommanDeviceId: 'A' },
    onSyncConfig: vi.fn(),
    pin: null as string | null,
    khoLog: [] as string[],
    author: 'hieu',
    onAuthor: vi.fn(),
    onPin: vi.fn(),
    onPickKho: vi.fn(),
    onRebuild: vi.fn(),
    onDeviceId: vi.fn(),
    notifications: 'on' as const,
    onAskNotifications: vi.fn(),
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

  it('says Atomman is the one missing when that is the fault', () => {
    show({ status: 'atomman-offline' });
    expect(screen.getByTestId('sync-light')).toHaveTextContent(/chưa thấy atomman/i);
  });

  it('names a wrong api key as the fault when that is what it is', () => {
    show({ status: 'bad-api-key' });
    expect(screen.getByTestId('sync-light')).toHaveTextContent(/api key/i);
  });

  it('blames Syncthing on this phone when that is the fault instead', () => {
    show({ status: 'no-syncthing' });
    expect(screen.getByTestId('sync-light')).toHaveTextContent(/syncthing trên máy này/i);
  });

  it('lets huynh fix the Syncthing address when it is not the default', () => {
    const props = show();
    fireEvent.change(screen.getByLabelText(/địa chỉ syncthing/i), { target: { value: 'https://127.0.0.1:9999' } });
    fireEvent.click(screen.getByRole('button', { name: /lưu và kiểm tra/i }));
    expect(props.onSyncConfig).toHaveBeenCalledWith(expect.objectContaining({ baseUrl: 'https://127.0.0.1:9999' }));
  });

  it('asks before rebuilding the index and only then calls back', () => {
    const props = show();
    fireEvent.click(screen.getByRole('button', { name: /dựng lại index/i }));
    expect(props.onRebuild).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /chắc chắn/i }));
    expect(props.onRebuild).toHaveBeenCalledTimes(1);
  });

  it('shows the rebuild running, allows no second one, and says when it is done', async () => {
    let finish!: () => void;
    const onRebuild = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    show({ onRebuild });
    fireEvent.click(screen.getByRole('button', { name: /dựng lại index/i }));
    fireEvent.click(screen.getByRole('button', { name: /chắc chắn/i }));

    expect(screen.getByRole('status')).toHaveTextContent(/đang dựng lại/i);
    expect(screen.queryByRole('button', { name: /dựng lại index/i })).toBeNull();

    await act(async () => finish());
    expect(screen.getByRole('status')).toHaveTextContent(/đã dựng lại xong/i);
    expect(screen.getByRole('button', { name: /dựng lại index/i })).toBeInTheDocument();
    expect(onRebuild).toHaveBeenCalledTimes(1);
  });

  it('says what went wrong when the rebuild fails', async () => {
    const onRebuild = vi.fn(() => Promise.reject(new Error('kho đã bị rút')));
    show({ onRebuild });
    fireEvent.click(screen.getByRole('button', { name: /dựng lại index/i }));
    fireEvent.click(screen.getByRole('button', { name: /chắc chắn/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('kho đã bị rút');
  });

  it('says when reminder notifications are off and asks again on tap', () => {
    const props = show({ notifications: 'off' });
    expect(screen.getByText(/thông báo nhắc chấm đang tắt, chỉ còn hộp chờ chấm/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /bật thông báo/i }));
    expect(props.onAskNotifications).toHaveBeenCalledTimes(1);
  });

  it('says the light is unconfigured rather than blaming Atomman', () => {
    show({ status: 'unconfigured' });
    expect(screen.getByTestId('sync-light')).toHaveTextContent(/chưa cấu hình syncthing/i);
  });

  it('saves the Atomman device id huynh types, once the save button is tapped', () => {
    const props = show();
    fireEvent.change(screen.getByLabelText(/device id của atomman/i), { target: { value: 'ATOM-1' } });
    fireEvent.click(screen.getByRole('button', { name: /lưu và kiểm tra/i }));
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

describe('SettingsPage, pin', () => {
  it('saves a pin huynh types', () => {
    const props = show();
    fireEvent.blur(screen.getByLabelText(/^pin/i), { target: { value: '1234' } });
    expect(props.onPin).toHaveBeenCalledWith('1234');
  });

  it('clears the pin when the field is emptied', () => {
    const props = show({ pin: '1234' });
    fireEvent.blur(screen.getByLabelText(/^pin/i), { target: { value: '' } });
    expect(props.onPin).toHaveBeenCalledWith(null);
  });

  it('shows the kho log so a sync-conflict is not swallowed', () => {
    show({ khoLog: ['skipping sync-conflict file: a.sync-conflict-x.json'] });
    expect(screen.getByTestId('kho-log')).toHaveTextContent(/sync-conflict/i);
  });
});

describe('SettingsPage, author', () => {
  it('shows who events on this phone are written by', () => {
    show({ author: 'hieu' });
    expect(screen.getByLabelText(/người ghi/i)).toHaveValue('hieu');
  });

  it('saves a different author when huynh changes it', () => {
    const props = show({ author: 'judexp-hieu' });
    fireEvent.blur(screen.getByLabelText(/người ghi/i), { target: { value: 'Hieu' } });
    expect(props.onAuthor).toHaveBeenCalledWith('Hieu');
  });
});

describe('SettingsPage, saving and testing the connection', () => {
  it('saves every field at once and tests, without needing each one to lose focus', () => {
    const props = show({ syncConfig: { baseUrl: 'https://127.0.0.1:8384', apiKey: '', folderId: '', atommanDeviceId: '' } });
    fireEvent.change(screen.getByLabelText(/api key/i), { target: { value: 'KEY-1' } });
    fireEvent.change(screen.getByLabelText(/device id của atomman/i), { target: { value: 'ATOM-FULL' } });
    fireEvent.change(screen.getByLabelText(/folder id/i), { target: { value: 'judexp-hieu-qa' } });
    fireEvent.click(screen.getByRole('button', { name: /lưu và kiểm tra/i }));

    expect(props.onSyncConfig).toHaveBeenCalledWith({
      baseUrl: 'https://127.0.0.1:8384',
      apiKey: 'KEY-1',
      atommanDeviceId: 'ATOM-FULL',
      folderId: 'judexp-hieu-qa',
    });
  });

  it('warns when the Atomman id is only part of one', () => {
    show({ syncConfig: { baseUrl: 'https://127.0.0.1:8384', apiKey: 'k', folderId: 'f', atommanDeviceId: 'KTW2JAW' } });
    expect(screen.getByTestId('atomman-hint')).toHaveTextContent(/ngắn hơn/i);
  });

  it('says nothing about the id once it is complete', () => {
    show({
      syncConfig: {
        baseUrl: 'https://127.0.0.1:8384',
        apiKey: 'k',
        folderId: 'f',
        atommanDeviceId: 'P56IOI7-MZJNU2Y-IQGDREY-DM2MGTI-MGL3BXN-PQ6W5BM-TBBZ4TJ-XZWICQ2',
      },
    });
    expect(screen.queryByTestId('atomman-hint')).not.toBeInTheDocument();
  });
});

describe('SettingsPage, the api key field', () => {
  it('warns when a device id was pasted into the api key', () => {
    show({
      syncConfig: {
        baseUrl: 'https://127.0.0.1:8384',
        apiKey: 'N2YBQN5-3SSVHJD-55UCV6F-QEKAOBD',
        folderId: 'f',
        atommanDeviceId: 'P56IOI7-MZJNU2Y-IQGDREY-DM2MGTI-MGL3BXN-PQ6W5BM-TBBZ4TJ-XZWICQ2',
      },
    });
    expect(screen.getByTestId('apikey-hint')).toHaveTextContent(/device id/i);
  });

  it('says nothing for a real api key', () => {
    show({
      syncConfig: {
        baseUrl: 'https://127.0.0.1:8384',
        apiKey: 'tP3mXq8ZfLb2Rw9KdNc5VhJy7Gs4Au6E',
        folderId: 'f',
        atommanDeviceId: 'P56IOI7-MZJNU2Y-IQGDREY-DM2MGTI-MGL3BXN-PQ6W5BM-TBBZ4TJ-XZWICQ2',
      },
    });
    expect(screen.queryByTestId('apikey-hint')).not.toBeInTheDocument();
  });
});

describe('SettingsPage, a draft that is not in use yet', () => {
  const saved = {
    baseUrl: 'https://127.0.0.1:8384',
    apiKey: 'old-key',
    folderId: 'judexp-hieu-qa',
    atommanDeviceId: 'P56IOI7-MZJNU2Y-IQGDREY-DM2MGTI-MGL3BXN-PQ6W5BM-TBBZ4TJ-XZWICQ2',
  };

  // Typing a correct value and seeing the light still red is the exact
  // confusion this avoids: the screen must say the typed value is not live.
  it('says the typed values are not saved yet', () => {
    show({ syncConfig: saved });
    expect(screen.queryByTestId('unsaved')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/api key/i), { target: { value: 'new-key' } });
    expect(screen.getByTestId('unsaved')).toHaveTextContent(/chưa lưu/i);
  });

  it('stops saying it once the values are saved', () => {
    const props = show({ syncConfig: saved });
    fireEvent.change(screen.getByLabelText(/api key/i), { target: { value: 'new-key' } });
    fireEvent.click(screen.getByRole('button', { name: /lưu và kiểm tra/i }));
    expect(props.onSyncConfig).toHaveBeenCalledWith({ ...saved, apiKey: 'new-key' });
  });
});

describe('SettingsPage, version', () => {
  it('says which version is installed, the one in package.json', () => {
    const { version } = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8')) as { version: string };
    show();
    expect(screen.getByText(`Judexp phiên bản ${version}`)).toBeInTheDocument();
  });
});
