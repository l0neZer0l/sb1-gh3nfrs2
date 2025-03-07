import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port:3000,
    proxy: {
      '/auth': 'https://sb1-gh3nfrs2-d99r4k29u-l0nezer0ls-projects.vercel.app',
      '/api': 'https://sb1-gh3nfrs2-d99r4k29u-l0nezer0ls-projects.vercel.app'
    }
  }
});