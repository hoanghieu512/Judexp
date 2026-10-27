import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Runs the real AppShell in a browser with the native plugins faked (mocks.ts), for screenshots.
// Lives inside the repo, so node_modules and src resolve from the repo root.
const repo = path.resolve(import.meta.dirname, '../../../../..');

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify('harness') },
  resolve: { alias: { '@app': path.join(repo, 'src') } },
  server: { port: 5199, strictPort: true, fs: { allow: [repo] } },
});
