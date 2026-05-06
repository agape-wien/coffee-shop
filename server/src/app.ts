import express, { type Express } from 'express'
import path from 'node:path'

// Async factory so Vite middleware (dev) can be awaited before the server starts.
export async function createApp(): Promise<Express> {
  const app = express()
  app.use(express.json())

  app.get('/api/v1/health', (_req, res) => {
    res.json({ ok: true })
  })

  const clientRoot = path.resolve(import.meta.dirname, '../../client')

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(clientRoot, 'dist')
    app.use(express.static(distPath))
    // SPA fallback — all non-API paths return index.html for React Router
    app.get('/*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  } else {
    const { createServer: createViteServer } = await import('vite')
    const vite = await createViteServer({
      root: clientRoot,
      server: { middlewareMode: true },
      appType: 'spa',
    })
    // Must come after API routes so /api/v1/* is handled by Express first
    app.use(vite.middlewares)
  }

  return app
}
