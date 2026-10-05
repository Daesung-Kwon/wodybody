import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: '/',
  envPrefix: ['VITE_', 'REACT_APP_'],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@burnfat': path.resolve(__dirname, '../burnfat/src'),
      'html-to-image': path.resolve(__dirname, './node_modules/html-to-image'),
      recharts: path.resolve(__dirname, './node_modules/recharts'),
      '@supabase/supabase-js': path.resolve(__dirname, './node_modules/@supabase/supabase-js'),
    },
    dedupe: ['react', 'react-dom', '@mui/material', '@emotion/react', '@emotion/styled'],
  },
  server: {
    port: 3000,
    fs: { allow: [path.resolve(__dirname, '..')] },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
