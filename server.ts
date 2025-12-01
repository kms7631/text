// Next.js 커스텀 서버 (Socket.IO 포함)
import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { initializeSocketIO } from './lib/websocket'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url || '', true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('에러 발생:', err)
      res.statusCode = 500
      res.end('내부 서버 오류')
    }
  })

  // Socket.IO 초기화
  initializeSocketIO(httpServer)

  httpServer
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> 준비 완료: http://${hostname}:${port}`)
    })
})

