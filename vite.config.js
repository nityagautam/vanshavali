import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

const FAMILY_JSON = path.resolve(import.meta.dirname, 'src/data/family.json')

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'family-api',
      configureServer(server) {
        // POST /api/family  →  write updated family.json to disk
        server.middlewares.use('/api/family', (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            return res.end('Method not allowed')
          }
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            try {
              const data = JSON.parse(body)
              fs.writeFileSync(FAMILY_JSON, JSON.stringify(data, null, 2), 'utf-8')
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
            } catch (e) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: false, error: e.message }))
            }
          })
        })
      }
    }
  ],
  base: './',
})
