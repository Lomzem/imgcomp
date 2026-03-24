import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/imgcomp/',
  plugins: [tailwindcss()],
  build: {
    target: 'es2022',
  },
});
