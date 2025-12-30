import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-pdf/dist/esm': 'react-pdf/dist',
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: [
      'react-pdf/dist/Page/AnnotationLayer.css',
      'react-pdf/dist/Page/TextLayer.css',
    ],
  },
  server: {
    hmr: {
      overlay: false,
    },
    // No proxy needed as API_BASE_URL in src/utils/api.ts points directly to the PHP backend.
    // Removing proxies to ensure Vite's dev server correctly handles SPA routing on refresh.
  },
  // Configure build to properly handle SPA routing
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
