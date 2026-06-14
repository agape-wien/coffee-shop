import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // Tests share a running server instance and a real DB — run sequentially so
  // socket events from one test don't bleed into assertions in another.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 20_000,
  use: {
    // Assumes `docker compose up -d` is already running.
    baseURL: 'http://localhost:3001',
    // Landscape tablet viewport — closest to real usage.
    viewport: { width: 1024, height: 768 },
    actionTimeout: 8_000,
  },
})
