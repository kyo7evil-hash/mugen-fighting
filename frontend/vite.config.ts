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
  // In dev the client talks to the backend directly on :8000 (see config.ts);
  // no proxy here — a `ws: true` proxy entry breaks Vite's own HMR socket.
  server: { port: 5173 },
  clearScreen: false,
});
