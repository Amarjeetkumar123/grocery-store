import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const fakeSupabase = '/tmp/claude-1000/-home-amarjeet-Desktop-Projects-grocery-store/29c1dfe5-fcef-426e-8274-499eac56e873/scratchpad/fake-supabase.js';
export default defineConfig({
  root: '/home/amarjeet/Desktop/Projects/grocery-store/frontend',
  plugins: [react(), { name: 'fake-login', enforce: 'pre', resolveId(source) { return source.endsWith('/supabaseClient.js') || source === './supabaseClient.js' ? fakeSupabase : null; } }],
  server: { port: 5199, strictPort: true, fs: { allow: ['/'] }, proxy: { '/api': 'http://localhost:5298' } },
});
