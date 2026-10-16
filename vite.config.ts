import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// "Today" and "yesterday" are calendar days on the phone, so tests that check
// them need a fixed zone. Workers inherit this, whatever zone the machine has.
process.env.TZ = 'Asia/Ho_Chi_Minh';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
