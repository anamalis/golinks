/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The SPA is served from `/` and `/_/*`; built assets live under `/_/assets` so they can
// never collide with a Go Link Name. In dev, API calls are proxied to FastAPI.
// Ports come from the Makefile (BACKEND_PORT / FRONTEND_PORT); the fallbacks match its
// defaults so a bare `npm run dev` still works.
const backendPort = process.env.BACKEND_PORT ?? '8000'
const frontendPort = Number(process.env.FRONTEND_PORT ?? '5173')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    assetsDir: '_/assets',
  },
  server: {
    port: frontendPort,
    strictPort: true,
    proxy: {
      '/_/api': `http://localhost:${backendPort}`,
    },
  },
  test: {
    // happy-dom, not jsdom: jsdom has no <dialog>.showModal().
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
