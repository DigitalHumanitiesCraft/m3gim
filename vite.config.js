import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Root directory for the project
  root: 'docs',

  // Base path for GitHub Pages deployment
  base: '/m3gim/',

  // Build configuration
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'docs/index.html')
      }
    }
  },

  // Development server
  server: {
    port: 3000,
    open: true
  },

  // Resolve aliases
  resolve: {
    alias: {
      '@': resolve(__dirname, 'docs/js'),
      '@css': resolve(__dirname, 'docs/css'),
      '@data': resolve(__dirname, 'data')
    }
  }
});
