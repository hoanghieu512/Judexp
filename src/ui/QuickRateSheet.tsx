import { useState } from 'react';
import { newEncounter, type EntityKind, type Geo, type JudexpEvent, type Verdict } from '../domain/events';
import { dishKey, normalizeName, normalizePlate, restaurantKey } from '../domain/keys';
import { tagsFor } from '../domain/tags';
import './ui.css';

const VERDICTS: { value: Verdict; label: string; mark: string }[] = [
  { value: 'good', label: 'Tốt', mark: '✔' },
  { value: 'ok', label: 'Ổn', mark: '–' },
  { value: 'bad', label: 'Xấu', mark: '✕' },
];

const FIELD_LABEL: Record<EntityKind, string> = {
  driver: 'Biển số',
  restaurant: 'Tên quán',
  dish: 'Tên món',
  place: 'Tên địa điểm',
};

function keyFor(kind: EntityKind, raw: string): string {
  if (kind === 'driver') return normalizePlate(raw);
  if (kind === 'restaurant') return restaurantKey(raw);
  if (kind === 'dish') return dishKey('', raw);
  return normalizeName(raw);
}

/**
 * Rating and identifying are two separate jobs. This sheet does the rating:
 * one tap on a verdict is already a saved event, and anything else on the
 * screen is optional.
 */
export default function QuickRateSheet({
  kind,
  author,
  device,
  onSave,
  getPosition,
}: {
  kind: EntityKind;
  author: string;
  device: string;
  onSave: (event: JudexpEvent) => void;
  getPosition?: () => Promise<Geo>;
}) {
  const [raw, setRaw] = useState('');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [ownTag, setOwnTag] = useState('');
  const [note, setNote] = useState('');
  const [geo, setGeo] = useState<Geo | null>(null);

  const vocabulary = tagsFor(kind);
  const key = keyFor(kind, raw);
  const canSave = verdict !== null && key !== '';

  function toggle(tag: string) {
    setTags((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]));
  }

  function addOwnTag() {
    const tag = ownTag.trim();
    if (tag === '') return;
    if (!tags.includes(tag)) setTags([...tags, tag]);
    setOwnTag('');
  }

  function save() {
    if (!canSave) return;
    onSave(
      newEncounter({
        author,
        device,
        entityRef: { kind, key, label: raw.trim() },
        verdict,
        tags,
        note: note.trim() === '' ? undefined : note.trim(),
        context: geo ? { geo } : undefined,
        source: { kind: 'manual' },
      }),
    );
  }

  return (
    <div className="jx-screen">
      <label className="jx-sub" htmlFor="jx-entity">
        {FIELD_LABEL[kind]}
      </label>
      <input
        id="jx-entity"
        className={kind === 'driver' ? 'jx-search jx-plate' : 'jx-search'}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
      />

      {kind === 'place' && getPosition && (
        <div>
          <button
            type="button"
            className="jx-row"
            onClick={async () => setGeo(await getPosition())}
          >
            Lấy toạ độ hiện tại
          </button>
          {geo && <p className="jx-sub">Đã lấy toạ độ, sai số {Math.round(geo.accuracy ?? 0)}m</p>}
        </div>
      )}

      <div className="jx-verdicts">
        {VERDICTS.map((v) => (
          <button
            key={v.value}
            type="button"
            className="jx-verdict"
            data-color={v.value}
            data-selected={verdict === v.value}
            onClick={() => setVerdict(v.value)}
          >
            <span aria-hidden="true">{v.mark}</span>
            {v.label}
          </button>
        ))}
      </div>

      <div className="jx-tags">
        {[...vocabulary.good, ...vocabulary.bad].map((tag) => (
          <button
            key={tag}
            type="button"
            className="jx-tag"
            data-selected={tags.includes(tag)}
            onClick={() => toggle(tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      <label className="jx-sub" htmlFor="jx-own-tag">
        Tag riêng
      </label>
      <div className="jx-row">
        <input id="jx-own-tag" className="jx-search" value={ownTag} onChange={(e) => setOwnTag(e.target.value)} />
        <button type="button" className="jx-tag" onClick={addOwnTag}>
          Thêm tag
        </button>
      </div>

      <label className="jx-sub" htmlFor="jx-note">
        Ghi chú
      </label>
      <input id="jx-note" className="jx-search" value={note} onChange={(e) => setNote(e.target.value)} />

      <button type="button" className="jx-row" disabled={!canSave} onClick={save}>
        Lưu
      </button>
    </div>
  );
}
