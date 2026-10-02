import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // In development the Express API runs on port 3000; the browser
    // calls /api on the same address, so no cross-origin setup is needed.
    proxy: { '/api': 'http://localhost:3000' },
  },
});
