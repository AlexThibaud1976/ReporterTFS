import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'src/renderer'),
  base: './',
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@components': path.resolve(__dirname, 'src/renderer/components'),
      '@pages': path.resolve(__dirname, 'src/renderer/pages'),
      '@store': path.resolve(__dirname, 'src/renderer/store'),
      '@api': path.resolve(__dirname, 'src/renderer/api'),
      '@theme': path.resolve(__dirname, 'src/renderer/theme'),
    },
  },
  server: {
    port: 5173,
  },
})
