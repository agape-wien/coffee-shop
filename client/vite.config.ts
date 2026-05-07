import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // usePolling is required on Windows Docker bind mounts — inotify events from the
    // Windows filesystem never reach the Linux container, so chokidar must poll instead.
    watch: {
      usePolling: true,
      interval: 500,
    },
  },
})
