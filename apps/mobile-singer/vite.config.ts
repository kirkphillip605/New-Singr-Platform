import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwind()],
  server: {
    port: 3012
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
