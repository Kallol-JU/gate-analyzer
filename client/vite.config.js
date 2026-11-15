import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Tailwind v4 runs as a Vite plugin. There is no tailwind.config.js or postcss.config.js;
// design tokens live in src/styles/index.css inside an @theme block.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // In development the browser talks to Vite, and Vite forwards /api to Express.
      // This avoids CORS entirely while developing.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
