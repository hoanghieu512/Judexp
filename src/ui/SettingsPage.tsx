import { useState } from 'react';
import type { SyncState } from '../sync/status';
import type { KhoChoice } from '../profile/settings';
import type { SyncConfig } from '../sync/status';
import './ui.css';

const LIGHT: Record<SyncState, string> = {
  synced: 'Đã đẩy hết sang Atomman',
  pending: 'Đang đẩy sang Atomman',
  'atomman-offline': 'Chưa thấy Atomman',
  'no-syncthing': 'Không đọc được Syncthing trên máy này',
  unconfigured: 'Chưa cấu hình Syncthing',
};

const LIGHT_COLOR: Record<SyncState, string> = {
  synced: 'good',
  pending: 'ok',
  'atomman-offline': 'bad',
  'no-syncthing': 'bad',
  unconfigured: 'grey',
};

const LIGHT_MARK: Record<SyncState, string> = {
  synced: '\u2714',
  pending: '\u2013',
  'atomman-offline': '\u2715',
  'no-syncthing': '\u2715',
  unconfigured: '?',
};

export default function SettingsPage({
  kho,
  status,
  deviceId,
  skipped,
  workerLog,
  syncConfig,
  onPickKho,
  onRebuild,
  onDeviceId,
  onSyncConfig,
}: {
  kho: KhoChoice | null;
  status: SyncState;
  deviceId: string;
  skipped: string[];
  workerLog: string;
  syncConfig: SyncConfig;
  onPickKho: () => void;
  onSyncConfig: (cfg: SyncConfig) => void;
  onRebuild: () => void;
  onDeviceId: (name: string) => void;
}) {
  const [confirmingRebuild, setConfirmingRebuild] = useState(false);

  return (
    <div className="jx-screen">
      <h2 className="jx-section-title">Kho</h2>
      <div className="jx-row">
        <span className="jx-name" data-testid="kho-label">
          {kho ? kho.label : 'Chưa chọn kho'}
        </span>
      </div>
      <button type="button" className="jx-row" onClick={onPickKho}>
        Chọn folder kho
      </button>

      <h2 className="jx-section-title">Đồng bộ</h2>
      <div className="jx-row" data-testid="sync-light" data-status={status}>
        <span className="jx-mark" data-color={LIGHT_COLOR[status]}>
          {LIGHT_MARK[status]}
        </span>
        <span className="jx-name">{LIGHT[status]}</span>
      </div>

      {skipped.length > 0 && (
        <p className="jx-sub" data-testid="skipped">
          {skipped.length} file event đọc không được, đã bỏ qua: {skipped.join(', ')}
        </p>
      )}

      <label className="jx-sub" htmlFor="jx-st-url">
        Địa chỉ Syncthing trên máy này
      </label>
      <input
        id="jx-st-url"
        className="jx-search"
        defaultValue={syncConfig.baseUrl}
        onBlur={(e) => onSyncConfig({ ...syncConfig, baseUrl: e.target.value.trim() })}
      />

      <label className="jx-sub" htmlFor="jx-st-key">
        API key Syncthing của MÁY NÀY
      </label>
      <input
        id="jx-st-key"
        className="jx-search"
        defaultValue={syncConfig.apiKey}
        onBlur={(e) => onSyncConfig({ ...syncConfig, apiKey: e.target.value.trim() })}
      />

      <label className="jx-sub" htmlFor="jx-st-atomman">
        Device ID của Atomman
      </label>
      <input
        id="jx-st-atomman"
        className="jx-search"
        defaultValue={syncConfig.atommanDeviceId}
        onBlur={(e) => onSyncConfig({ ...syncConfig, atommanDeviceId: e.target.value.trim() })}
      />

      <label className="jx-sub" htmlFor="jx-st-folder">
        Folder ID của kho
      </label>
      <input
        id="jx-st-folder"
        className="jx-search"
        defaultValue={syncConfig.folderId}
        onBlur={(e) => onSyncConfig({ ...syncConfig, folderId: e.target.value.trim() })}
      />

      <h2 className="jx-section-title">Máy này</h2>
      <label className="jx-sub" htmlFor="jx-device">
        Tên máy, dùng trong tên file event
      </label>
      <input
        id="jx-device"
        className="jx-search"
        defaultValue={deviceId}
        onBlur={(e) => onDeviceId(e.target.value)}
      />

      <h2 className="jx-section-title">Index</h2>
      {confirmingRebuild ? (
        <div className="jx-prompt">
          <p className="jx-sub">Dựng lại index đọc toàn bộ kho, có thể mất một lúc. Dữ liệu không mất gì.</p>
          <div className="jx-prompt-actions">
            <button
              type="button"
              className="jx-row"
              onClick={() => {
                setConfirmingRebuild(false);
                onRebuild();
              }}
            >
              Chắc chắn
            </button>
            <button type="button" className="jx-row" onClick={() => setConfirmingRebuild(false)}>
              Thôi
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="jx-row" onClick={() => setConfirmingRebuild(true)}>
          Dựng lại index
        </button>
      )}

      <h2 className="jx-section-title">Log worker</h2>
      <pre className="jx-sub" data-testid="worker-log">
        {workerLog === '' ? 'Chưa có log, worker chưa chạy.' : workerLog}
      </pre>
    </div>
  );
}
