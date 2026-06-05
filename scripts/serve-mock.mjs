#!/usr/bin/env node
// Servidor estático do mock para a ingestão consumir em validação manual.
// Serve ./worldcup.mock.json (gerado por scripts/gen-mock.mjs) numa porta
// própria — fora do Next, então não passa pelo proxy.ts/autenticação.
// Lê o arquivo a cada requisição (no-store), então basta regenerar o snapshot e
// rodar o sync de novo, sem reiniciar nada.
//
//   node scripts/serve-mock.mjs            -> http://localhost:5555/worldcup.mock.json
//
// Depois aponte a ingestão para ele no .env.local:
//   OPENFOOTBALL_URL=http://localhost:5555/worldcup.mock.json

import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'

const PORT = Number(process.env.MOCK_PORT ?? 5555)
const FILE = new URL('../worldcup.mock.json', import.meta.url)

createServer((_req, res) => {
  try {
    const body = readFileSync(FILE)
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(body)
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: `mock indisponível: ${e.message}. Rode: node scripts/gen-mock.mjs <nivel>` }))
  }
}).listen(PORT, () => {
  console.log(`mock servido em http://localhost:${PORT}/worldcup.mock.json (Ctrl+C para parar)`)
})
