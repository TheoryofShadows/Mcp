import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Pin output to syntax older iOS Safari / Android browsers can parse.
    // Without this the production bundle could ship JS a visitor's browser
    // can't read, white-screening the whole app on their device.
    target: ['es2019', 'safari13', 'chrome87', 'firefox78', 'edge88'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    pool: 'forks',
    isolate: true,
  },
})
