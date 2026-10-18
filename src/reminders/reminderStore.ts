/**
 * Pending reminders and tapped answers, kept in the app's own storage.
 *
 * Neither belongs in the kho: a reminder is about this phone ("the phone that
 * looked it up is the one that asks", §9.3), and an answer is only on its way
 * to becoming an event. pending.json is also read by the native boot receiver,
 * and answers are written by the native button receiver, one file per tap.
 */

import { Directory, Encoding, type FilesystemPlugin } from '@capacitor/filesystem';
import type { EntityKind } from '../domain/events';
import type { Reminder } from '../domain/reminders';

export type Answer = 'good' | 'ok' | 'bad' | 'skip';

export interface ReminderAnswer {
  answerId: string;
  reminderId: string;
  kind: EntityKind;
  key: string;
  label: string;
  lookedUpAt: string;
  expiresAt: string;
  answer: Answer;
  answeredAt: string;
}

export interface ReminderStore {
  load(): Promise<Reminder[]>;
  save(list: Reminder[]): Promise<void>;
  /** Oldest answeredAt first. Unreadable or malformed files are skipped. */
  answers(): Promise<ReminderAnswer[]>;
  clearAnswer(answerId: string): Promise<void>;
}

export type ReminderFs = Pick<FilesystemPlugin, 'readFile' | 'writeFile' | 'readdir' | 'deleteFile'>;

const PENDING = 'pending.json';
const ANSWERS = 'reminder-answers';
const VERSION = 1;
const ANSWER_VALUES: Answer[] = ['good', 'ok', 'bad', 'skip'];
const STRING_FIELDS = ['answerId', 'reminderId', 'kind', 'key', 'label', 'lookedUpAt', 'expiresAt', 'answeredAt'] as const;

function isAnswer(value: unknown): value is ReminderAnswer {
  if (typeof value !== 'object' || value === null) return false;
  const a = value as Record<string, unknown>;
  if (!STRING_FIELDS.every((f) => typeof a[f] === 'string')) return false;
  if (!ANSWER_VALUES.includes(a.answer as Answer)) return false;
  return !Number.isNaN(Date.parse(a.answeredAt as string));
}

export function fileReminderStore(fs: ReminderFs): ReminderStore {
  const at = { directory: Directory.Data } as const;
  const text = { ...at, encoding: Encoding.UTF8 } as const;

  async function readText(path: string): Promise<string | null> {
    try {
      const { data } = await fs.readFile({ path, ...text });
      return typeof data === 'string' ? data : null;
    } catch {
      return null;
    }
  }

  return {
    async load() {
      const raw = await readText(PENDING);
      if (raw === null) return [];
      try {
        const parsed = JSON.parse(raw) as { version?: number; reminders?: Reminder[] };
        // Losing this file loses reminders, never events, so anything odd is "none".
        return parsed.version === VERSION && Array.isArray(parsed.reminders) ? parsed.reminders : [];
      } catch {
        return [];
      }
    },

    async save(list) {
      await fs.writeFile({ path: PENDING, data: JSON.stringify({ version: VERSION, reminders: list }), ...text });
    },

    async answers() {
      let names: string[];
      try {
        names = (await fs.readdir({ path: ANSWERS, ...at })).files.map((f) => f.name);
      } catch {
        return [];
      }
      const found: ReminderAnswer[] = [];
      // Only finished files: the native side writes `<id>.json.tmp` and renames.
      for (const name of names.filter((n) => n.endsWith('.json'))) {
        const raw = await readText(`${ANSWERS}/${name}`);
        if (raw === null) continue;
        try {
          const value: unknown = JSON.parse(raw);
          if (isAnswer(value)) found.push(value);
        } catch {
          // A file that is not JSON is skipped, like a broken event file.
        }
      }
      return found.sort((a, b) => Date.parse(a.answeredAt) - Date.parse(b.answeredAt));
    },

    async clearAnswer(answerId) {
      await fs.deleteFile({ path: `${ANSWERS}/${answerId}.json`, ...at });
    },
  };
}
