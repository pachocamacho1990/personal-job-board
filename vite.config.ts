import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/jobboard/',
  server: {
    port: 5173,
    proxy: {
      '/jobboard/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/jobboard\/api/, '/api'),
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        jobs: resolve(__dirname, 'jobs.html'),
        business: resolve(__dirname, 'business.html'),
        docs: resolve(__dirname, 'docs.html'),
      },
    },
  },
});
