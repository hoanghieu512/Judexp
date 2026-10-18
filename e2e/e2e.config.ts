import type { E2EConfig } from 'e2e';
import { mobile } from '@e2e-dev/mobile';
import { openrouter } from '@openrouter/ai-sdk-provider';
import { DEFAULT_MODEL } from './lib/preflight.ts';

// Device by NAME (adb model), model by OpenRouter id: both overridable per run.
const DEVICE = process.env.E2E_DEVICE ?? 'UBS1';
const MODEL = process.env.E2E_MODEL ?? DEFAULT_MODEL;

// Every step of the smoke tests goes through exact labels; the agent is only a fallback. Should
// it ever act, it acts on the QA kho, where a rating is written for good and synced to Atomman.
const RULES = `This app writes every rating to a shared folder, for good.
Never tap "Chấm tốt", "Chấm ổn", "Chấm xấu", "Lưu", or any button starting with "Chấm" or "Không đi", unless the goal names it.
Never open or change anything in "Cài đặt".
Only type licence plates starting with 00E.
If the goal seems to need a forbidden action, report that instead of doing it.`;

export default {
  targets: [
    {
      name: 'android',
      engine: mobile({ platform: 'android', device: DEVICE }),
      app: { bundleId: 'com.judexp.app' },
    },
  ],
  agents: {
    default: { model: openrouter(MODEL), maxSteps: 10, maxModelCalls: 10, system: RULES },
  },
  workers: 1,
  retries: 0,
  cache: 'read-write',
  timeout: 300000,
  actionTimeout: 60000,
  assertionTimeout: 15000,
} satisfies E2EConfig;
