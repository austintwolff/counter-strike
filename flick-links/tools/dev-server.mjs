// Local stand-in for the hosted site: serves the game and runs the clubhouse server in memory.
//   node tools/dev-server.mjs [port]
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { handle, MemStore } from '../server/core.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), port = +process.argv[2] || 8787, store = new MemStore();
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://' + req.headers.host);
  if (url.pathname.startsWith('/api/')) {
    const chunks = []; for await (const c of req) chunks.push(c);
    const r = await handle(new Request(url, { method: req.method, headers: req.headers, body: chunks.length ? Buffer.concat(chunks) : undefined }), store);
    res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(await r.text()); return;
  }
  try { const f = url.pathname === '/' ? '/index.html' : url.pathname; if (f.includes('..')) throw 0;
    res.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain', 'cache-control': 'no-store' }); res.end(await readFile(path.join(root, f)));
  } catch (e) { res.writeHead(404); res.end('not found'); }
}).listen(port, () => console.log('Flick Links on http://localhost:' + port));
