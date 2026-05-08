import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Single root package.json, but serve React app from /frontend
export default defineConfig({
  root: 'frontend',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend/src'),
    },
  },
  envDir: __dirname, // read .env from project root
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  base: './',
  define: {
    global: 'window',
    'process.env': {},
  },
})

