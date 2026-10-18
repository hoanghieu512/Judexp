import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// One version for the whole app: package.json. Android's versionName and versionCode are read
// from the same file (android/app/build.gradle), the web side gets it here.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };

// "Today" and "yesterday" are calendar days on the phone, so tests that check
// them need a fixed zone. Workers inherit this, whatever zone the machine has.
process.env.TZ = 'Asia/Ho_Chi_Minh';

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
