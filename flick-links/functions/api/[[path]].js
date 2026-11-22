// Cloudflare Pages Function: every request under /api goes to the clubhouse server, backed by a D1 database bound as DB.
import { handle, D1Store } from '../../server/core.js';
let ready;
export async function onRequest({ request, env }) {
  if (!env.DB) return new Response(JSON.stringify({ ok: false, error: 'no_database' }), { status: 503, headers: { 'content-type': 'application/json' } });
  const store = new D1Store(env.DB);
  ready = ready || store.init();
  await ready;
  return handle(request, store);
}
