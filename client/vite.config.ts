import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const shared = fileURLToPath(new URL('../shared/src', import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@mugen\/shared$/, replacement: `${shared}/index.ts` },
      { find: /^@mugen\/shared\/(.*)$/, replacement: `${shared}/$1` },
      { find: /^@shared\/(.*)$/, replacement: `${shared}/$1` },
    ],
  },
  server: { port: 5173 },
  clearScreen: false,
});
