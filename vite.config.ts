import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/runway-fintech/',
  plugins: [react()],
  server: { host: true },
});
