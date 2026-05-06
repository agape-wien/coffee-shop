import { createServer } from 'node:http'
import app from './app.js'
import { initSocket } from './socket/index.js'

const PORT = Number(process.env.PORT ?? 3001)

const httpServer = createServer(app)
initSocket(httpServer)

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
