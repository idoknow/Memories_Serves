import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        api: resolve(__dirname, 'api.html'),
        operations: resolve(__dirname, 'operations.html'),
        ai: resolve(__dirname, 'ai.html'),
      },
    },
  },
});