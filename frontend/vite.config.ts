import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'], // Exclude lucide-react from optimization
  },
  server: {
    port: 3000, // Frontend server port
    proxy: {
      // Proxy /auth and /api requests to your backend
      '/auth': {
        target: 'http://localhost:5000',
        changeOrigin: true, // Required for CORS
        secure: false, // Disable SSL verification (optional, for local development)
      },
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true, // Required for CORS
        secure: false, // Disable SSL verification (optional, for local development)
      },
    },
  },
});