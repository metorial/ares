import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],

  base: '/metorial-admin',

  resolve: {
    dedupe: ['react', 'react-dom']
  },

  server: {
    port: 5174,
    proxy: {
      '/metorial-admin/api': {
        target: 'http://localhost:52121',
        changeOrigin: true
      }
    }
  },

  build: {
    outDir: 'dist'
  }
});
