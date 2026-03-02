import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'heatshield-wasm': path.resolve(__dirname, '../heatshield-wasm/pkg'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web', 'heatshield-wasm'],
  },
  server: {
    port: 3000,
  },
  preview: {
    port: 4173,
  },
});
