import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    watch: {
      usePolling: true,
      interval: 100,
    },
    hmr: {
      overlay: true,
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
    },
    extensions: ['.ts', '.js'],
  },
});
