import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],

  base: '/metorial-ares',

  resolve: {
    dedupe: ['react', 'react-dom']
  },

  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to the backend server
      '/subspace-public/internal-api': {
        target: 'http://localhost:52071',
        changeOrigin: true
      },
      // Proxy static assets served by backend
      '/favicon.ico': { target: 'http://localhost:52071', changeOrigin: true },
      '/favicon.svg': { target: 'http://localhost:52071', changeOrigin: true },
      '/favicon-96x96.png': { target: 'http://localhost:52071', changeOrigin: true },
      '/apple-touch-icon.png': { target: 'http://localhost:52071', changeOrigin: true },
      '/site.webmanifest': { target: 'http://localhost:52071', changeOrigin: true }
    }
  },

  build: {
    outDir: 'dist'
  }
});
