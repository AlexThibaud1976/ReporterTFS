import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'src/renderer-v2'),
  base: './',
  css: {
    postcss: {
      plugins: [
        tailwindcss(path.resolve(__dirname, 'src/renderer-v2/tailwind.config.js')),
        autoprefixer(),
      ],
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer-v2'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@v2':   path.resolve(__dirname, 'src/renderer-v2'),
      '@store': path.resolve(__dirname, 'src/renderer/store'),
      '@api':  path.resolve(__dirname, 'src/renderer/api'),
    },
  },
  server: { port: 5174 },
})
