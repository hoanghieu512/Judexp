import { useState } from 'react';
import type { SyncState } from '../sync/status';
import type { KhoChoice } from '../profile/settings';
import './ui.css';

const LIGHT: Record<SyncState, string> = {
  synced: 'Đã đẩy hết sang Atomman',
  pending: 'Đang đẩy sang Atomman',
  unreachable: 'Chưa thấy Atomman',
};

export default function SettingsPage({
  kho,
  status,
  deviceId,
  skipped,
  workerLog,
  onPickKho,
  onRebuild,
  onDeviceId,
}: {
  kho: KhoChoice | null;
  status: SyncState;
  deviceId: string;
  skipped: string[];
  workerLog: string;
  onPickKho: () => void;
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
        <span className="jx-mark" data-color={status === 'synced' ? 'good' : status === 'pending' ? 'ok' : 'bad'}>
          {status === 'synced' ? '✔' : status === 'pending' ? '–' : '✕'}
        </span>
        <span className="jx-name">{LIGHT[status]}</span>
      </div>

      {skipped.length > 0 && (
        <p className="jx-sub" data-testid="skipped">
          {skipped.length} file event đọc không được, đã bỏ qua: {skipped.join(', ')}
        </p>
      )}

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
