import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'static',
  base: '/imgcomp/',
  vite: {
    plugins: [tailwindcss()],
    build: {
      target: 'es2022',
    },
  },
});
