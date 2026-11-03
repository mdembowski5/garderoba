import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Wstawia unikalny identyfikator builda do public/sw.js (placeholder __BUILD_ID__),
 * dzięki czemu przeglądarka wykrywa nową wersję Service Workera po każdym wdrożeniu
 * i odświeża cache aplikacji.
 */
function serviceWorkerVersion(): Plugin {
  let outDir = 'dist';
  return {
    name: 'sw-build-id',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const file = path.join(outDir, 'sw.js');
      if (!fs.existsSync(file)) return;
      const buildId = Date.now().toString(36);
      fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/__BUILD_ID__/g, buildId));
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [react(), serviceWorkerVersion()],
  build: {
    target: 'es2020', // iOS Safari 14+
    sourcemap: false,
  },
});
