
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  const rootDir = import.meta.dirname;

  return {
    plugins: [
      react(),
      tailwindcss(),

      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }

          const distDir = path.resolve(rootDir, 'dist');
          const frontendAssets = path.resolve(rootDir, 'frontend/assets');
          const distAssets = path.resolve(distDir, 'frontend/assets');

          if (fs.existsSync(distDir) && fs.existsSync(frontendAssets)) {
            fs.cpSync(frontendAssets, distAssets, {
              recursive: true,
              force: true,
            });
          }
        },
      },
    ],

    resolve: {
      alias: {
        '@': path.resolve(rootDir, '.'),
      },
    },

    server: {
      host: 'localhost',
      port: 5173,
      strictPort: true,

      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/uploads': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/src/assets': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },

      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});