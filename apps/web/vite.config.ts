import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => ({
  base: loadEnv(mode, '.', '').VITE_BASE_PATH ?? '/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
  },
}));
