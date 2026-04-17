import { defineConfig } from 'vite';
import path from 'path';

const target = process.env.INTERNAL_SERVER_URL || 'http://127.0.0.1:3001';

const createProxyEntry = () => ({
  target,
  changeOrigin: true
});

export default defineConfig({
  root: '.',
  preview: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    proxy: {
      '/start': createProxyEntry(),
      '/end': createProxyEntry(),
      '/leaderboard': createProxyEntry(),
      '/health': createProxyEntry(),
    },
  },
  server: {
    proxy: {
      '/start': createProxyEntry(),
      '/end': createProxyEntry(),
      '/leaderboard': createProxyEntry(),
      '/health': createProxyEntry(),
    },
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
      '@shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
    extensions: ['.ts', '.js', '.json'],
  },
});
