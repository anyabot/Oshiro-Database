import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served on the custom domain https://oshiro.altterisk.cc/ (see public/CNAME)
export default defineConfig({
  plugins: [react()],
  base: '/',
});
