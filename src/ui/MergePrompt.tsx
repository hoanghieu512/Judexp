import type { MergeCandidate } from '../domain/merge';

/**
 * The app never merges on its own (D9). This asks, once, and says plainly
 * how sure it is: a match found by name alone could be another branch of
 * the same chain on the other side of town.
 */
export default function MergePrompt({
  candidate,
  onConfirm,
  onDismiss,
}: {
  candidate: MergeCandidate;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const label = candidate.entity.labels[candidate.entity.labels.length - 1] ?? candidate.entity.key;

  return (
    <div className="jx-prompt" data-testid="merge-prompt">
      <p className="jx-name">Có phải cùng một quán không: {label}?</p>
      <p className="jx-sub">
        {candidate.basis === 'nearby'
          ? 'Tên gần giống và cách đây dưới 150m.'
          : 'Tên gần giống, nhưng chưa biết có cùng chỗ hay không vì thiếu toạ độ đủ chính xác.'}
      </p>
      <div className="jx-prompt-actions">
        <button type="button" className="jx-row" onClick={onConfirm}>
          Đúng, gộp lại
        </button>
        <button type="button" className="jx-row" onClick={onDismiss}>
          Không phải
        </button>
      </div>
    </div>
  );
}
