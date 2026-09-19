import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base './' makes the build work under any GitHub Pages path (user.github.io/repo-name/)
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});
